import { createClient } from "@/lib/supabase/server";
import { CONCEPT_NODES, buildEdges } from "@/lib/physics/knowledge-graph";
import {
  detectPrerequisiteGaps,
  getStudyRecommendations,
  computeNodeMasteryFromProgress,
} from "@/lib/physics/prerequisite-detection";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: progress } = await supabase
    .from("topic_progress")
    .select("topic, questions_attempted, questions_correct, last_studied_at")
    .eq("user_id", user.id);

  const { data: attempts } = await supabase
    .from("attempts")
    .select("is_correct, questions(topic, subtopic)")
    .eq("user_id", user.id)
    .limit(200);

  const formattedAttempts = (attempts ?? []).map((a) => {
    const q = a.questions as unknown as { topic: string; subtopic: string | null } | null;
    return {
      is_correct: a.is_correct,
      question_topic: q?.topic ?? "",
      question_subtopic: q?.subtopic ?? null,
    };
  });

  const masteryData = computeNodeMasteryFromProgress(progress ?? [], formattedAttempts);
  const gaps = detectPrerequisiteGaps(masteryData);
  const recommendations = getStudyRecommendations(masteryData);

  return Response.json({
    nodes: CONCEPT_NODES,
    edges: buildEdges(),
    mastery: masteryData,
    gaps,
    recommendations: recommendations.slice(0, 5),
  });
}
