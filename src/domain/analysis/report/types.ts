import type * as admin from "firebase-admin";

export interface AnalyticsData {
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  saves?: number;
  followerIncrease?: number;
  publishedAt: Date | admin.firestore.Timestamp;
}

export interface PerformanceScoreResult {
  score: number;
  rating: "S" | "A" | "B" | "C" | "D" | "F";
  label: string;
  color: string;
  breakdown: {
    engagement: number;
    growth: number;
    quality: number;
    consistency: number;
  };
  kpis: {
    totalLikes: number;
    totalReach: number;
    totalSaves: number;
    totalComments: number;
    totalFollowerIncrease: number;
  };
  metrics: {
    postCount: number;
    analyzedCount: number;
    hasPlan: boolean;
  };
}

export interface ParsedActionPlan {
  title: string;
  description: string;
  action: string;
}

export interface AiTextGenerationRequest {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AiClient {
  generateText(request: AiTextGenerationRequest): Promise<string>;
}
