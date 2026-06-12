"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MECHANICS_TOPICS } from "@/lib/physics/topics";
import { MathBlock } from "@/components/chat/math-block";
import { EinsteinLoader } from "@/components/loading/einstein-loader";
import { RefreshCw, Brain, Calculator, Lock, CheckCircle2 } from "lucide-react";
import type { Difficulty } from "@/lib/types";

type Mode = "intuition" | "solve";

interface Question {
  id: string;
  question_text: string;
  hints: string[];
  correct_answer: string;
  full_solution: { step: number; description: string; math?: string }[];
  explanation?: string;
  mode: Mode;
}

interface GradeResult {
  is_correct: boolean;
  feedback: string;
  full_solution: { step: number; description: string; math?: string }[];
}

// Track intuition completion per topic
interface TopicIntuitionState {
  completed: number;
  unlocked: boolean; // true when 3+ intuition done
}

const REQUIRED_INTUITION = 3;

export default function PracticePage() {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [currentMode, setCurrentMode] = useState<Mode>("intuition");

  const [question, setQuestion] = useState<Question | null>(null);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<GradeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [grading, setGrading] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Per-topic intuition progress
  const [intuitionProgress, setIntuitionProgress] = useState<Record<string, TopicIntuitionState>>({});

  function getTopicState(topic: string): TopicIntuitionState {
    return intuitionProgress[topic] ?? { completed: 0, unlocked: false };
  }

  const fetchQuestion = useCallback(async (topic: string, diff: Difficulty, mode: Mode) => {
    setLoading(true);
    setQuestion(null);
    setResult(null);
    setHintsRevealed(0);
    setAnswer("");
    setGenerationError(null);

    try {
      const res = await fetch("/api/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, difficulty: diff, mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to generate question");
      }
      setQuestion(data);
      setStartTime(Date.now());
    } catch (err) {
      setQuestion(null);
      setGenerationError(err instanceof Error ? err.message : "Failed to generate question");
    } finally {
      setLoading(false);
    }
  }, []);

  function handleTopicClick(topicSlug: string) {
    setSelectedTopic(topicSlug);
    const state = getTopicState(topicSlug);
    // Always start with intuition unless already unlocked
    const mode = state.unlocked ? currentMode : "intuition";
    setCurrentMode(mode);
    fetchQuestion(topicSlug, difficulty, mode);
  }

  function handleDifficultyChange(d: Difficulty) {
    setDifficulty(d);
    if (selectedTopic) {
      fetchQuestion(selectedTopic, d, currentMode);
    }
  }

  function handleModeSwitch(mode: Mode) {
    if (!selectedTopic) return;
    const state = getTopicState(selectedTopic);
    if (mode === "solve" && !state.unlocked) return;
    setCurrentMode(mode);
    fetchQuestion(selectedTopic, difficulty, mode);
  }

  async function submitAnswer() {
    if (!question || !answer.trim()) return;
    setGrading(true);
    const timeSpent = startTime ? Math.round((Date.now() - startTime) / 1000) : null;

    try {
      const res = await fetch("/api/questions/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: question.id,
          question_text: question.question_text,
          user_answer: answer,
          hints_used: hintsRevealed,
          correct_answer: question.correct_answer,
          full_solution: question.full_solution,
          topic: selectedTopic,
          difficulty,
          hints: question.hints,
        }),
      });
      if (!res.ok) throw new Error("Failed to grade");
      const data = await res.json();
      setResult(data);

      // If correct intuition answer, increment progress
      if (question.mode === "intuition" && data.is_correct && selectedTopic) {
        setIntuitionProgress((prev) => {
          const current = prev[selectedTopic] ?? { completed: 0, unlocked: false };
          const newCompleted = current.completed + 1;
          return {
            ...prev,
            [selectedTopic]: {
              completed: newCompleted,
              unlocked: newCompleted >= REQUIRED_INTUITION,
            },
          };
        });
      }

      // Save attempt to Supabase
      fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: selectedTopic,
          difficulty,
          question_text: question.question_text,
          full_solution: data.full_solution,
          hints: question.hints,
          user_answer: answer,
          is_correct: data.is_correct,
          hints_used: hintsRevealed,
          gave_up: false,
          time_spent_seconds: timeSpent,
        }),
      }).catch(() => {});
    } catch {
      // error
    } finally {
      setGrading(false);
    }
  }

  function revealNextHint() {
    if (question && hintsRevealed < question.hints.length) {
      setHintsRevealed((prev) => prev + 1);
    }
  }

  function nextProblem() {
    if (!selectedTopic) return;
    // Check if we should auto-switch to solve mode
    const state = getTopicState(selectedTopic);
    if (currentMode === "intuition" && state.unlocked) {
      // Just unlocked! Ask if they want to switch
      setCurrentMode("solve");
      fetchQuestion(selectedTopic, difficulty, "solve");
    } else {
      fetchQuestion(selectedTopic, difficulty, currentMode);
    }
  }

  const topicState = selectedTopic ? getTopicState(selectedTopic) : null;
  const topicMeta = selectedTopic ? MECHANICS_TOPICS.find((t) => t.slug === selectedTopic) : null;

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Practice</h1>
        <p className="text-muted-foreground mt-1">
          Build intuition first, then solve
        </p>
      </div>

      {/* Difficulty selector */}
      <div className="mb-6">
        <h2 className="text-sm font-medium mb-3">Difficulty</h2>
        <div className="flex gap-2">
          {(["beginner", "intermediate", "advanced"] as Difficulty[]).map((d) => (
            <Badge
              key={d}
              variant={difficulty === d ? "default" : "outline"}
              className="cursor-pointer capitalize px-4 py-1.5"
              onClick={() => handleDifficultyChange(d)}
            >
              {d}
            </Badge>
          ))}
        </div>
      </div>

      {/* Topic selector with intuition progress */}
      <div className="mb-8">
        <h2 className="text-sm font-medium mb-3">Choose a topic</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {MECHANICS_TOPICS.map((topic) => {
            const state = getTopicState(topic.slug);
            const isSelected = selectedTopic === topic.slug;
            return (
              <Card
                key={topic.slug}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? "ring-2 ring-primary bg-primary/5"
                    : "hover:bg-accent/50"
                }`}
                onClick={() => handleTopicClick(topic.slug)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span>{topic.icon}</span>
                      {topic.name}
                    </CardTitle>
                    {state.unlocked ? (
                      <Badge variant="default" className="text-[10px] gap-1 bg-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Solve unlocked
                      </Badge>
                    ) : state.completed > 0 ? (
                      <Badge variant="secondary" className="text-[10px]">
                        {state.completed}/{REQUIRED_INTUITION} intuition
                      </Badge>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs">
                    {topic.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Mode tabs — only show when a topic is selected */}
      {selectedTopic && topicState && (
        <div className="mb-6 flex gap-2">
          <Button
            variant={currentMode === "intuition" ? "default" : "outline"}
            size="sm"
            onClick={() => handleModeSwitch("intuition")}
            className="gap-2"
          >
            <Brain className="h-4 w-4" />
            Intuition
            {topicState.completed > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {topicState.completed}
              </Badge>
            )}
          </Button>
          <Button
            variant={currentMode === "solve" ? "default" : "outline"}
            size="sm"
            onClick={() => handleModeSwitch("solve")}
            disabled={!topicState.unlocked}
            className="gap-2"
          >
            {topicState.unlocked ? (
              <Calculator className="h-4 w-4" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            Solve
            {!topicState.unlocked && (
              <span className="text-[10px] ml-1 opacity-70">
                ({REQUIRED_INTUITION - topicState.completed} more intuition needed)
              </span>
            )}
          </Button>
        </div>
      )}

      {/* Einstein loading */}
      {loading && (
        <Card>
          <CardContent className="py-6">
            <EinsteinLoader />
          </CardContent>
        </Card>
      )}

      {/* Generation error */}
      {generationError && !loading && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="py-6">
            <p className="text-sm text-red-700 dark:text-red-300 mb-3">{generationError}</p>
            {selectedTopic && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchQuestion(selectedTopic, difficulty, currentMode)}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Try again
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Question display */}
      {question && !loading && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {question.mode === "intuition" ? (
                    <Badge variant="outline" className="gap-1 border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300">
                      <Brain className="h-3 w-3" />
                      Intuition
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300">
                      <Calculator className="h-3 w-3" />
                      Solve
                    </Badge>
                  )}
                  <Badge variant="outline" className="capitalize text-xs">
                    {topicMeta?.name} · {difficulty}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={nextProblem}
                  disabled={loading || grading}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${(loading || grading) ? "animate-spin" : ""}`} />
                  Skip
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm leading-relaxed">
                <MathBlock content={question.question_text} />
              </div>
            </CardContent>
          </Card>

          {/* Hints */}
          {!result && (
            <div className="space-y-3">
              {question.hints.slice(0, hintsRevealed).map((hint, i) => (
                <Card key={i} className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                  <CardContent className="py-3 text-sm">
                    <span className="font-medium text-amber-700 dark:text-amber-400">
                      Hint {i + 1}/{question.hints.length}:
                    </span>{" "}
                    <MathBlock content={hint} />
                  </CardContent>
                </Card>
              ))}

              {hintsRevealed < question.hints.length && (
                <Button variant="outline" size="sm" onClick={revealNextHint}>
                  Get hint ({hintsRevealed}/{question.hints.length} used)
                </Button>
              )}
            </div>
          )}

          {/* Answer input */}
          {!result && (
            <div className="space-y-2">
              {question.mode === "intuition" ? (
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Explain your reasoning..."
                  className="min-h-[80px] resize-none text-sm"
                  rows={3}
                />
              ) : (
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Enter your answer with units..."
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-background"
                  onKeyDown={(e) => e.key === "Enter" && submitAnswer()}
                />
              )}
              <Button
                onClick={submitAnswer}
                disabled={!answer.trim() || grading}
                className="w-full sm:w-auto"
              >
                {grading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Grading...
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </div>
          )}

          {/* Result */}
          {result && (
            <>
              <Card
                className={
                  result.is_correct
                    ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                }
              >
                <CardHeader>
                  <CardTitle className="text-base">
                    {result.is_correct ? "Correct!" : "Not quite"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <p>{result.feedback}</p>

                  {/* Show explanation for intuition questions */}
                  {question.mode === "intuition" && question.explanation && (
                    <div className="bg-white/60 dark:bg-white/5 rounded-lg p-3 border">
                      <h4 className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1">
                        Deeper understanding
                      </h4>
                      <p className="text-sm">{question.explanation}</p>
                    </div>
                  )}

                  <div>
                    <h3 className="font-medium mb-2">Full Solution:</h3>
                    <ol className="space-y-2 list-decimal list-inside">
                      {result.full_solution.map((step) => (
                        <li key={step.step}>
                          {step.description}
                          {step.math && (
                            <code className="ml-2 text-xs bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">
                              {step.math}
                            </code>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Hints used: {hintsRevealed}/{question.hints.length}
                  </p>

                  {/* Intuition progress notification */}
                  {question.mode === "intuition" && result.is_correct && selectedTopic && (
                    <IntuitionProgressNote state={getTopicState(selectedTopic)} />
                  )}
                </CardContent>
              </Card>
              <div className="flex justify-center">
                <Button onClick={nextProblem} disabled={loading}>
                  {currentMode === "intuition" &&
                    topicState &&
                    !topicState.unlocked &&
                    getTopicState(selectedTopic!).unlocked
                    ? "Solve problems unlocked — Continue"
                    : "Next Problem"
                  }
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function IntuitionProgressNote({ state }: { state: TopicIntuitionState }) {
  if (state.unlocked && state.completed === REQUIRED_INTUITION) {
    return (
      <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/40 rounded-lg px-3 py-2 text-green-800 dark:text-green-200 text-sm font-medium">
        <CheckCircle2 className="h-4 w-4" />
        Solve mode unlocked! You can now tackle computational problems.
      </div>
    );
  }
  if (!state.unlocked) {
    return (
      <p className="text-xs text-muted-foreground">
        Intuition progress: {state.completed}/{REQUIRED_INTUITION} — {REQUIRED_INTUITION - state.completed} more to unlock Solve mode
      </p>
    );
  }
  return null;
}
