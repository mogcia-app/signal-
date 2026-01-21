/**
 * Firestore層: レポートサマリー取得
 * 月次レポートサマリーAPIからデータを取得
 */

export interface ReportSummary {
  totals?: {
    totalLikes?: number;
    totalComments?: number;
    totalShares?: number;
    totalReach?: number;
    totalPosts?: number;
    totalSaves?: number;
    totalReposts?: number;
    totalFollowerIncrease?: number;
    avgEngagementRate?: number;
  };
  changes?: {
    likesChange?: number;
    commentsChange?: number;
    sharesChange?: number;
    reachChange?: number;
    postsChange?: number;
    followerChange?: number;
    engagementRateChange?: number;
  };
  previousTotals?: Record<string, unknown>;
  postTypeStats?: Array<{
    type: string;
    count: number;
    label: string;
    percentage: number;
  }>;
  hashtagStats?: Array<{
    hashtag: string;
    count: number;
  }>;
  timeSlotAnalysis?: Array<{
    label: string;
    range?: number[];
    postsInRange: number;
    avgEngagement: number;
  }>;
  bestTimeSlot?: {
    label: string;
    postsInRange: number;
    avgEngagement: number;
  };
}

export async function getReportSummary(
  userId: string,
  period: string,
  date: string
): Promise<ReportSummary | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/analytics/monthly-report-summary?userId=${userId}&period=${period}&date=${date}`
    );

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        return result.data;
      }
    }
  } catch (error) {
    console.error("レポートサマリー取得エラー:", error);
  }

  return null;
}

