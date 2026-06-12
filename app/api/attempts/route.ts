import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    topic,
    subtopic,
    difficulty,
    question_text,
    full_solution,
    hints,
    user_answer,
    is_correct,
    hints_used,
    gave_up,
    time_spent_seconds,
  } = body;

  // 1. Save the question
  const { data: question, error: qError } = await supabase
    .from("questions")
    .insert({
      user_id: user.id,
      topic,
      subtopic: subtopic ?? null,
      difficulty,
      question_text,
      full_solution,
      hints,
    })
    .select("id")
    .single();

  if (qError) {
    return Response.json({ error: qError.message }, { status: 500 });
  }

  // 2. Save the attempt
  const { error: aError } = await supabase.from("attempts").insert({
    question_id: question.id,
    user_id: user.id,
    user_answer,
    is_correct,
    hints_used,
    gave_up: gave_up ?? false,
    time_spent_seconds: time_spent_seconds ?? null,
  });

  if (aError) {
    return Response.json({ error: aError.message }, { status: 500 });
  }

  // 3. Upsert topic_progress
  const { data: existing } = await supabase
    .from("topic_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("topic", topic)
    .single();

  if (existing) {
    const newAttempted = existing.questions_attempted + 1;
    const newCorrect = existing.questions_correct + (is_correct ? 1 : 0);
    const newAvgHints =
      (existing.avg_hints_used * existing.questions_attempted + hints_used) /
      newAttempted;
    const newTime = existing.time_spent_seconds + (time_spent_seconds ?? 0);

    await supabase
      .from("topic_progress")
      .update({
        questions_attempted: newAttempted,
        questions_correct: newCorrect,
        avg_hints_used: Math.round(newAvgHints * 100) / 100,
        time_spent_seconds: newTime,
        last_studied_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("topic_progress").insert({
      user_id: user.id,
      topic,
      questions_attempted: 1,
      questions_correct: is_correct ? 1 : 0,
      avg_hints_used: hints_used,
      time_spent_seconds: time_spent_seconds ?? 0,
      last_studied_at: new Date().toISOString(),
    });
  }

  return Response.json({ success: true, question_id: question.id });
}
