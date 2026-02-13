import type {
  AudienceBreakdown,
  KPIDashboard,
  KPIChanges,
  KPITotals,
  PostWithAnalytics,
  ReachSourceAnalysis,
} from "@/domain/analysis/kpi/types";
import { buildKpiBreakdowns } from "@/domain/analysis/kpi/calculators/build-kpi-breakdowns";
import { calculateTimeSlotAnalysis } from "@/domain/analysis/kpi/calculators/calculate-time-slot";
import { calculateTimeSlotKPIAnalysis } from "@/domain/analysis/kpi/calculators/calculate-time-slot-kpi";
import { calculateHashtagStats } from "@/domain/analysis/kpi/calculators/calculate-hashtag-stats";
import { calculateAudienceAnalysis } from "@/domain/analysis/kpi/calculators/calculate-audience";
import { calculateFeedStats, calculateReelStats } from "@/domain/analysis/kpi/calculators/calculate-feed-reel-stats";

export interface BuildKpiDashboardInput {
  postsWithAnalytics: PostWithAnalytics[];
  totals: KPITotals;
  previousTotals: KPITotals;
  changes: KPIChanges;
  reachSourceAnalysis: ReachSourceAnalysis;
  snapshotStatusMap: Map<string, "gold" | "negative" | "normal">;
  profileVisitsFromPosts: number;
  profileVisitsFromOther: number;
  externalLinkTapsFromPosts: number;
  externalLinkTapsFromOther: number;
  currentFollowers: number;
  previousCurrentFollowers: number;
  followerIncreaseFromReel: number;
  followerIncreaseFromFeed: number;
  followerIncreaseFromOther: number;
  isFirstMonth: boolean;
  initialFollowers: number;
  dailyKPIs: KPIDashboard["dailyKPIs"];
  goalAchievements: KPIDashboard["goalAchievements"];
}

export function buildKpiDashboard(input: BuildKpiDashboardInput): KPIDashboard {
  const breakdowns = buildKpiBreakdowns({
    totals: input.totals,
    previousTotals: input.previousTotals,
    changes: input.changes,
    reachSourceAnalysis: input.reachSourceAnalysis,
    posts: input.postsWithAnalytics,
    snapshotStatusMap: input.snapshotStatusMap,
    profileVisitsFromPosts: input.profileVisitsFromPosts,
    profileVisitsFromOther: input.profileVisitsFromOther,
    externalLinkTapsFromPosts: input.externalLinkTapsFromPosts,
    externalLinkTapsFromOther: input.externalLinkTapsFromOther,
    currentFollowers: input.currentFollowers,
    previousCurrentFollowers: input.previousCurrentFollowers,
    followerIncreaseFromReel: input.followerIncreaseFromReel,
    followerIncreaseFromFeed: input.followerIncreaseFromFeed,
    followerIncreaseFromOther: input.followerIncreaseFromOther,
    isFirstMonth: input.isFirstMonth,
    initialFollowers: input.initialFollowers,
  });

  const timeSlotAnalysis = calculateTimeSlotAnalysis(input.postsWithAnalytics);
  const timeSlotKPIAnalysis = calculateTimeSlotKPIAnalysis(input.postsWithAnalytics);
  const hashtagStats = calculateHashtagStats(input.postsWithAnalytics);
  const feedStats = calculateFeedStats(input.postsWithAnalytics);
  const reelStats = calculateReelStats(input.postsWithAnalytics);

  const feedPosts = input.postsWithAnalytics.filter((post) => post.postType === "feed");
  const reelPosts = input.postsWithAnalytics.filter((post) => post.postType === "reel");
  const feedAudience = normalizeAudience(calculateAudienceAnalysis(feedPosts));
  const reelAudience = normalizeAudience(calculateAudienceAnalysis(reelPosts));

  return {
    breakdowns,
    timeSlotAnalysis,
    timeSlotKPIAnalysis,
    hashtagStats,
    feedStats,
    reelStats,
    feedAudience,
    reelAudience,
    dailyKPIs: input.dailyKPIs,
    goalAchievements: input.goalAchievements,
  };
}

function normalizeAudience(audience: AudienceBreakdown | null): AudienceBreakdown | null {
  if (!audience?.gender || !audience?.age) {
    return null;
  }
  return audience;
}
