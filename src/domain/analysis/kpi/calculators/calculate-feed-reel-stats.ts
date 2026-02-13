import type { FeedStats, PostWithAnalytics, ReelStats } from "@/domain/analysis/kpi/types";

export function calculateFeedStats(postsWithAnalytics: PostWithAnalytics[]): FeedStats | null {
  const feedPosts = postsWithAnalytics.filter((post) => post.postType === "feed" && post.analyticsSummary);
  if (feedPosts.length === 0) {
    return null;
  }

  const safeNumber = (value: number | undefined | null) => Number(value) || 0;

  const totalLikes = feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.likes), 0);
  const totalComments = feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.comments), 0);
  const totalShares = feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.shares), 0);
  const totalSaves = feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.saves), 0);
  const totalReach = feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reach), 0);
  const totalFollowerIncrease = feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.followerIncrease), 0);
  const totalInteractionCount = feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.interactionCount), 0);
  const totalProfileVisits = feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.profileVisits), 0);
  const totalReachedAccounts = feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reachedAccounts), 0);
  const totalExternalLinkTaps = feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.externalLinkTaps), 0);

  const avgReachFollowerPercent =
    feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reachFollowerPercent), 0) /
    feedPosts.length;
  const avgInteractionFollowerPercent =
    feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.interactionFollowerPercent), 0) /
    feedPosts.length;

  const reachSources = {
    profile: feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reachSourceProfile), 0),
    feed: feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reachSourceFeed), 0),
    explore: feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reachSourceExplore), 0),
    search: feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reachSourceSearch), 0),
    other: feedPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reachSourceOther), 0),
  };

  return {
    totalLikes,
    totalComments,
    totalShares,
    totalSaves,
    totalReach,
    totalFollowerIncrease,
    totalInteractionCount,
    avgReachFollowerPercent,
    avgInteractionFollowerPercent,
    reachSources,
    totalReachedAccounts,
    totalProfileVisits,
    totalExternalLinkTaps,
  };
}

export function calculateReelStats(postsWithAnalytics: PostWithAnalytics[]): ReelStats | null {
  const reelPosts = postsWithAnalytics.filter((post) => post.postType === "reel" && post.analyticsSummary);
  if (reelPosts.length === 0) {
    return null;
  }

  const safeNumber = (value: number | undefined | null) => Number(value) || 0;

  const totalLikes = reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.likes), 0);
  const totalComments = reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.comments), 0);
  const totalShares = reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.shares), 0);
  const totalSaves = reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.saves), 0);
  const totalReach = reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reach), 0);
  const totalFollowerIncrease = reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.followerIncrease), 0);
  const totalInteractionCount = reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reelInteractionCount), 0);
  const totalReachedAccounts = reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reelReachedAccounts), 0);
  const totalPlayTimeSeconds = reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reelPlayTime), 0);

  const avgReachFollowerPercent =
    reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reelReachFollowerPercent), 0) /
    reelPosts.length;
  const avgInteractionFollowerPercent =
    reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reelInteractionFollowerPercent), 0) /
    reelPosts.length;
  const avgPlayTimeSeconds =
    reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reelAvgPlayTime), 0) /
    reelPosts.length;
  const avgSkipRate =
    reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reelSkipRate), 0) / reelPosts.length;
  const avgNormalSkipRate =
    reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reelNormalSkipRate), 0) /
    reelPosts.length;

  const reachSources = {
    profile: reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reelReachSourceProfile), 0),
    reel: reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reelReachSourceReel), 0),
    explore: reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reelReachSourceExplore), 0),
    search: reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reelReachSourceSearch), 0),
    other: reelPosts.reduce((sum, post) => sum + safeNumber(post.analyticsSummary?.reelReachSourceOther), 0),
  };

  return {
    totalLikes,
    totalComments,
    totalShares,
    totalSaves,
    totalReach,
    totalFollowerIncrease,
    totalInteractionCount,
    avgReachFollowerPercent,
    avgInteractionFollowerPercent,
    reachSources,
    totalReachedAccounts,
    totalPlayTimeSeconds,
    avgPlayTimeSeconds,
    avgSkipRate,
    avgNormalSkipRate,
  };
}
