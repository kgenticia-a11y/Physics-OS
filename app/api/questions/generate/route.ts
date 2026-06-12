import { generateWithRetry } from "@/lib/ai/generate-with-retry";
import { getTopicBySlug } from "@/lib/physics/topics";

export async function POST(request: Request) {
  const { topic, difficulty, mode } = await request.json();

  const topicData = getTopicBySlug(topic);
  if (!topicData) {
    return Response.json({ error: "Invalid topic" }, { status: 400 });
  }

  const questionMode = mode === "intuition" ? "intuition" : "solve";

  const prompt =
    questionMode === "intuition"
      ? buildIntuitionPrompt(topicData.name, topicData.description, topicData.subtopics, difficulty)
      : buildSolvePrompt(topicData.name, topicData.description, topicData.subtopics, difficulty);

  // Advanced problems require significantly more tokens for multi-step solutions
  const tokenBudget = difficulty === "advanced" ? 8192 : difficulty === "intermediate" ? 4096 : 2560;

  const questionSchema = buildQuestionSchema(questionMode);

  try {
    const text = await generateWithRetry({
      prompt,
      maxOutputTokens: tokenBudget,
      responseMimeType: "application/json",
      responseSchema: questionSchema,
      thinkingBudget: 0, // Disable thinking — burns tokens before producing JSON
    });

    const parsed = parseQuestionJSON(text);
    if (!parsed) {
      console.error("Question generation: JSON parse failed for difficulty", difficulty, "length:", text.length, "Tail:", text.slice(-500));
      return Response.json(
        { error: "Generated an invalid response. Please try again." },
        { status: 502 }
      );
    }

    return Response.json({
      id: crypto.randomUUID(),
      topic,
      difficulty,
      mode: questionMode,
      question_text: parsed.question_text,
      hints: parsed.hints,
      correct_answer: parsed.correct_answer,
      full_solution: parsed.full_solution,
      explanation: parsed.explanation,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    // generateWithRetry already formats a user-friendly message for rate limits
    if (msg.includes("temporarily unavailable") || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("503") || msg.includes("UNAVAILABLE")) {
      return Response.json({ error: msg.includes("temporarily unavailable") ? msg : "AI service temporarily unavailable. Please try again in a moment." }, { status: 503 });
    }
    console.error("Question generation error:", msg);
    return Response.json({ error: "Failed to generate question. Please try again." }, { status: 500 });
  }
}

// Robust JSON parser that handles common Gemini quirks:
// - Markdown code fences
// - "Thinking mode" prose before JSON
// - Truncated output
// - Invalid LaTeX backslash escapes (\mu instead of \\mu)
// - Literal control characters inside string values
function parseQuestionJSON(raw: string): {
  question_text: string;
  correct_answer: string;
  hints: string[];
  full_solution: { step: number; description: string; math?: string }[];
  explanation?: string;
} | null {
  let text = raw.trim();
  // Strip markdown code fences if present
  text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");

  // Find first { (skip any "thinking mode" prose)
  const firstBrace = text.indexOf("{");
  if (firstBrace === -1) return null;
  const lastBrace = text.lastIndexOf("}");
  if (lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  } else {
    text = text.slice(firstBrace);
  }

  // Try parse pipeline: each step builds on the previous
  const attempts: Array<{ name: string; transform: (s: string) => string }> = [
    { name: "raw", transform: (s) => s },
    { name: "fixEscapes", transform: (s) => fixStringContents(s) },
    { name: "repair+fix", transform: (s) => fixStringContents(repairTruncatedJSON(s) ?? s) },
  ];

  for (const a of attempts) {
    try {
      const candidate = a.transform(text);
      return JSON.parse(candidate);
    } catch (e) {
      console.error(`Parse strategy ${a.name} failed:`, e instanceof Error ? e.message : String(e));
    }
  }
  return null;
}

// Single-pass string scanner that fixes both invalid escapes and literal control chars
// inside JSON string values. Outside strings, content is untouched.
function fixStringContents(text: string): string {
  let result = "";
  let inString = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '"' && !isEscapedQuote(text, i)) {
      inString = !inString;
      result += ch;
      i++;
      continue;
    }

    if (inString) {
      // Literal control characters must be escaped inside JSON strings
      if (ch === "\n") { result += "\\n"; i++; continue; }
      if (ch === "\r") { result += "\\r"; i++; continue; }
      if (ch === "\t") { result += "\\t"; i++; continue; }
      // eslint-disable-next-line no-control-regex
      if (/[\x00-\x1f]/.test(ch)) { result += "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0"); i++; continue; }

      // Backslash escape handling
      if (ch === "\\" && i + 1 < text.length) {
        const next = text[i + 1];
        if ('"\\/bfnrtu'.includes(next)) {
          result += ch + next;
          i += 2;
          continue;
        }
        // Invalid escape — double the backslash so it becomes a literal
        result += "\\\\";
        i++;
        continue;
      }
    }

    result += ch;
    i++;
  }
  return result;
}

function isEscapedQuote(text: string, i: number): boolean {
  let backslashes = 0;
  let j = i - 1;
  while (j >= 0 && text[j] === "\\") {
    backslashes++;
    j--;
  }
  return backslashes % 2 === 1;
}

