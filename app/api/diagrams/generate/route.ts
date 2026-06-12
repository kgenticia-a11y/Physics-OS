import { getGeminiClient, ALL_MODELS } from "@/lib/ai/client";

export async function POST(request: Request) {
  const { concept, context } = await request.json();

  if (!concept) {
    return Response.json({ error: "concept is required" }, { status: 400 });
  }

  const client = getGeminiClient();

  const prompt = `You are a physics diagram generator. Create an SVG diagram that illustrates the physics concept described below.

Concept: ${concept}
${context ? `Additional context: ${context}` : ""}

RULES:
1. Return ONLY a valid SVG string — no markdown, no code fences, no explanation.
2. The SVG must have viewBox="0 0 600 400" and use width="100%" height="100%".
3. Use a white background (fill="#ffffff" on the root rect).
4. Use clean, educational diagram style:
   - Black (#1a1a1a) for outlines and text
   - Blue (#3b82f6) for force vectors and arrows
   - Red (#ef4444) for velocity vectors
   - Green (#22c55e) for displacement/position
   - Orange (#f97316) for acceleration vectors
   - Purple (#8b5cf6) for energy or angular quantities
   - Gray (#6b7280) for surfaces, supports, and reference lines
5. Draw proper physics arrows with arrowheads for vectors.
6. Label ALL vectors and quantities with their symbols (F, v, a, mg, N, etc.).
7. Use dashed lines for projections, components, or reference axes.
8. Include a coordinate system (x-y axes) when relevant.
9. For free body diagrams: draw the object as a simple shape (rectangle or circle), then draw ALL forces acting on it as labeled arrows from the object's center or surface.
10. Keep text readable — minimum font-size 14px, use font-family="Arial, sans-serif".
11. Make the diagram clear enough that a student can learn from it without any accompanying text.

DIAGRAM TYPES by concept:
- Free body diagram: Show object + all forces (weight, normal, friction, tension, applied)
- Projectile motion: Show trajectory (parabola), initial velocity components, gravity
- Inclined plane: Show ramp, block, weight components, normal force, friction
- Pulley system: Show pulleys, strings, masses, tension forces
- Collision: Show before/after states with velocity arrows and masses
- Energy: Show energy bar charts or potential energy curves
- Circular motion: Show object, centripetal force/acceleration, velocity tangent
- Momentum: Show objects with momentum arrows, before and after

Generate a clean, accurate, educational SVG diagram now.`;

  // Try both models with retry
  const modelsToTry = ALL_MODELS;
  let lastError: unknown = null;

  for (const { id: model, caps } of modelsToTry) {
    try {
      const response = await client.models.generateContent({
        model,
        config: {
          maxOutputTokens: 8192,
          // Only send thinkingConfig to models that support it — 2.0 models
          // throw INVALID_ARGUMENT if they receive it
          ...(caps.supportsThinking
            ? { thinkingConfig: { thinkingBudget: 0 } }
            : {}),
        },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      let svg = response.text ?? "";

      // Strip markdown code fences if present
      svg = svg.replace(/^```(?:svg|xml|html)?\s*/i, "").replace(/\s*```\s*$/i, "");

      // Extract SVG if wrapped in extra text
      const svgMatch = svg.match(/<svg[\s\S]*<\/svg>/i);
      if (svgMatch) {
        svg = svgMatch[0];
      }

      // Validate it's actually SVG
      if (!svg.includes("<svg") || !svg.includes("</svg>")) {
        console.warn(`Model ${model} returned non-SVG content (${svg.length} chars). Trying next model.`);
        continue; // Try next model
      }

      return Response.json({ svg, concept });
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("INVALID_ARGUMENT") || msg.includes("not supported")) {
        continue; // Try next model
      }
      // Non-rate-limit error
      console.error("Diagram generation error:", msg);
      return Response.json(
        { error: "Diagram generation failed", details: msg },
        { status: 500 }
      );
    }
  }

  const message = lastError instanceof Error ? lastError.message : "All models rate-limited";
  console.error("Diagram generation exhausted all models:", message);
  return Response.json(
    { error: "AI service temporarily unavailable. Please try again in a minute." },
    { status: 503 }
  );
}
