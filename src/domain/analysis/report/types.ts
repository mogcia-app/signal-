import type * as admin from "firebase-admin";

export interface AnalyticsData {
  likes: number;
  comments: number;
  shares: number;
  reposts?: number;
  reach: number;
  saves?: number;
  followerIncrease?: number;
  postType?: "feed" | "reel" | "story" | "carousel" | "video";
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
    totalComments: number;
    totalShares: number;
    totalReposts: number;
    totalSaves: number;
    totalFollowerIncrease: number;
    totalReach: number;
    engagementRate: number | null;
    engagementRateNeedsReachInput: boolean;
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
  kpiKey?: "likes" | "comments" | "shares" | "saves" | "reach" | "followerIncrease";
  kpiLabel?: string;
  evaluationRule?: "increase_vs_previous_month";
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