function repairTruncatedJSON(text: string): string | null {
  // Track open brackets/braces and strings
  let inString = false;
  let escape = false;
  const stack: string[] = [];
  for (const ch of text) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}") { if (stack[stack.length - 1] === "{") stack.pop(); }
    else if (ch === "]") { if (stack[stack.length - 1] === "[") stack.pop(); }
  }

  let repaired = text;
  // Close string if open
  if (inString) repaired += '"';
  // Remove trailing comma before closing
  repaired = repaired.replace(/,\s*$/, "");
  // Close open structures
  while (stack.length) {
    const open = stack.pop();
    repaired += open === "{" ? "}" : "]";
  }
  return repaired;
}

function buildQuestionSchema(mode: "intuition" | "solve") {
  const solutionStep = {
    type: "object",
    properties: {
      step: { type: "integer" },
      description: { type: "string" },
      math: { type: "string" },
    },
    required: ["step", "description"],
  };

  const baseProps: Record<string, unknown> = {
    question_text: { type: "string" },
    correct_answer: { type: "string" },
    hints: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
    },
    full_solution: {
      type: "array",
      items: solutionStep,
      minItems: 2,
    },
  };

  if (mode === "intuition") {
    baseProps.explanation = { type: "string" };
    return {
      type: "object",
      properties: baseProps,
      required: ["question_text", "correct_answer", "hints", "full_solution", "explanation"],
    };
  }

  return {
    type: "object",
    properties: baseProps,
    required: ["question_text", "correct_answer", "hints", "full_solution"],
  };
}

function buildIntuitionPrompt(name: string, description: string, subtopics: string[], difficulty: string): string {
  return `Generate a ${difficulty}-level CONCEPTUAL/INTUITION question about ${name} (${description}).

Subtopics to draw from: ${subtopics.join(", ")}

This is an INTUITION question — it tests UNDERSTANDING, not computation.
The student should answer with reasoning, not a number.

Examples of good intuition questions:
- "If you drop a heavy ball and a light ball from the same height (ignoring air resistance), which hits the ground first? Explain why."
- "A car is moving at constant velocity. What can you say about the net force acting on it?"
- "Why does a passenger lurch forward when a bus suddenly stops?"
- "If you push two boxes of different masses with the same force, which accelerates more? Why?"
- "What happens to kinetic energy when speed doubles?"

You must respond with ONLY a valid JSON object (no markdown, no code fences):
{
  "question_text": "The conceptual question. Written in clear, accessible language. No LaTeX needed unless referencing a formula.",
  "correct_answer": "A clear 1-3 sentence answer explaining the correct reasoning.",
  "explanation": "A deeper 2-4 sentence explanation connecting the concept to the underlying physics principle. Reference the relevant law or equation and explain WHY it works this way, building intuition.",
  "hints": [
    "Hint 1: A guiding question that makes the student think about the concept...",
    "Hint 2: A more direct nudge toward the right reasoning...",
    "Hint 3: Almost there — points to the key principle..."
  ],
  "full_solution": [
    {"step": 1, "description": "The key physics principle at play"},
    {"step": 2, "description": "How it applies to this specific situation"},
    {"step": 3, "description": "The conclusion and why it makes sense"}
  ]
}

Difficulty guidelines:
- beginner: everyday scenarios, single concept, obvious physics connection
- intermediate: requires connecting two ideas, less obvious scenarios
- advanced: counterintuitive results, edge cases, deeper reasoning required`;
}

function buildSolvePrompt(name: string, description: string, subtopics: string[], difficulty: string): string {
  return `Generate a ${difficulty}-level physics COMPUTATIONAL problem about ${name} (${description}).

Subtopics to draw from: ${subtopics.join(", ")}

This is a SOLVE problem — the student must calculate a numerical answer or derive an expression.

You must respond with ONLY a valid JSON object (no markdown, no code fences):
{
  "question_text": "The problem statement. Use LaTeX with $...$ for inline math and $$...$$ for display math. Include specific numbers and units.",
  "correct_answer": "The numerical or symbolic answer with units",
  "full_solution": [
    {"step": 1, "description": "Identify the knowns and unknowns", "math": "v_0 = 10 m/s, \\\\theta = 30°"},
    {"step": 2, "description": "Apply the relevant equation", "math": "y = v_0 t \\\\sin\\\\theta - \\\\frac{1}{2}gt^2"}
  ],
  "hints": [
    "Hint 1 (Conceptual): What type of motion is this? What principles apply?",
    "Hint 2 (Directional): Think about which equations relate these quantities...",
    "Hint 3 (Formula): You'll need the equation: ...",
    "Hint 4 (Setup): Set up the equation with the known values...",
    "Hint 5 (Almost there): You should now have... simplify to find..."
  ]
}

The hints must progressively guide the student from concept to answer WITHOUT giving the answer directly.

Difficulty guidelines:
- beginner: single-step problems, direct formula application
- intermediate: 2-3 step problems, combining concepts
- advanced: multi-step problems requiring insight or multiple principles`;
}
