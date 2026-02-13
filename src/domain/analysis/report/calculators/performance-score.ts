import type { AnalyticsData, PerformanceScoreResult } from "@/domain/analysis/report/types";

export function calculatePerformanceScore(params: {
  postCount: number;
  analyzedCount: number;
  hasPlan: boolean;
  totalLikes: number;
  totalReach: number;
  totalSaves: number;
  totalComments: number;
  totalFollowerIncrease: number;
  analyticsData: AnalyticsData[];
}): PerformanceScoreResult {
  const {
    postCount,
    analyzedCount,
    hasPlan,
    totalLikes,
    totalReach,
    totalSaves,
    totalComments,
    totalFollowerIncrease,
    analyticsData,
  } = params;

  if (analyticsData.length === 0) {
    return {
      score: 0,
      rating: "F",
      label: "データ不足",
      color: "red",
      breakdown: {
        engagement: 0,
        growth: 0,
        quality: 0,
        consistency: 0,
      },
      kpis: {
        totalLikes: 0,
        totalReach: 0,
        totalSaves: 0,
        totalComments: 0,
        totalFollowerIncrease: 0,
      },
      metrics: {
        postCount: 0,
        analyzedCount: 0,
        hasPlan,
      },
    };
  }

  const avgEngagementRate =
    analyticsData.reduce((sum, data) => {
      const likes = data.likes || 0;
      const comments = data.comments || 0;
      const shares = data.shares || 0;
      const reach = data.reach || 1;
      const engagementRate = ((likes + comments + shares) / reach) * 100;
      return sum + engagementRate;
    }, 0) / analyticsData.length;
  const engagementScore = Math.min(50, avgEngagementRate * 10);

  const growthScore = Math.min(25, totalFollowerIncrease * 0.05);

  const avgReach = analyticsData.reduce((sum, data) => sum + data.reach, 0) / analyticsData.length;
  const qualityScore = Math.min(15, avgReach / 2000);

  const postsPerWeek = postCount / 4;
  const consistencyScore = Math.min(10, postsPerWeek * 3.33);

  const breakdown = {
    engagement: Math.round(engagementScore),
    growth: Math.round(growthScore),
    quality: Math.round(qualityScore),
    consistency: Math.round(consistencyScore),
  };

  const totalScore = breakdown.engagement + breakdown.growth + breakdown.quality + breakdown.consistency;

  let rating: "S" | "A" | "B" | "C" | "D" | "F";
  let label: string;
  let color: string;

  if (totalScore >= 85) {
    rating = "S";
    label = "業界トップ0.1%";
    color = "purple";
  } else if (totalScore >= 70) {
    rating = "A";
    label = "優秀なクリエイター";
    color = "blue";
  } else if (totalScore >= 55) {
    rating = "B";
    label = "良好";
    color = "green";
  } else if (totalScore >= 40) {
    rating = "C";
    label = "平均";
    color = "yellow";
  } else if (totalScore >= 25) {
    rating = "D";
    label = "改善必要";
    color = "orange";
  } else {
    rating = "F";
    label = "大幅改善必要";
    color = "red";
  }

  return {
    score: totalScore,
    rating,
    label,
    color,
    breakdown,
    kpis: {
      totalLikes,
      totalReach,
      totalSaves,
      totalComments,
      totalFollowerIncrease,
    },
    metrics: {
      postCount,
      analyzedCount,
      hasPlan,
    },
  };
}
