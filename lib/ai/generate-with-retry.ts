import { getGeminiClient, ALL_MODELS } from "@/lib/ai/client";
import type { ModelCapabilities } from "@/lib/ai/client";

interface GenerateOptions {
  prompt: string;
  maxOutputTokens?: number;
  responseMimeType?: string;
  systemInstruction?: string;
  // Set to 0 to disable thinking mode (useful for structured JSON output
  // where reasoning tokens crowd out actual content).
  thinkingBudget?: number;
  // OpenAPI schema for strict structured JSON output. Forces valid JSON.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  responseSchema?: any;
}

function isSkippableError(msg: string): boolean {
  return (
    // Rate limits
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("503") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("high demand") ||
    // Unsupported config (e.g. responseSchema / thinkingBudget on 2.0 models)
    msg.includes("INVALID_ARGUMENT") ||
    msg.includes("invalid argument") ||
    msg.includes("not supported") ||
    msg.includes("does not support") ||
    // Network-level transient failures
    msg.includes("abort") ||
    msg.includes("AbortError") ||
    msg.includes("fetch failed")
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Build model config, respecting per-model capability flags.
// 2.0 models don't support thinkingBudget or responseSchema.
function buildConfig(options: GenerateOptions, caps: ModelCapabilities) {
  return {
    maxOutputTokens: options.maxOutputTokens ?? 2048,
    ...(options.responseMimeType ? { responseMimeType: options.responseMimeType } : {}),
    ...(options.systemInstruction ? { systemInstruction: options.systemInstruction } : {}),
    ...(caps.supportsThinking && options.thinkingBudget !== undefined
      ? { thinkingConfig: { thinkingBudget: options.thinkingBudget } }
      : {}),
    ...(caps.supportsSchema && options.responseSchema
      ? { responseSchema: options.responseSchema }
      : {}),
  };
}

/**
 * Generate content with automatic model fallback on rate limits.
 * Tries all models, then waits and retries the cycle once for transient rate limits.
 */
export async function generateWithRetry(options: GenerateOptions): Promise<string> {
  const client = getGeminiClient();

  let lastError: unknown = null;
  const maxFullPasses = 2;
  const retryDelayMs = 1500;

  for (let pass = 0; pass < maxFullPasses; pass++) {
    let anySkippedThisPass = false;

    for (const { id: model, caps } of ALL_MODELS) {
      try {
        // Hard timeout per model: 30s normally, 60s for large token budgets
        const timeoutMs = (options.maxOutputTokens ?? 2048) > 4096 ? 60_000 : 30_000;
        const timeoutId = setTimeout(() => {
          // AbortController signal not directly usable with SDK, but setTimeout
          // ensures we don't block forever — the outer Promise.race handles it
        }, timeoutMs);

        const generatePromise = client.models.generateContent({
          model,
          config: buildConfig(options, caps),
          contents: [{ role: "user", parts: [{ text: options.prompt }] }],
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Model ${model} timed out after ${timeoutMs}ms`)), timeoutMs)
        );

        const response = await Promise.race([generatePromise, timeoutPromise])
          .finally(() => clearTimeout(timeoutId));

        const text = response.text ?? "";
        if (!text) {
          console.error(`Model ${model} returned empty text.`);
          anySkippedThisPass = true;
          continue;
        }
        return text;
      } catch (err: unknown) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        if (isSkippableError(msg)) {
          console.error(`Model ${model} skipped: ${msg.slice(0, 120)}`);
          anySkippedThisPass = true;
          continue;
        }
        // Non-skippable error (programming mistake, auth failure, etc.)
        throw err;
      }
    }

    // All models were skipped this pass — wait before retrying
    if (anySkippedThisPass && pass < maxFullPasses - 1) {
      await sleep(retryDelayMs * (pass + 1));
    }
  }

  // Try to extract retry-after hint from the last 429 message
  const lastMsg = lastError instanceof Error ? lastError.message : String(lastError ?? "");
  const retryMatch = lastMsg.match(/retry[^\d]*(\d+(?:\.\d+)?)\s*s/i);
  const retrySecs = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : null;
  const retryHint = retrySecs ? ` Try again in ~${retrySecs} seconds.` : " Please try again in a moment.";
  throw new Error(`AI service temporarily unavailable.${retryHint}`);
}
