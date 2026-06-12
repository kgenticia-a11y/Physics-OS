import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!,
    });
  }
  return client;
}

export const MODELS = {
  fast: "gemini-2.5-flash-lite",
  smart: "gemini-2.5-flash",
};

export interface ModelCapabilities {
  supportsThinking: boolean;
  supportsSchema: boolean;
}

// All available models in fallback priority order, with feature flags.
// Wide spread across model families gives the best chance of finding one
// that hasn't hit its per-minute or per-day quota limit.
export const ALL_MODELS: Array<{ id: string; caps: ModelCapabilities }> = [
  // 2.5 family — primary, support all features
  { id: "gemini-2.5-flash-lite",   caps: { supportsThinking: true,  supportsSchema: true  } },
  { id: "gemini-2.5-flash",        caps: { supportsThinking: true,  supportsSchema: true  } },
  // 2.0 family — stable fallback
  { id: "gemini-2.0-flash",        caps: { supportsThinking: false, supportsSchema: false } },
  { id: "gemini-2.0-flash-lite",   caps: { supportsThinking: false, supportsSchema: false } },
  // Aliases — always point to latest, may have separate quota buckets
  { id: "gemini-flash-latest",     caps: { supportsThinking: false, supportsSchema: false } },
  { id: "gemini-flash-lite-latest",caps: { supportsThinking: false, supportsSchema: false } },
];
