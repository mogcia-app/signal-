import type { AIReference, SnapshotReference } from "@/types/ai";

export type PatternTag = "gold" | "gray" | "red" | "neutral";

export interface PatternSummary {
  summary: string;
  keyThemes: string[];
  cautions: string[];
  suggestedAngles: string[];
}

export interface PostPatternInsights {
  summaries: Partial<Record<PatternTag, PatternSummary>>;
  topHashtags: Record<string, number>;
  signals: PatternSignal[];
}

export interface PatternSignal {
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
  tag: PatternTag;
  kpiScore: number;
  engagementRate: number;
  sentimentScore: number;
  sentimentLabel: "positive" | "negative" | "neutral";
  feedbackCounts: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

export interface LearningTimelinePoint {
  period: string;
  label: string;
  feedbackCount: number;
  positiveRate: number;
  actionCount: number;
  appliedCount: number;
  adoptionRate: number;
  feedbackWithCommentCount: number;
}

export interface TimelineChartPoint extends LearningTimelinePoint {
  positiveRatePercent: number;
  adoptionRatePercent: number;
}

export interface FeedbackEntry {
  id: string;
  postId?: string | null;
  sentiment: "positive" | "negative" | "neutral";
  comment: string;
  weight: number;
  createdAt: string | null;
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

export interface PostInsight {
  summary: string;
  strengths: string[];
  improvements: string[];
  nextActions: string[];
}

export interface LearningContextCardData {
  references?: AIReference[];
  snapshotReferences?: SnapshotReference[];
  masterContext?: {
    learningPhase?: "initial" | "learning" | "optimized" | "master";
    ragHitRate?: number;
    totalInteractions?: number;
    feedbackStats?: {
      total?: number;
      positiveRate?: number;
    } | null;
    actionStats?: {
      total?: number;
      adoptionRate?: number;
      averageResultDelta?: number | null;
    } | null;
    achievements?: LearningBadge[] | null;
  } | null;
}

export interface MasterContextResponse {
  learningPhase: "initial" | "learning" | "optimized" | "master";
  ragHitRate: number;
  totalInteractions: number;
  personalizedInsights: string[];
  recommendations: string[];
  postPatterns: PostPatternInsights | null;
  timeline: LearningTimelinePoint[] | null;
  weeklyTimeline: LearningTimelinePoint[] | null;
  achievements: LearningBadge[] | null;
  postInsights?: Record<string, PostInsight>;
  learningContext?: LearningContextCardData | null;
}

