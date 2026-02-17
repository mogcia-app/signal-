import type {
  DailyKPI,
  GoalAchievement,
  KPIChanges,
  KPITotals,
  PostWithAnalytics,
  RawAnalyticsEntry,
  ReachSourceAnalysis,
} from "@/domain/analysis/kpi/types";
import type { BuildKpiDashboardInput } from "@/domain/analysis/kpi/usecases/build-kpi-dashboard";
import type { AnalyticsDocument, KpiRepositoryData } from "@/repositories/types";

export function aggregateKpiInput(raw: KpiRepositoryData): BuildKpiDashboardInput {
  const postsWithAnalytics = deduplicateAnalyticsByPost(raw.currentAnalytics);
  const previousAnalytics = deduplicateAnalyticsByPost(raw.previousAnalytics);
  const rawAnalyticsEntries = toRawAnalyticsEntries(raw.currentAnalytics);
  const { followerCount, previousFollowerCount } = raw;
  const hasCurrentSummary = Boolean(raw.currentSummary);

  const profileVisitsFromPosts = hasCurrentSummary
    ? raw.currentSummary!.totalProfileVisits
    : postsWithAnalytics.reduce((sum, post) => sum + (post.analyticsSummary?.profileVisits || 0), 0);
  const profileVisitsFromOther = hasCurrentSummary ? 0 : followerCount?.profileVisits || 0;

  const externalLinkTapsFromPosts = hasCurrentSummary
    ? raw.currentSummary!.totalExternalLinkTaps
    : postsWithAnalytics
        .filter((post) => post.postType === "feed")
        .reduce((sum, post) => sum + (post.analyticsSummary?.externalLinkTaps || 0), 0);
  const externalLinkTapsFromOther = hasCurrentSummary ? 0 : followerCount?.externalLinkTaps || 0;

  const currentFollowers = followerCount?.followers || 0;
  const previousCurrentFollowers = previousFollowerCount?.followers || 0;

  const followerIncreaseFromReel = hasCurrentSummary
    ? 0
    : postsWithAnalytics
        .filter((post) => post.postType === "reel")
        .reduce((sum, post) => sum + (post.analyticsSummary?.followerIncrease || 0), 0);
  const followerIncreaseFromFeed = hasCurrentSummary
    ? 0
    : postsWithAnalytics
        .filter((post) => post.postType === "feed")
        .reduce((sum, post) => sum + (post.analyticsSummary?.followerIncrease || 0), 0);
  const followerIncreaseFromPosts = followerIncreaseFromReel + followerIncreaseFromFeed;
  const followerIncreaseFromOther = hasCurrentSummary
    ? raw.currentSummary!.totalFollowerIncrease
    : currentFollowers;

  const totals = raw.currentSummary
    ? totalsFromSummary(raw.currentSummary)
    : calculateTotals(postsWithAnalytics, followerCount);
  if (!raw.currentSummary) {
    totals.totalFollowerIncrease = followerIncreaseFromPosts + followerIncreaseFromOther;
  }

  const previousTotals = raw.previousSummary
    ? totalsFromSummary(raw.previousSummary)
    : calculatePreviousTotals(previousAnalytics, previousFollowerCount);
  const isFirstMonth = !previousFollowerCount && previousAnalytics.length === 0;

  const changes = calculateChanges(totals, previousTotals);
  const reachSourceAnalysis = calculateReachSourceAnalysis(postsWithAnalytics);
  const dailyKPIs = raw.currentSummary
    ? aggregateDailyKPIsFromSummary(raw.currentSummary, raw.month)
    : aggregateDailyKPIs(rawAnalyticsEntries, raw.month);
  const goalAchievements = calculateGoalAchievements(
    totals,
    raw.activePlan,
    raw.currentSummary?.postCount ?? postsWithAnalytics.length
  );

  return {
    postsWithAnalytics,
    totals,
    previousTotals,
    previousFeedReelShares: previousAnalytics
      .filter((post) => post.postType === "feed" || post.postType === "reel")
      .reduce((sum, post) => sum + (post.analyticsSummary?.shares || 0), 0),
    changes,
    reachSourceAnalysis,
    snapshotStatusMap: raw.snapshotStatusMap,
    profileVisitsFromPosts,
    profileVisitsFromOther,
    externalLinkTapsFromPosts,
    externalLinkTapsFromOther,
    currentFollowers,
    previousCurrentFollowers,
    followerIncreaseFromReel,
    followerIncreaseFromFeed,
    followerIncreaseFromOther,
    dailyKPIs,
    goalAchievements,
    isFirstMonth,
    initialFollowers: raw.initialFollowers,
  };
}

