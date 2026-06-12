export type Difficulty = "beginner" | "intermediate" | "advanced";
export type UserLevel = "beginner" | "intermediate" | "advanced";
export type MessageRole = "user" | "assistant" | "system";

export interface Profile {
  id: string;
  display_name: string | null;
  level: UserLevel;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  topic: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  hint_level: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Question {
  id: string;
  user_id: string;
  topic: string;
  subtopic: string | null;
  difficulty: Difficulty;
  question_text: string;
  full_solution: SolutionStep[];
  hints: string[];
  diagram_svg: string | null;
  created_at: string;
}

export interface SolutionStep {
  step: number;
  description: string;
  math?: string;
}

export interface Attempt {
  id: string;
  question_id: string;
  user_id: string;
  user_answer: string;
  is_correct: boolean;
  hints_used: number;
  gave_up: boolean;
  time_spent_seconds: number | null;
  created_at: string;
}

export interface TopicProgress {
  id: string;
  user_id: string;
  topic: string;
  questions_attempted: number;
  questions_correct: number;
  avg_hints_used: number;
  time_spent_seconds: number;
  last_studied_at: string | null;
}

export interface Topic {
  slug: string;
  name: string;
  description: string;
  icon: string;
  subtopics: string[];
}
