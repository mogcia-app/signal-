import type {
  KPIBreakdown,
  KPIBreakdownSegment,
  KPIBreakdownTopPost,
  KPIChanges,
  KPITotals,
  PostWithAnalytics,
  ReachSourceAnalysis,
} from "@/domain/analysis/kpi/types";

export interface BuildKpiBreakdownsInput {
  totals: KPITotals;
  previousTotals: KPITotals;
  previousFeedReelShares: number;
  changes: KPIChanges;
  reachSourceAnalysis: ReachSourceAnalysis;
  posts: PostWithAnalytics[];
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
  isFirstMonth?: boolean;
  initialFollowers?: number;
}

function buildTopPosts(
  posts: PostWithAnalytics[],
  getValue: (summary: PostWithAnalytics["analyticsSummary"]) => number,
  snapshotStatusMap: Map<string, "gold" | "negative" | "normal">
): KPIBreakdownTopPost[] {
  return posts
    .map((post) => ({
      postId: post.id,
      title: post.title || "無題の投稿",
      value: getValue(post.analyticsSummary),
      postType: post.postType,
      status: snapshotStatusMap.get(post.id) || "normal",
    }))
    .filter((post) => post.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);
}

function summarizeSegments(segments: KPIBreakdownSegment[], totalValue: number): string | undefined {
  if (segments.length === 0 || totalValue === 0) {
    return undefined;
  }
  const topSegment = segments[0];
  const share = (topSegment.value / totalValue) * 100;
  if (share >= 50) {
    return `${topSegment.label}が${share.toFixed(1)}%を占めています。`;
  }
  return undefined;
}