function totalsFromSummary(summary: NonNullable<KpiRepositoryData["currentSummary"]>): KPITotals {
  return {
    totalLikes: summary.totalLikes || 0,
    totalComments: summary.totalComments || 0,
    totalShares: summary.totalShares || 0,
    totalReach: summary.totalReach || 0,
    totalSaves: summary.totalSaves || 0,
    totalFollowerIncrease: summary.totalFollowerIncrease || 0,
    totalInteraction: summary.totalInteraction || 0,
    totalExternalLinkTaps: summary.totalExternalLinkTaps || 0,
    totalProfileVisits: summary.totalProfileVisits || 0,
  };
}

function aggregateDailyKPIsFromSummary(
  summary: NonNullable<KpiRepositoryData["currentSummary"]>,
  month: string
): DailyKPI[] {
  const [year, m] = month.split("-").map(Number);
  const daysInMonth = new Date(year, m, 0).getDate();

  const byDate = new Map<string, { likes: number; reach: number; saves: number; comments: number; engagement: number }>();
  for (const entry of summary.dailyBreakdown) {
    byDate.set(entry.date, {
      likes: entry.likes || 0,
      reach: entry.reach || 0,
      saves: entry.saves || 0,
      comments: entry.comments || 0,
      engagement: entry.engagement || 0,
    });
  }

  const dailyKPIs: DailyKPI[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, m - 1, day);
    const dayKey = currentDate.toISOString().split("T")[0];
    const daily = byDate.get(dayKey);
    dailyKPIs.push({
      date: dayKey,
      label: `${m}/${day}`,
      likes: daily?.likes || 0,
      reach: daily?.reach || 0,
      saves: daily?.saves || 0,
      comments: daily?.comments || 0,
      engagement: daily?.engagement || 0,
    });
  }

  return dailyKPIs;
}

function deduplicateAnalyticsByPost(analytics: AnalyticsDocument[]): PostWithAnalytics[] {
  const latestByPost = new Map<string, AnalyticsDocument>();

  for (const entry of analytics) {
    const existing = latestByPost.get(entry.postId);
    if (!existing || entry.publishedAt > existing.publishedAt) {
      latestByPost.set(entry.postId, entry);
    }
  }

  return Array.from(latestByPost.values()).map((entry) => ({
    id: entry.postId,
    title: entry.title,
    postType: entry.postType,
    hashtags: entry.hashtags,
    analyticsSummary: entry.analyticsSummary,
  }));
}

function toRawAnalyticsEntries(analytics: AnalyticsDocument[]): RawAnalyticsEntry[] {
  return analytics.map((entry) => ({
    publishedAt: entry.publishedAt,
    likes: entry.analyticsSummary.likes || 0,
    comments: entry.analyticsSummary.comments || 0,
    shares: entry.analyticsSummary.shares || 0,
    reach: entry.analyticsSummary.reach || 0,
    saves: entry.analyticsSummary.saves || 0,
  }));
}

