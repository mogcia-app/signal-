export interface LastMonthAnalyticsEntry {
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  profileVisits: number;
  followerIncrease: number;
}

export interface LastMonthPerformance {
  monthlyReach: number;
  engagementRate: number;
  profileViews: number;
  saves: number;
  newFollowers: number;
  postCount: number;
}

export function calculateLastMonthPerformance(
  entries: LastMonthAnalyticsEntry[]
): LastMonthPerformance | null {
  if (entries.length === 0) {
    return null;
  }

  const totals = entries.reduce(
    (acc, entry) => {
      acc.reach += entry.reach;
      acc.likes += entry.likes;
      acc.comments += entry.comments;
      acc.shares += entry.shares;
      acc.saves += entry.saves;
      acc.profileVisits += entry.profileVisits;
      acc.followerIncrease += entry.followerIncrease;
      return acc;
    },
    {
      reach: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      profileVisits: 0,
      followerIncrease: 0,
    }
  );

  const engagementRate =
    totals.reach > 0 ? ((totals.likes + totals.comments + totals.shares) / totals.reach) * 100 : 0;

  return {
    monthlyReach: totals.reach,
    engagementRate,
    profileViews: totals.profileVisits,
    saves: totals.saves,
    newFollowers: totals.followerIncrease,
    postCount: entries.length,
  };
}
