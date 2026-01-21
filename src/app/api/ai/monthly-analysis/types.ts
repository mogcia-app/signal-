/**
 * 型定義
 * 月次AI分析に関するすべての型定義を集約
 */

// 投稿パフォーマンス関連
export type PostPerformanceTag = "gold" | "gray" | "red" | "neutral";

export interface PostLearningSignal {
  postId: string;
  title: string;
  category: string;
  hashtags: string[];
  metrics: {
    reach: number;
    saves: number;
    likes: number;
    comments: number;
    shares: number;
    savesRate: number;
    commentsRate: number;
    likesRate: number;
    reachToFollowerRatio: number;
    velocityScore: number;
    totalEngagement: number;
    earlyEngagement: number | null;
    watchTimeSeconds: number | null;
    linkClicks: number | null;
    impressions: number | null;
  };
  comparisons: {
    reachDiff: number;
    engagementRateDiff: number;
    savesRateDiff: number;
    commentsRateDiff: number;
    clusterPerformanceDiff: number;
  };
  significance: {
    reach: "higher" | "lower" | "neutral";
    engagement: "higher" | "lower" | "neutral";
    savesRate: "higher" | "lower" | "neutral";
    commentsRate: "higher" | "lower" | "neutral";
  };
  cluster: {
    id: string;
    label: string;
    centroidDistance: number;
    baselinePerformance: number;
    similarPosts: Array<{
      postId: string;
      title: string;
      performanceScore: number;
      publishedAt: string | null;
    }>;
  };
  engagementRate: number;
  reach: number;
  followerIncrease: number;
  kpiScore: number;
  sentimentScore: number;
  sentimentLabel: "positive" | "negative" | "neutral";
  tag: PostPerformanceTag;
  feedbackCounts: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

export interface PatternSummary {
  tag: PostPerformanceTag;
  summary: string;
  keyThemes: string[];
  cautions: string[];
  suggestedAngles: string[];
}

// 学習タイムライン関連
export interface LearningTimelinePoint {
  period: string; // e.g. "2025-11"
  label: string; // e.g. "2025年11月"
  feedbackCount: number;
  positiveRate: number;
  actionCount: number;
  appliedCount: number;
  adoptionRate: number;
  feedbackWithCommentCount: number;
}

export interface LearningBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: "earned" | "in_progress";
  current: number;
  target: number;
  progress: number;
  condition?: string;
  highlight?: string;
  shortcuts?: Array<{
    label: string;
    href: string;
  }>;
}

// マスターコンテキスト関連
export interface MasterContext {
  userId: string;
  totalInteractions: number;
  ragHitRate: number;
  learningPhase: "initial" | "learning" | "optimized" | "master";
  personalizedInsights: string[];
  recommendations: string[];
  lastUpdated: Date;
  feedbackStats?: {
    total: number;
    positiveRate: number;
    averageWeight: number;
  };
  actionStats?: {
    total: number;
    adoptionRate: number;
    averageResultDelta: number;
  };
  postPatterns?: {
    signals: PostLearningSignal[];
    summaries: Partial<Record<PostPerformanceTag, PatternSummary>>;
    topHashtags: Record<string, number>;
  };
  timeline?: LearningTimelinePoint[];
  weeklyTimeline?: LearningTimelinePoint[];
  achievements?: LearningBadge[];
  postInsights?: Record<
    string,
    {
      summary: string;
      strengths: string[];
      improvements: string[];
      nextActions: string[];
    }
  >;
}

export interface SerializedMasterContext extends Omit<MasterContext, "lastUpdated"> {
  lastUpdated: string;
}

// レポートサマリー関連（infra/firestore/report-summary.tsから再エクスポート）
export type { ReportSummary } from "./infra/firestore/report-summary";

// 運用計画関連（infra/firestore/plan-summary.tsから再エクスポート）
export type { PlanSummary } from "./infra/firestore/plan-summary";

// アラート関連
export type AlertSeverity = "info" | "warning" | "critical";

export interface AnalysisAlert {
  id: string;
  metric: string;
  message: string;
  severity: AlertSeverity;
  change?: number;
  value?: number;
}

// 投稿タイプハイライト関連
export type PostTypeHighlightStatus = "strong" | "neutral" | "weak";

export interface PostTypeHighlight {
  id: string;
  type: string;
  label: string;
  status: PostTypeHighlightStatus;
  percentage: number;
  count: number;
  message: string;
}

// アクションプラン関連
export type ActionPlanPriority = "high" | "medium" | "low";

export interface ActionPlan {
  id: string;
  title: string;
  description: string;
  priority: ActionPlanPriority;
  focusArea: string;
  expectedImpact: string;
  recommendedActions: string[];
}

// 計画チェックポイント関連
export type PlanCheckpointStatus = "met" | "partial" | "missed" | "no_data";
export type PlanReflectionStatus = "on_track" | "at_risk" | "off_track" | "no_plan";

export interface PlanCheckpoint {
  label: string;
  target: string;
  actual: string;
  status: PlanCheckpointStatus;
}

export interface PlanReflection {
  summary: string;
  status: PlanReflectionStatus;
  checkpoints: PlanCheckpoint[];
  nextSteps: string[];
  planStrategyReview?: string; // 計画の「取り組みたいこと」「投稿したい内容」に対する総評
}

// PDCAメトリクス関連
export interface PDCAMetrics {
  planExists: boolean;
  loopScore: number;
  planScore: number;
  executionRate: number;
  feedbackCoverage: number;
  adoptionRate: number;
  plannedPosts: number;
  analyzedPosts: number;
  feedbackCount: number;
  actionCount: number;
  actionAppliedCount: number;
}

// 計画コンテキスト関連
export interface PlanContextPayload {
  planSummary: import("./infra/firestore/plan-summary").PlanSummary | null;
  actualPerformance: {
    totalPosts: number;
    followerChange: number;
    avgEngagementRate: number;
    reach: number;
    saves: number;
  };
}

// 概要ハイライト関連
export interface OverviewHighlight {
  label: string;
  value: string;
  change: string;
  context?: string;
}

// 分析概要関連
export interface AnalysisOverview {
  summary: string;
  highlights: OverviewHighlight[];
  watchouts: string[];
  planReflection?: PlanReflection | null;
}

