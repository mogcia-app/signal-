/**
 * レポート関連の型定義
 * 複数のファイルで使用される共通型定義を集約
 */

import type { AIReference, MasterContextSummary, SnapshotReference } from "./ai";

// re-export for consumers that imported from this file
export type { AIReference, MasterContextSummary, SnapshotReference };

/**
 * アクションプランの優先度
 */
export type ActionPlanPriority = "high" | "medium" | "low";

/**
 * アクションプラン
 * 月次レポートで生成される改善提案
 */
export interface ActionPlan {
  id?: string;
  title: string;
  description: string;
  priority: ActionPlanPriority;
  focusArea: string;
  expectedImpact: string;
  recommendedActions: string[];
  action?: string; // 一部のAPIレスポンスで使用される簡易版
}

/**
 * リスクアラート
 */
export interface RiskAlert {
  id: string;
  type: "performance_drop" | "engagement_decrease" | "follower_loss" | "content_quality" | "consistency";
  severity: "high" | "medium" | "low" | "critical" | "warning" | "info";
  title: string;
  description: string;
  recommendation: string;
  affectedMetrics?: string[];
  change?: number;
  value?: number;
  // 互換性のための追加プロパティ
  metric?: string;
  message?: string;
}

/**
 * フィードバック感情コメント
 */
export interface FeedbackSentimentComment {
  postId: string;
  title: string;
  comment: string;
  sentiment: "positive" | "negative" | "neutral";
  createdAt?: string;
  postType?: "feed" | "reel" | "story";
}

/**
 * フィードバック投稿感情エントリ
 */
export interface FeedbackPostSentimentEntry {
  postId: string;
  title: string;
  postType?: "feed" | "reel" | "story";
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  score?: number; // optional to match usage
  lastComment?: string;
  lastCommentAt?: string;
  lastSentiment?: "positive" | "negative" | "neutral";
  status?: "gold" | "negative" | "normal";
}

/**
 * フィードバック感情サマリー
 */
export interface FeedbackSentimentSummary {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  positiveRate: number;
  withCommentCount: number;
  commentHighlights?: {
    positive: FeedbackSentimentComment[];
    negative: FeedbackSentimentComment[];
  };
  posts?: FeedbackPostSentimentEntry[];
}

/**
 * 投稿ディープダイブデータ
 */
export interface PostDeepDiveData {
  id: string;
  title: string;
  postType: "feed" | "reel" | "story" | "carousel" | "video";
  createdAt: Date | string;
  analyticsSummary?: {
    likes: number;
    comments: number;
    saves: number;
    reach: number;
    followerIncrease: number;
    engagementRate: number;
  };
  snapshotReferences?: Array<{
    id: string;
    status: "gold" | "negative" | "normal";
    summary?: string;
  }>;
}

/**
 * 投稿サマリーデータ
 */
export interface PostSummaryData {
  postId: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendedActions: string[];
  reach: number;
}

/**
 * 月次レビューデータ
 */
export interface MonthlyReviewData {
  review: string;
  successes: string[];
  challenges: string[];
  nextActions: string[];
  actionPlans?: ActionPlan[];
  hasPlan?: boolean;
  analyzedCount?: number;
  generationState?: "locked" | "ready" | "generated";
  requiredCount?: number;
  remainingCount?: number;
  kpiSummary?: {
    key: string;
    label: string;
    value: number;
    change?: number;
    icon?: string;
  }[];
}

/**
 * レポートデータ（ローカル用のPerformanceScoreDataLocalを含む）
 */
export interface ReportData {
  performanceScore?: {
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
  };
  riskAlerts?: RiskAlert[];
  feedbackSentiment?: FeedbackSentimentSummary | null;
  postDeepDive?: {
    posts: PostDeepDiveData[];
  };
  aiLearningReferences?: {
    masterContext?: MasterContextSummary | null;
    references?: AIReference[];
    snapshotReferences?: SnapshotReference[];
  };
  postSummaries?: PostSummaryData[];
  monthlyReview?: MonthlyReviewData;
  [key: string]: unknown; // Index signature for compatibility
}

/**
 * パフォーマンススコアデータ
 */
export interface PerformanceScoreData {
  overall: "S" | "A" | "B" | "C" | "D" | "F";
  engagement: "S" | "A" | "B" | "C" | "D" | "F";
  growth: "S" | "A" | "B" | "C" | "D" | "F";
  quality: "S" | "A" | "B" | "C" | "D" | "F";
  consistency: "S" | "A" | "B" | "C" | "D" | "F";
  scores: {
    engagement: number;
    growth: number;
    quality: number;
    consistency: number;
  };
}