export function calculateTotals(posts: PostWithAnalytics[], followerCount: KpiRepositoryData["followerCount"]): KPITotals {
  const profileVisitsFromHome = followerCount?.profileVisits || 0;
  const externalLinkTapsFromHome = followerCount?.externalLinkTaps || 0;

  return {
    totalLikes: posts.reduce((sum, post) => sum + (post.analyticsSummary?.likes || 0), 0),
    totalComments: posts.reduce((sum, post) => sum + (post.analyticsSummary?.comments || 0), 0),
    totalShares: posts.reduce((sum, post) => sum + (post.analyticsSummary?.shares || 0), 0),
    totalReach: posts.reduce((sum, post) => sum + (post.analyticsSummary?.reach || 0), 0),
    totalSaves: posts.reduce((sum, post) => sum + (post.analyticsSummary?.saves || 0), 0),
    totalFollowerIncrease: 0,
    totalInteraction: posts.reduce((sum, post) => {
      const s = post.analyticsSummary;
      if (!s) {return sum;}
      return sum + (s.likes || 0) + (s.saves || 0) + (s.comments || 0) + (s.shares || 0);
    }, 0),
    totalExternalLinkTaps:
      posts
        .filter((post) => post.postType === "feed")
        .reduce((sum, post) => sum + (post.analyticsSummary?.externalLinkTaps || 0), 0) +
      externalLinkTapsFromHome,
    totalProfileVisits:
      posts.reduce((sum, post) => sum + (post.analyticsSummary?.profileVisits || 0), 0) +
      profileVisitsFromHome,
  };
}

function calculatePreviousTotals(
  previousAnalytics: PostWithAnalytics[],
  previousFollowerCount: KpiRepositoryData["previousFollowerCount"]
): KPITotals {
  const previousProfileVisitsFromHome = previousFollowerCount?.profileVisits || 0;
  const previousExternalLinkTapsFromHome = previousFollowerCount?.externalLinkTaps || 0;

  const previousFollowerIncreaseFromPosts = previousAnalytics.reduce(
    (sum, post) => sum + (post.analyticsSummary?.followerIncrease || 0),
    0
  );
  const previousFollowerIncreaseFromOther = previousFollowerCount?.followers || 0;

  return {
    totalLikes: previousAnalytics.reduce((sum, post) => sum + (post.analyticsSummary?.likes || 0), 0),
    totalComments: previousAnalytics.reduce((sum, post) => sum + (post.analyticsSummary?.comments || 0), 0),
    totalShares: previousAnalytics.reduce((sum, post) => sum + (post.analyticsSummary?.shares || 0), 0),
    totalReach: previousAnalytics.reduce((sum, post) => sum + (post.analyticsSummary?.reach || 0), 0),
    totalSaves: previousAnalytics.reduce((sum, post) => sum + (post.analyticsSummary?.saves || 0), 0),
    totalFollowerIncrease: previousFollowerIncreaseFromPosts + previousFollowerIncreaseFromOther,
    totalInteraction: previousAnalytics.reduce((sum, post) => {
      const s = post.analyticsSummary;
      if (!s) {return sum;}
      return sum + (s.likes || 0) + (s.saves || 0) + (s.comments || 0) + (s.shares || 0);
    }, 0),
    totalExternalLinkTaps:
      previousAnalytics
        .filter((post) => post.postType === "feed")
        .reduce((sum, post) => sum + (post.analyticsSummary?.externalLinkTaps || 0), 0) +
      previousExternalLinkTapsFromHome,
    totalProfileVisits:
      previousAnalytics.reduce((sum, post) => sum + (post.analyticsSummary?.profileVisits || 0), 0) +
      previousProfileVisitsFromHome,
  };
}

function calculateChanges(totals: KPITotals, previousTotals: KPITotals): KPIChanges {
  const pctChange = (current: number, previous: number) =>
    previous === 0 ? undefined : ((current - previous) / previous) * 100;

  return {
    reachChange: pctChange(totals.totalReach, previousTotals.totalReach),
    savesChange: pctChange(totals.totalSaves, previousTotals.totalSaves),
    followerChange:
      previousTotals.totalFollowerIncrease === 0
        ? undefined
        : ((totals.totalFollowerIncrease - previousTotals.totalFollowerIncrease) /
            Math.abs(previousTotals.totalFollowerIncrease)) *
          100,
    totalInteractionChange: pctChange(totals.totalInteraction, previousTotals.totalInteraction),
    externalLinkTapsChange: pctChange(totals.totalExternalLinkTaps, previousTotals.totalExternalLinkTaps),
    profileVisitsChange: pctChange(totals.totalProfileVisits, previousTotals.totalProfileVisits),
  };
}

