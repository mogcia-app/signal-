import type { ABTestResultTag } from "./ab-test";

export type AIPriorityLevel = "high" | "medium" | "low";

export type AIReferenceSource =
  | "profile"
  | "plan"
  | "masterContext"
  | "snapshot"
  | "feedback"
  | "analytics"
  | "manual";

export interface AIReference {
  id: string;
  sourceType: AIReferenceSource;
  label: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

export interface AIImageHint {
  label: string;
  description: string;
}

export interface AIPrioritySummary {
  focus: string;
  level?: AIPriorityLevel;
  reason?: string;
}

export interface AIInsightBlock {
  title: string;
  description: string;
  action?: string;
  referenceIds?: string[];
}

export interface HashtagExplanation {
  hashtag: string;
  category: "brand" | "trending" | "supporting";
  reason: string;
}

export interface AIDraftBlock {
  title: string;
  body: string;
  hashtags: string[];
  hashtagExplanations?: HashtagExplanation[];
  cta?: string;
}

export interface AIGenerationMetadata {
  model: string;
  generatedAt: string;
  promptVersion?: string;
  temperature?: number;
  fallbackUsed?: boolean;
}

export interface AIGenerationResponse {
  draft: AIDraftBlock;
  insights?: string[];
  aiInsights?: AIInsightBlock[];
  imageHints?: AIImageHint[];
  priority?: AIPrioritySummary;
  references?: AIReference[];
  metadata?: AIGenerationMetadata;
  rawText?: string;
}

export interface SnapshotReference {
  id: string;
  status: "gold" | "negative" | "normal";
  score: number;
  postId?: string | null;
  title?: string;
  postType?: string;
  summary: string;
  metrics?: {
    engagementRate?: number;
    saveRate?: number;
    reach?: number;
    saves?: number;
  };
  textFeatures?: Record<string, unknown>;
  abTestResults?: ABTestResultTag[];
}

export interface AIActionLog {
  id: string;
  actionId: string;
  title: string;
  focusArea?: string;
  applied: boolean;
  resultDelta?: number | null;
  feedback?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

