import { getGeminiClient, ALL_MODELS } from "@/lib/ai/client";
import { buildTutorSystemPrompt } from "@/lib/ai/tutor-prompt";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    // Fetch the user's actual physics level from their profile
    let level = "beginner";
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("level")
          .eq("id", user.id)
          .single();
        if (profile?.level) {
          level = profile.level;
        }
      }
    } catch {
      // Fall back to beginner if profile fetch fails
    }

    const client = getGeminiClient();
    const systemPrompt = buildTutorSystemPrompt(level);

    const chatHistory = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1];

    // Try smart model first, fall back to fast
    const modelsToTry = ALL_MODELS;
    let lastError: unknown = null;

    for (const { id: model } of modelsToTry) {
      try {
        const stream = await client.models.generateContentStream({
          model,
          config: {
            systemInstruction: systemPrompt,
            maxOutputTokens: 2048,
          },
          contents: [
            ...chatHistory,
            { role: "user", parts: [{ text: lastMessage.content }] },
          ],
        });

        const encoder = new TextEncoder();

        const readableStream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of stream) {
                const text = chunk.text;
                if (text) {
                  controller.enqueue(encoder.encode(text));
                }
              }
              controller.close();
            } catch (err) {
              controller.error(err);
            }
          },
        });

        return new Response(readableStream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Transfer-Encoding": "chunked",
          },
        });
      } catch (err) {
        lastError = err;
        // If rate limited, try next model
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("INVALID_ARGUMENT") || msg.includes("not supported") || msg.includes("does not support")) {
          continue;
        }
        throw err; // Non-rate-limit error, don't retry
      }
    }

    // All models failed
    const errMsg = lastError instanceof Error ? lastError.message : "Rate limit exceeded";
    return Response.json(
      { error: "AI service temporarily unavailable. Please try again in a minute.", details: errMsg },
      { status: 503 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Chat error:", message);
    return Response.json(
      { error: "Failed to process chat request", details: message },
      { status: 500 }
    );
  }
}
