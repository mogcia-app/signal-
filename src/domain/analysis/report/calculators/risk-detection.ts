export interface RuntimeRiskAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  metric: string;
  message: string;
  change?: number;
  value?: number;
}

export interface PreviousMonthAggregates {
  analyzedCount: number;
  totalLikes: number;
  totalReach: number;
  totalComments: number;
  totalShares: number;
  totalReposts: number;
  totalSaves: number;
  totalFollowerIncrease: number;
  engagementRate: number | null;
}

export function aggregatePreviousMonthAnalytics(
  previousAnalyticsDocs: Array<Record<string, unknown>>
): PreviousMonthAggregates {
  const prevAnalyticsByPostId = new Map<string, Record<string, unknown>>();
  previousAnalyticsDocs.forEach((data) => {
    const postId = typeof data.postId === "string" ? data.postId : null;
    if (!postId) {
      return;
    }
    const existing = prevAnalyticsByPostId.get(postId);
    if (!existing || (data.publishedAt && existing.publishedAt && data.publishedAt > existing.publishedAt)) {
      prevAnalyticsByPostId.set(postId, data);
    }
  });

  let prevTotalLikes = 0;
  let prevTotalReach = 0;
  let prevTotalComments = 0;
  let prevTotalShares = 0;
  let prevTotalReposts = 0;
  let prevTotalSaves = 0;
  let prevTotalFollowerIncrease = 0;

  prevAnalyticsByPostId.forEach((data) => {
    prevTotalLikes += Number(data.likes) || 0;
    prevTotalReach += Number(data.reach) || 0;
    prevTotalComments += Number(data.comments) || 0;
    prevTotalShares += Number(data.shares) || 0;
    prevTotalReposts += Number(data.reposts) || 0;
    prevTotalSaves += Number(data.saves) || 0;
    prevTotalFollowerIncrease += Number(data.followerIncrease) || 0;
  });
  const prevEngagement = prevTotalLikes + prevTotalComments + prevTotalShares;

  return {
    analyzedCount: prevAnalyticsByPostId.size,
    totalLikes: prevTotalLikes,
    totalReach: prevTotalReach,
    totalComments: prevTotalComments,
    totalShares: prevTotalShares,
    totalReposts: prevTotalReposts,
    totalSaves: prevTotalSaves,
    totalFollowerIncrease: prevTotalFollowerIncrease,
    engagementRate: prevTotalReach > 0 ? (prevEngagement / prevTotalReach) * 100 : null,
  };
}

export function detectRiskAlerts(params: {
  current: {
    postCount: number;
    analyzedCount: number;
    totalLikes: number;
    totalReach: number;
    totalComments: number;
    totalFollowerIncrease: number;
  };
  previous: PreviousMonthAggregates;
}): RuntimeRiskAlert[] {
  const { current, previous } = params;
  const riskAlerts: RuntimeRiskAlert[] = [];

  if (previous.totalFollowerIncrease > 0 && current.totalFollowerIncrease < 0) {
    const decreaseRate = (Math.abs(current.totalFollowerIncrease) / previous.totalFollowerIncrease) * 100;
    if (decreaseRate >= 10) {
      riskAlerts.push({
        id: "follower-decrease",
        severity: decreaseRate >= 30 ? "critical" : "warning",
        metric: "フォロワー数",
        message: `フォロワー数が前月比で${decreaseRate.toFixed(1)}％減少しています。コンテンツの質や投稿頻度を見直す必要があります。`,
        change: -decreaseRate,
      });
    }
  }

  if (previous.totalReach > 0 && current.totalReach > 0) {
    const reachChange = ((current.totalReach - previous.totalReach) / previous.totalReach) * 100;
    if (reachChange <= -30) {
      riskAlerts.push({
        id: "reach-decrease",
        severity: reachChange <= -50 ? "critical" : "warning",
        metric: "リーチ数",
        message: `リーチ数が前月比で${Math.abs(reachChange).toFixed(1)}％減少しています。投稿タイミングやハッシュタグの見直しを検討してください。`,
        change: reachChange,
      });
    }
  }

  if (previous.totalReach > 0 && current.totalReach > 0) {
    const prevEngagementRate = ((previous.totalLikes + previous.totalComments) / previous.totalReach) * 100;
    const currentEngagementRate = ((current.totalLikes + current.totalComments) / current.totalReach) * 100;
    const engagementChange = currentEngagementRate - prevEngagementRate;

    if (engagementChange <= -2 && prevEngagementRate > 0) {
      riskAlerts.push({
        id: "engagement-decrease",
        severity: engagementChange <= -5 ? "critical" : "warning",
        metric: "エンゲージメント率",
        message: `エンゲージメント率が前月比で${Math.abs(engagementChange).toFixed(1)}ポイント低下しています。コンテンツの質やフォロワーとの関係性を見直す必要があります。`,
        change: engagementChange,
      });
    }
  }

  if (previous.analyzedCount > 0 && current.analyzedCount > 0) {
    const postCountChange = ((current.analyzedCount - previous.analyzedCount) / previous.analyzedCount) * 100;
    if (postCountChange <= -50) {
      riskAlerts.push({
        id: "post-frequency-decrease",
        severity: "warning",
        metric: "投稿頻度",
        message: `投稿数が前月比で${Math.abs(postCountChange).toFixed(1)}％減少しています。安定した投稿頻度を維持することが重要です。`,
        change: postCountChange,
      });
    }
  }

  if (current.postCount === 0) {
    riskAlerts.push({
      id: "no-posts",
      severity: "critical",
      metric: "投稿数",
      message: "今月は投稿がありません。継続的な投稿がアカウント成長の鍵です。",
      value: 0,
    });
  } else if (current.analyzedCount === 0 && previous.analyzedCount > 0) {
    riskAlerts.push({
      id: "no-analytics",
      severity: "warning",
      metric: "分析済み数",
      message: `今月は${current.postCount}件投稿していますが、分析データが未入力です。入力するとレポートが生成されます。`,
      value: 0,
    });
  }

  return riskAlerts;
}
