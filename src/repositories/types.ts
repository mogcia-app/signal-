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
