"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MECHANICS_TOPICS } from "@/lib/physics/topics";
import { Dumbbell, Target, Flame, AlertTriangle, TrendingUp } from "lucide-react";

interface TopicData {
  topic: string;
  questions_attempted: number;
  questions_correct: number;
  avg_hints_used: number;
  time_spent_seconds: number;
  last_studied_at: string | null;
}

interface Weakness {
  subtopic: string;
  topic: string;
  accuracy: number;
  total: number;
}

interface ProgressData {
  topics: TopicData[];
  weaknesses: Weakness[];
  stats: {
    totalAttempted: number;
    totalCorrect: number;
    overallAccuracy: number;
    currentStreak: number;
  };
}

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/progress")
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Progress</h1>
          <p className="text-muted-foreground mt-1">Loading your data...</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="py-6">
                <div className="h-4 bg-muted rounded animate-pulse w-1/3 mb-3" />
                <div className="h-2 bg-muted rounded animate-pulse w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = data?.stats;
  const hasData = stats && stats.totalAttempted > 0;

  // Build topic display data by merging MECHANICS_TOPICS with progress
  const topicDisplay = MECHANICS_TOPICS.map((t) => {
    const progress = data?.topics.find((p) => p.topic === t.slug);
    return {
      ...t,
      attempted: progress?.questions_attempted ?? 0,
      correct: progress?.questions_correct ?? 0,
      avgHints: progress?.avg_hints_used ?? 0,
      timeSpent: progress?.time_spent_seconds ?? 0,
      lastStudied: progress?.last_studied_at ?? null,
      accuracy:
        progress && progress.questions_attempted > 0
          ? progress.questions_correct / progress.questions_attempted
          : 0,
    };
  });

  function formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  }

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Progress</h1>
        <p className="text-muted-foreground mt-1">
          Track your mastery and find areas to strengthen
        </p>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Dumbbell className="h-10 w-10 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No data yet</p>
            <p className="text-sm mb-6">
              Start practicing to see your progress here.
            </p>
            <Link href="/practice">
              <Button>
                <Dumbbell className="mr-2 h-4 w-4" />
                Start practicing
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Overview stats */}
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Target className="h-4 w-4" />
                  Accuracy
                </div>
                <p className="text-2xl font-bold">
                  {Math.round(stats.overallAccuracy * 100)}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Dumbbell className="h-4 w-4" />
                  Problems
                </div>
                <p className="text-2xl font-bold">{stats.totalAttempted}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  Correct
                </div>
                <p className="text-2xl font-bold">{stats.totalCorrect}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Flame className="h-4 w-4" />
                  Streak
                </div>
                <p className="text-2xl font-bold">{stats.currentStreak}</p>
              </CardContent>
            </Card>
          </div>

          {/* Weakness detection */}
          {data.weaknesses.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Areas to strengthen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.weaknesses.slice(0, 5).map((w) => {
                    const pct = Math.round(w.accuracy * 100);
                    return (
                      <div key={w.subtopic} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium">{w.subtopic}</span>
                          <span className="text-muted-foreground ml-2 text-xs">
                            ({w.total} attempts)
                          </span>
                        </div>
                        <Badge
                          variant="destructive"
                          className="text-xs"
                        >
                          {pct}% accuracy
                        </Badge>
                      </div>
                    );
                  })}
                </div>
                <Link href="/practice" className="block mt-4">
                  <Button variant="outline" size="sm" className="w-full">
                    Practice weak areas
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Per-topic breakdown */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Topic breakdown</h2>
            <div className="space-y-4">
              {topicDisplay.map((t) => {
                const pct = Math.round(t.accuracy * 100);
                return (
                  <Card key={t.slug}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <span>{t.icon}</span>
                          {t.name}
                        </CardTitle>
                        {t.attempted > 0 ? (
                          <Badge
                            variant={
                              pct >= 70
                                ? "default"
                                : pct >= 40
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {pct}%
                          </Badge>
                        ) : (
                          <Badge variant="outline">Not started</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Progress value={t.attempted > 0 ? pct : 0} />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {t.correct}/{t.attempted} correct
                        </span>
                        <span>
                          {t.attempted > 0
                            ? `Avg hints: ${t.avgHints.toFixed(1)} · ${formatTime(t.timeSpent)}`
                            : "—"}
                        </span>
                      </div>
                      {t.lastStudied && (
                        <p className="text-xs text-muted-foreground">
                          Last studied:{" "}
                          {new Date(t.lastStudied).toLocaleDateString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
