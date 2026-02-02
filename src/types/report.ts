/**
 * レポート関連の型定義
 * 複数のファイルで使用される共通型定義を集約
 */

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
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  recommendation: string;
  affectedMetrics?: string[];
  change?: number;
  value?: number;
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
  score?: number;
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
 * AI学習リファレンス
 */
export interface AIReference {
  id: string;
  sourceType: "profile" | "plan" | "masterContext" | "snapshot" | "feedback" | "analytics" | "manual";
  label?: string;
  summary?: string;
}

/**
 * スナップショットリファレンス
 */
export interface SnapshotReference {
  id: string;
  status: "gold" | "negative" | "normal";
  summary?: string;
}

/**
 * マスターコンテキストサマリー
 */
export interface MasterContextSummary {
  learningPhase?: string;
  ragHitRate?: number;
  totalInteractions?: number;
  feedbackStats?: {
    total?: number;
    positiveRate?: number;
  } | null;
  actionStats?: {
    total?: number;
    adoptionRate?: number;
  } | null;
  achievements?: Array<{
    id: string;
    title: string;
    description: string;
    status?: string;
    progress?: number;
  }> | null;
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