export function buildKpiBreakdowns(params: BuildKpiBreakdownsInput): KPIBreakdown[] {
  const { totals, previousTotals, previousFeedReelShares, changes, reachSourceAnalysis, posts, snapshotStatusMap } = params;
  const typeLabelMap: Record<string, string> = {
    feed: "フィード",
    reel: "リール",
    story: "ストーリーズ",
  };

  const reachSegments: KPIBreakdownSegment[] = [
    { label: "投稿からの流入", value: reachSourceAnalysis?.sources?.posts || 0 },
    { label: "プロフィール閲覧", value: reachSourceAnalysis?.sources?.profile || 0 },
    { label: "発見タブ", value: reachSourceAnalysis?.sources?.explore || 0 },
    { label: "検索結果", value: reachSourceAnalysis?.sources?.search || 0 },
    { label: "その他チャネル", value: reachSourceAnalysis?.sources?.other || 0 },
  ].filter((segment) => segment.value > 0);

  const reachValue = totals.totalReach || 0;
  const reachBreakdown: KPIBreakdown = {
    key: "reach",
    label: "リーチ",
    value: reachValue,
    unit: "count",
    changePct: changes.reachChange ?? 0,
    segments: reachSegments,
    topPosts: buildTopPosts(posts, (summary) => summary?.reach || 0, snapshotStatusMap),
    insight: summarizeSegments(reachSegments, reachValue),
  };

  const savesByType = posts.reduce<Record<string, number>>((acc, post) => {
    const type = post.postType || "feed";
    const saves = post.analyticsSummary?.saves || 0;
    acc[type] = (acc[type] || 0) + saves;
    return acc;
  }, {});

  const savesSegments: KPIBreakdownSegment[] = Object.entries(savesByType)
    .map(([type, value]) => ({
      label: typeLabelMap[type] || type,
      value,
    }))
    .filter((segment) => segment.value > 0)
    .sort((a, b) => b.value - a.value);

  const savesValue = totals.totalSaves || 0;
  const savesBreakdown: KPIBreakdown = {
    key: "saves",
    label: "保存数",
    value: savesValue,
    unit: "count",
    changePct: changes.savesChange ?? 0,
    segments: savesSegments,
    topPosts: buildTopPosts(posts, (summary) => summary?.saves || 0, snapshotStatusMap),
    insight: summarizeSegments(savesSegments, savesValue),
  };

  const likesSegmentsRaw = posts.reduce<Record<string, number>>((acc, post) => {
    const type = post.postType || "feed";
    if (type === "reel" || type === "feed") {
      const likes = post.analyticsSummary?.likes || 0;
      acc[type] = (acc[type] || 0) + likes;
    }
    return acc;
  }, {});

  const likesSegments: KPIBreakdownSegment[] = Object.entries(likesSegmentsRaw)
    .map(([type, value]) => ({
      label: typeLabelMap[type] || type,
      value,
    }))
    .filter((segment) => segment.value !== 0)
    .sort((a, b) => b.value - a.value);

  const likesValue = totals.totalLikes || 0;
  const previousLikesValue = previousTotals.totalLikes || 0;
  const likesChange =
    previousLikesValue === 0 ? undefined : ((likesValue - previousLikesValue) / previousLikesValue) * 100;

  const followerBreakdown: KPIBreakdown = {
    key: "followers",
    label: "リール・フィードの合計いいね数",
    value: likesValue,
    unit: "count",
    changePct: likesChange,
    segments: likesSegments,
    topPosts: buildTopPosts(
      posts.filter((post) => post.postType === "reel" || post.postType === "feed"),
      (summary) => summary?.likes || 0,
      snapshotStatusMap
    ),
    insight: summarizeSegments(likesSegments, likesValue),
  };

  const feedReelPosts = posts.filter((post) => post.postType === "feed" || post.postType === "reel");

  const sharesByType = feedReelPosts.reduce<Record<string, number>>((acc, post) => {
    const type = post.postType || "feed";
    const shares = post.analyticsSummary?.shares || 0;
    acc[type] = (acc[type] || 0) + shares;
    return acc;
  }, {});

  const engagementValue = feedReelPosts.reduce(
    (sum, post) => sum + (post.analyticsSummary?.shares || 0),
    0
  );
  const previousEngagementValue = previousFeedReelShares || 0;
  const engagementChange =
    previousEngagementValue === 0
      ? undefined
      : ((engagementValue - previousEngagementValue) / previousEngagementValue) * 100;

  const engagementSegments: KPIBreakdownSegment[] = Object.entries(sharesByType)
    .map(([type, value]) => ({
      label: typeLabelMap[type] || type,
      value,
    }))
    .filter((segment) => segment.value > 0)
    .sort((a, b) => b.value - a.value);

  const engagementBreakdown: KPIBreakdown = {
    key: "engagement",
    label: "シェア数",
    value: engagementValue,
    unit: "count",
    changePct: engagementChange,
    segments: engagementSegments,
    topPosts: buildTopPosts(
      feedReelPosts,
      (summary) => summary?.shares || 0,
      snapshotStatusMap
    ),
    insight: summarizeSegments(engagementSegments, engagementValue),
  };

  const totalInteractionValue = params.totals.totalInteraction || 0;
  const previousTotalInteractionValue = params.previousTotals.totalInteraction || 0;
  const totalInteractionChange =
    previousTotalInteractionValue === 0
      ? undefined
      : ((totalInteractionValue - previousTotalInteractionValue) / previousTotalInteractionValue) * 100;

  const totalInteractionByType = posts.reduce<Record<string, number>>((acc, post) => {
    const type = post.postType || "feed";
    const summary = post.analyticsSummary;
    if (!summary) {
      return acc;
    }
    const interaction = (summary.likes || 0) + (summary.saves || 0) + (summary.comments || 0) + (summary.shares || 0);
    acc[type] = (acc[type] || 0) + interaction;
    return acc;
  }, {});

  const totalInteractionSegments: KPIBreakdownSegment[] = Object.entries(totalInteractionByType)
    .map(([type, value]) => ({
      label: typeLabelMap[type] || type,
      value,
    }))
    .filter((segment) => segment.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalInteractionBreakdown: KPIBreakdown = {
    key: "total_interaction",
    label: "総合インタラクション数",
    value: totalInteractionValue,
    unit: "count",
    changePct: totalInteractionChange,
    segments: totalInteractionSegments,
    topPosts: buildTopPosts(
      posts,
      (summary) =>
        (summary?.likes || 0) + (summary?.saves || 0) + (summary?.comments || 0) + (summary?.shares || 0),
      snapshotStatusMap
    ),
    insight: summarizeSegments(totalInteractionSegments, totalInteractionValue),
  };

  const externalLinkTapsValue = params.totals.totalExternalLinkTaps || 0;
  const previousExternalLinkTapsValue = params.previousTotals.totalExternalLinkTaps || 0;
  const externalLinkTapsChange =
    previousExternalLinkTapsValue === 0
      ? undefined
      : ((externalLinkTapsValue - previousExternalLinkTapsValue) / previousExternalLinkTapsValue) * 100;

  const externalLinkTapsSegments: KPIBreakdownSegment[] = [];
  if (params.externalLinkTapsFromPosts && params.externalLinkTapsFromPosts > 0) {
    externalLinkTapsSegments.push({
      label: "投稿から",
      value: params.externalLinkTapsFromPosts,
    });
  }
  if (params.externalLinkTapsFromOther && params.externalLinkTapsFromOther > 0) {
    externalLinkTapsSegments.push({
      label: "その他から",
      value: params.externalLinkTapsFromOther,
    });
  }

  const externalLinkTapsBreakdown: KPIBreakdown = {
    key: "external_links",
    label: "外部リンク数",
    value: externalLinkTapsValue,
    unit: "count",
    changePct: externalLinkTapsChange,
    segments: externalLinkTapsSegments.length > 0 ? externalLinkTapsSegments : undefined,
    topPosts: buildTopPosts(
      posts.filter((post) => post.postType === "feed"),
      (summary) => summary?.externalLinkTaps || 0,
      snapshotStatusMap
    ),
    insight:
      externalLinkTapsSegments.length > 0
        ? summarizeSegments(externalLinkTapsSegments, externalLinkTapsValue)
        : undefined,
  };

  const profileVisitsValue = params.totals.totalProfileVisits || 0;
  const previousProfileVisitsValue = params.previousTotals.totalProfileVisits || 0;
  const profileVisitsChange =
    previousProfileVisitsValue === 0
      ? undefined
      : ((profileVisitsValue - previousProfileVisitsValue) / previousProfileVisitsValue) * 100;

  const profileVisitsSegments: KPIBreakdownSegment[] = [
    { label: "投稿からの閲覧数", value: params.profileVisitsFromPosts || 0 },
    { label: "その他からの取得", value: params.profileVisitsFromOther || 0 },
  ].filter((segment) => segment.value > 0);

  const profileVisitsBreakdown: KPIBreakdown = {
    key: "profile_visits",
    label: "プロフィール閲覧数",
    value: profileVisitsValue,
    unit: "count",
    changePct: profileVisitsChange,
    segments: profileVisitsSegments,
    topPosts: buildTopPosts(posts, (summary) => summary?.profileVisits || 0, snapshotStatusMap),
    insight: summarizeSegments(profileVisitsSegments, profileVisitsValue),
  };

  const currentFollowersChange =
    previousTotals.totalFollowerIncrease === 0
      ? undefined
      : ((totals.totalFollowerIncrease - previousTotals.totalFollowerIncrease) /
          Math.abs(previousTotals.totalFollowerIncrease)) *
        100;

  const currentFollowersSegments: KPIBreakdownSegment[] = [];

  if (params.followerIncreaseFromReel && params.followerIncreaseFromReel > 0) {
    currentFollowersSegments.push({
      label: "リールから",
      value: params.followerIncreaseFromReel,
    });
  }
  if (params.followerIncreaseFromFeed && params.followerIncreaseFromFeed > 0) {
    currentFollowersSegments.push({
      label: "フィードから",
      value: params.followerIncreaseFromFeed,
    });
  }
  const totalFollowerIncrease = params.totals.totalFollowerIncrease;

  const currentFollowersBreakdown: KPIBreakdown = {
    key: "current_followers",
    label: "今月の増加数",
    value: totalFollowerIncrease,
    unit: "count",
    changePct: currentFollowersChange,
    segments: currentFollowersSegments.length > 0 ? currentFollowersSegments : undefined,
    topPosts: buildTopPosts(posts, (summary) => summary?.followerIncrease || 0, snapshotStatusMap),
    insight:
      currentFollowersSegments.length > 0
        ? summarizeSegments(currentFollowersSegments, totalFollowerIncrease)
        : undefined,
  };

  return [
    reachBreakdown,
    savesBreakdown,
    followerBreakdown,
    engagementBreakdown,
    totalInteractionBreakdown,
    externalLinkTapsBreakdown,
    profileVisitsBreakdown,
    currentFollowersBreakdown,
  ];
}
