import type { PostAnalyticsSummary, PostType } from "@/domain/analysis/kpi/types";

export type SnapshotStatus = "gold" | "negative" | "normal";

export interface AnalyticsDocument {
  postId: string;
  publishedAt: Date;
  title: string;
  postType: PostType;
  hashtags: string[];
  analyticsSummary: PostAnalyticsSummary;
}

export interface FollowerCountDocument {
  profileVisits: number;
  externalLinkTaps: number;
  followers: number;
}

export interface PlanGoalDocument {
  targetFollowers: number;
  currentFollowers: number;
  monthlyPostCount: number;
}

export interface KpiRepositoryData {
  month: string;
  currentAnalytics: AnalyticsDocument[];
  previousAnalytics: AnalyticsDocument[];
  followerCount: FollowerCountDocument | null;
  previousFollowerCount: FollowerCountDocument | null;
  snapshotStatusMap: Map<string, SnapshotStatus>;
  activePlan: PlanGoalDocument | null;
  initialFollowers: number;
}

export interface ReportAnalyticsDocument {
  postId: string;
  title: string;
  postType: "feed" | "reel" | "story" | "carousel" | "video";
  publishedAt: Date;
  publishedTime: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  saves: number;
  followerIncrease: number;
}

export interface ReportFollowerCountDocument {
  followers: number;
}

export interface ReportPlanDocument {
  title: string;
  targetFollowers: number;
  currentFollowers: number;
  strategies: string[];
  postCategories: string[];
}

export interface ReportUserDocument {
  businessInfo: Record<string, unknown> | null;
  snsAISettings: Record<string, unknown> | null;
}

export interface ReportFeedbackDocument {
  id: string;
  postId: string | null;
  sentiment: "positive" | "negative" | "neutral" | null;
  goalAchievementProspect: "high" | "medium" | "low" | null;
  comment: string;
  createdAt: Date | null;
}

export interface DirectionAlignmentWarningDocument {
  postId: string;
  directionAlignment: "乖離" | "要注意";
  directionComment: string;
  aiDirectionMainTheme: string | null;
}

export interface ReportPostSummaryDocument {
  postId: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendedActions: string[];
}

export interface ReportRepositoryData {
  month: string;
  startDate: Date;
  endDate: Date;
  analytics: ReportAnalyticsDocument[];
  posts: string[];
  activePlan: ReportPlanDocument | null;
  user: ReportUserDocument | null;
  previousAnalytics: ReportAnalyticsDocument[];
  followerCount: ReportFollowerCountDocument | null;
  feedbackEntries: ReportFeedbackDocument[];
  snapshotStatusMap: Map<string, SnapshotStatus>;
  directionAlignmentWarnings: DirectionAlignmentWarningDocument[];
}
