import { generateWithRetry } from "@/lib/ai/generate-with-retry";

export async function POST(request: Request) {
  const { question_id, user_answer, hints_used, correct_answer, question_text, full_solution, topic, subtopic, difficulty, hints } =
    await request.json();

  const prompt = `You are grading a physics answer. Be encouraging but honest.

Question: ${question_text}
Correct answer: ${correct_answer}
Student's answer: ${user_answer}
Hints used: ${hints_used}/5

Determine if the student's answer is correct. Accept answers that are:
- Numerically equivalent (within 5% tolerance)
- Using different but equivalent units (converted correctly)
- Expressed in different but valid forms

Respond with ONLY a valid JSON object (no markdown, no code fences):
{
  "is_correct": true/false,
  "feedback": "A 1-2 sentence explanation. If correct, celebrate and note what they understood. If wrong, explain the key mistake without giving the full answer — guide them."
}`;

  try {
    const text = await generateWithRetry({
      prompt,
      maxOutputTokens: 512,
      responseMimeType: "application/json",
    });

    const parsed = parseGradeJSON(text);
    if (!parsed) {
      console.error("Grade JSON parse failed, length:", text.length, "tail:", text.slice(-200));
      return Response.json(
        { error: "Failed to parse grading response. Please try again." },
        { status: 502 }
      );
    }
    return Response.json({
      is_correct: parsed.is_correct,
      feedback: parsed.feedback,
      full_solution: full_solution ?? [],
      question_id,
      topic,
      subtopic,
      difficulty,
      hints,
      question_text,
      user_answer,
      hints_used,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("503") || msg.includes("UNAVAILABLE")) {
      return Response.json(
        { error: "AI service temporarily unavailable. Please try again in a minute." },
        { status: 503 }
      );
    }
    console.error("Grading error:", msg);
    return Response.json({ error: "Failed to grade answer" }, { status: 500 });
  }
}

/**
 * Robust JSON parser for grading responses — handles markdown fences,
 * thinking-mode prose before JSON, and common Gemini quirks.
 */
function parseGradeJSON(raw: string): { is_correct: boolean; feedback: string } | null {
  let text = raw.trim();

  // Strip markdown code fences
  text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");

  // Find the JSON object (skip any thinking prose)
  const firstBrace = text.indexOf("{");
  if (firstBrace === -1) return null;
  const lastBrace = text.lastIndexOf("}");
  if (lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  } else {
    text = text.slice(firstBrace);
  }

  // Try raw parse first, then with escape fixes
  const attempts = [
    () => JSON.parse(text),
    () => JSON.parse(text.replace(/[\x00-\x1f]/g, (ch: string) => {
      if (ch === "\n") return "\\n";
      if (ch === "\r") return "\\r";
      if (ch === "\t") return "\\t";
      return "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0");
    })),
  ];

  for (const attempt of attempts) {
    try {
      const result = attempt();
      if (typeof result.is_correct === "boolean" && typeof result.feedback === "string") {
        return result;
      }
    } catch {
      // try next strategy
    }
  }

  return null;
}
