import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch topic progress
  const { data: progress, error: progressError } = await supabase
    .from("topic_progress")
    .select("*")
    .eq("user_id", user.id);

  if (progressError) {
    return Response.json({ error: progressError.message }, { status: 500 });
  }

  // Fetch recent attempts with question details for weakness detection
  const { data: recentAttempts, error: attemptsError } = await supabase
    .from("attempts")
    .select("id, is_correct, hints_used, created_at, question_id, questions(topic, subtopic, difficulty)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (attemptsError) {
    return Response.json({ error: attemptsError.message }, { status: 500 });
  }

  // Compute weakness analysis: subtopic-level accuracy from recent attempts
  const subtopicStats: Record<string, { correct: number; total: number; topic: string }> = {};

  for (const attempt of recentAttempts ?? []) {
    const q = attempt.questions as unknown as { topic: string; subtopic: string | null; difficulty: string } | null;
    if (!q) continue;
    const key = q.subtopic ?? q.topic;
    if (!subtopicStats[key]) {
      subtopicStats[key] = { correct: 0, total: 0, topic: q.topic };
    }
    subtopicStats[key].total++;
    if (attempt.is_correct) subtopicStats[key].correct++;
  }

  const weaknesses = Object.entries(subtopicStats)
    .map(([subtopic, stats]) => ({
      subtopic,
      topic: stats.topic,
      accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
      total: stats.total,
    }))
    .filter((w) => w.total >= 2 && w.accuracy < 0.6)
    .sort((a, b) => a.accuracy - b.accuracy);

  // Compute streaks from recent attempts
  let currentStreak = 0;
  for (const attempt of recentAttempts ?? []) {
    if (attempt.is_correct) currentStreak++;
    else break;
  }

  const totalAttempted = (progress ?? []).reduce((s, p) => s + p.questions_attempted, 0);
  const totalCorrect = (progress ?? []).reduce((s, p) => s + p.questions_correct, 0);

  return Response.json({
    topics: progress ?? [],
    weaknesses,
    stats: {
      totalAttempted,
      totalCorrect,
      overallAccuracy: totalAttempted > 0 ? totalCorrect / totalAttempted : 0,
      currentStreak,
    },
  });
}
