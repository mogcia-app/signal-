export type PostType = "feed" | "reel" | "story";

export interface KPIBreakdownSegment {
  label: string;
  value: number;
  delta?: number;
}

export interface KPIBreakdownTopPost {
  postId: string;
  title: string;
  value: number;
  postType?: PostType;
  status?: "gold" | "negative" | "normal";
}

export type KPIBreakdownKey =
  | "reach"
  | "saves"
  | "followers"
  | "engagement"
  | "total_interaction"
  | "external_links"
  | "profile_visits"
  | "current_followers";

export interface KPIBreakdown {
  key: KPIBreakdownKey;
  label: string;
  value: number;
  unit?: "count" | "percent";
  changePct?: number;
  segments?: KPIBreakdownSegment[];
  topPosts?: KPIBreakdownTopPost[];
  insight?: string;
}

export interface TimeSlotEntry {
  label: string;
  range: number[];
  color: string;
  postsInRange: number;
  avgEngagement: number;
  postTypes?: Array<{
    type: Extract<PostType, "feed" | "reel">;
    count: number;
    avgEngagement: number;
  }>;
}

export interface TimeSlotKPIAnalysis {
  label: string;
  range: number[];
  postsInRange: number;
  avgEngagementRate: number;
  avgReach: number;
  avgLikes: number;
  avgComments: number;
  avgSaves: number;
  totalEngagement: number;
  totalReach: number;
}

export interface FeedStats {
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
  totalReach: number;
  totalFollowerIncrease: number;
  totalInteractionCount: number;
  avgReachFollowerPercent: number;
  avgInteractionFollowerPercent: number;
  reachSources: {
    profile: number;
    feed: number;
    explore: number;
    search: number;
    other: number;
  };
  totalReachedAccounts: number;
  totalProfileVisits: number;
  totalExternalLinkTaps: number;
}

export interface ReelStats {
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
  totalReach: number;
  totalFollowerIncrease: number;
  totalInteractionCount: number;
  avgReachFollowerPercent: number;
  avgInteractionFollowerPercent: number;
  reachSources: {
    profile: number;
    reel: number;
    explore: number;
    search: number;
    other: number;
  };
  totalReachedAccounts: number;
  totalPlayTimeSeconds: number;
  avgPlayTimeSeconds: number;
  avgSkipRate: number;
  avgNormalSkipRate: number;
}

export interface AudienceBreakdown {
  gender?: { male: number; female: number; other: number };
  age?: { "18-24": number; "25-34": number; "35-44": number; "45-54": number };
}

export interface DailyKPI {
  date: string;
  label: string;
  likes: number;
  reach: number;
  saves: number;
  comments: number;
  engagement: number;
}

export interface GoalAchievement {
  key: string;
  label: string;
  target: number;
  actual: number;
  achievementRate: number;
  unit?: string;
  status: "achieved" | "on_track" | "at_risk" | "not_set";
}

export interface KPITotals {
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalReach: number;
  totalSaves: number;
  totalFollowerIncrease: number;
  totalInteraction: number;
  totalExternalLinkTaps: number;
  totalProfileVisits: number;
}

export interface KPIChanges {
  reachChange: number | undefined;
  savesChange: number | undefined;
  followerChange: number | undefined;
  totalInteractionChange: number | undefined;
  externalLinkTapsChange: number | undefined;
  profileVisitsChange: number | undefined;
}

export interface ReachSourceAnalysis {
  sources: {
    posts: number;
    profile: number;
    explore: number;
    search: number;
    other: number;
  };
}

export interface PostAnalyticsSummary {
  likes?: number;
  comments?: number;
  shares?: number;
  reach?: number;
  saves?: number;
  followerIncrease?: number;
  publishedTime?: string;
  reachFollowerPercent?: number;
  interactionCount?: number;
  interactionFollowerPercent?: number;
  reachSourceProfile?: number;
  reachSourceFeed?: number;
  reachSourceExplore?: number;
  reachSourceSearch?: number;
  reachSourceOther?: number;
  reachedAccounts?: number;
  profileVisits?: number;
  externalLinkTaps?: number;
  reelReachFollowerPercent?: number;
  reelInteractionCount?: number;
  reelInteractionFollowerPercent?: number;
  reelReachSourceProfile?: number;
  reelReachSourceReel?: number;
  reelReachSourceExplore?: number;
  reelReachSourceSearch?: number;
  reelReachSourceOther?: number;
  reelReachedAccounts?: number;
  reelPlayTime?: number;
  reelAvgPlayTime?: number;
  reelSkipRate?: number;
  reelNormalSkipRate?: number;
  audience?: AudienceBreakdown | null;
}

export interface PostWithAnalytics {
  id: string;
  title: string;
  postType: PostType;
  hashtags?: string[] | string;
  analyticsSummary?: PostAnalyticsSummary;
}

/** Repository から取得した前月アナリティクスの生データ */
export interface PreviousAnalyticsData {
  postId: string;
  publishedAt: Date;
  likes?: number;
  comments?: number;
  shares?: number;
  reach?: number;
  saves?: number;
  followerIncrease?: number;
  profileVisits?: number;
  externalLinkTaps?: number;
  category?: string;
  postType?: string;
}

/** 日次集計用の生アナリティクスデータ */
export interface RawAnalyticsEntry {
  publishedAt: Date;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  saves: number;
}

/** Repository → Domain に渡す生データ */
export interface KpiRawData {
  postsWithAnalytics: PostWithAnalytics[];
  previousAnalytics: PreviousAnalyticsData[];
  /** 日次集計用の全アナリティクスエントリ（重複排除前） */
  rawAnalyticsEntries: RawAnalyticsEntry[];
  followerCount: { profileVisits: number; externalLinkTaps: number; followers: number } | null;
  previousFollowerCount: { profileVisits: number; externalLinkTaps: number; followers: number } | null;
  snapshotStatusMap: Map<string, "gold" | "negative" | "normal">;
  activePlan: { targetFollowers: number; currentFollowers: number; monthlyPostCount: number } | null;
  initialFollowers: number;
  month: string;
}

export interface KPIDashboard {
  breakdowns: KPIBreakdown[];
  timeSlotAnalysis: TimeSlotEntry[];
  timeSlotKPIAnalysis: TimeSlotKPIAnalysis[];
  hashtagStats: Array<{ hashtag: string; count: number }>;
  feedStats: FeedStats | null;
  reelStats: ReelStats | null;
  feedAudience: AudienceBreakdown | null;
  reelAudience: AudienceBreakdown | null;
  dailyKPIs: DailyKPI[];
  goalAchievements: GoalAchievement[];
}