function calculateReachSourceAnalysis(posts: PostWithAnalytics[]): ReachSourceAnalysis {
  return {
    sources: {
      posts: posts.reduce((sum, post) => sum + (post.analyticsSummary?.reach || 0), 0),
      profile: 0,
      explore: 0,
      search: 0,
      other: 0,
    },
  };
}

export function aggregateDailyKPIs(entries: RawAnalyticsEntry[], month: string): DailyKPI[] {
  const [year, m] = month.split("-").map(Number);
  const daysInMonth = new Date(year, m, 0).getDate();

  const analyticsByDay = new Map<string, RawAnalyticsEntry[]>();
  for (const entry of entries) {
    const dayKey = entry.publishedAt.toISOString().split("T")[0];
    if (!analyticsByDay.has(dayKey)) {
      analyticsByDay.set(dayKey, []);
    }
    analyticsByDay.get(dayKey)!.push(entry);
  }

  const dailyKPIs: DailyKPI[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, m - 1, day);
    const dayKey = currentDate.toISOString().split("T")[0];
    const dayAnalytics = analyticsByDay.get(dayKey) || [];
    const dayLikes = dayAnalytics.reduce((sum, d) => sum + d.likes, 0);
    const dayReach = dayAnalytics.reduce((sum, d) => sum + d.reach, 0);
    const daySaves = dayAnalytics.reduce((sum, d) => sum + d.saves, 0);
    const dayComments = dayAnalytics.reduce((sum, d) => sum + d.comments, 0);
    const dayShares = dayAnalytics.reduce((sum, d) => sum + d.shares, 0);
    dailyKPIs.push({
      date: dayKey,
      label: `${m}/${day}`,
      likes: dayLikes,
      reach: dayReach,
      saves: daySaves,
      comments: dayComments,
      engagement: dayLikes + dayComments + dayShares + daySaves,
    });
  }
  return dailyKPIs;
}

function calculateGoalAchievements(
  totals: KPITotals,
  plan: KpiRepositoryData["activePlan"],
  postCount: number
): GoalAchievement[] {
  if (!plan) {return [];}

  const goalAchievements: GoalAchievement[] = [];
  const followerIncreaseTarget = Math.max(0, plan.targetFollowers - plan.currentFollowers);
  const actualFollowerIncrease = totals.totalFollowerIncrease || 0;
  const followerAchievementRate =
    followerIncreaseTarget > 0
      ? Math.min(100, Math.round((actualFollowerIncrease / followerIncreaseTarget) * 100))
      : actualFollowerIncrease > 0
        ? 100
        : 0;

  goalAchievements.push({
    key: "followers",
    label: "フォロワー増加",
    target: followerIncreaseTarget,
    actual: actualFollowerIncrease,
    achievementRate: followerAchievementRate,
    unit: "人",
    status: achievementStatus(followerAchievementRate),
  });

  const targetPosts = plan.monthlyPostCount || 20;
  const postsAchievementRate =
    targetPosts > 0
      ? Math.min(100, Math.round((postCount / targetPosts) * 100))
      : postCount > 0
        ? 100
        : 0;

  goalAchievements.push({
    key: "posts",
    label: "投稿数",
    target: targetPosts,
    actual: postCount,
    achievementRate: postsAchievementRate,
    unit: "件",
    status: achievementStatus(postsAchievementRate),
  });

  return goalAchievements;
}

function achievementStatus(rate: number): GoalAchievement["status"] {
  if (rate >= 100) {return "achieved";}
  if (rate >= 70) {return "on_track";}
  if (rate >= 50) {return "at_risk";}
  return "not_set";
}
