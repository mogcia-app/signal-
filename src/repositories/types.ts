import type { PostAnalyticsSummary, PostType } from "@/domain/analysis/kpi/types";

export type SnapshotStatus = "gold" | "negative" | "normal";
export type YearMonthString = `${number}-${"01" | "02" | "03" | "04" | "05" | "06" | "07" | "08" | "09" | "10" | "11" | "12"}`;
export type YearMonthDayString =
  `${number}-${"01" | "02" | "03" | "04" | "05" | "06" | "07" | "08" | "09" | "10" | "11" | "12"}-${string}`;

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

export interface MonthlyKpiSummaryDailyBreakdownDocument {
  date: YearMonthDayString;
  likes: number;
  reach: number;
  saves: number;
  comments: number;
  engagement: number;
}

export interface MonthlyKpiSummaryDocument {
  userId: string;
  month: YearMonthString;
  snsType: "instagram";
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalReach: number;
  totalSaves: number;
  totalFollowerIncrease: number;
  totalInteraction: number;
  totalExternalLinkTaps: number;
  totalProfileVisits: number;
  postCount: number;
  dailyBreakdown: MonthlyKpiSummaryDailyBreakdownDocument[];
  lastAnalyticsDocId: string;
  updatedAt: Date;
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
  currentSummary: MonthlyKpiSummaryDocument | null;
  previousSummary: MonthlyKpiSummaryDocument | null;
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
  reposts?: number;
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
  startDate?: Date | null;
  endDate?: Date | null;
  createdAt?: Date | null;
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

export interface HomeDashboardAnalyticsDocument {
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  saves: number;
  followers: number;
  followerIncrease: number;
  publishedAt: Date;
}

export interface HomeDashboardPostDocument {
  id: string;
  postType: "feed" | "reel" | "story";
  title: string;
  content: string;
  createdAt: Date;
  scheduledDate: Date | null;
}

export interface HomeDashboardFollowerCountDocument {
  followers: number;
}

export interface HomeDashboardPlanDocument {
  id: string;
  title: string;
  generatedStrategy: string;
  aiGenerationStatus?: "pending" | "completed" | "failed";
  aiGenerationCompletedAt?: Date | null;
  formData: Record<string, unknown>;
  simulationResult: Record<string, unknown> | null;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date | null;
}

export interface HomeDashboardRepositoryData {
  analytics: HomeDashboardAnalyticsDocument[];
  posts: HomeDashboardPostDocument[];
  followerCounts: HomeDashboardFollowerCountDocument[];
  activePlan: HomeDashboardPlanDocument | null;
}

export interface TodayTasksCacheEntry {
  activePlanId?: string | null;
  data?: {
    tasks?: Array<{
      id: string;
      type: "story" | "comment" | "feed" | "reel";
      title: string;
      description: string;
      recommendedTime?: string;
      content?: string;
      hashtags?: string[];
      count?: number;
      reason?: string;
      priority: "high" | "medium" | "low";
    }>;
    tomorrowPreparations?: Array<{
      type: "feed" | "reel" | "story";
      description: string;
      content?: string;
      hashtags?: string[];
      preparation: string;
    }>;
    planExists?: boolean;
    totalTasks?: number;
  };
}
