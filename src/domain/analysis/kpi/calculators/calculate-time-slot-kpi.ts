import type { PostWithAnalytics, TimeSlotKPIAnalysis } from "@/domain/analysis/kpi/types";

export function calculateTimeSlotKPIAnalysis(postsWithAnalytics: PostWithAnalytics[]): TimeSlotKPIAnalysis[] {
  const timeSlots = [
    { label: "早朝 (6-9時)", range: [6, 9] },
    { label: "午前 (9-12時)", range: [9, 12] },
    { label: "午後 (12-15時)", range: [12, 15] },
    { label: "夕方 (15-18時)", range: [15, 18] },
    { label: "夜 (18-21時)", range: [18, 21] },
    { label: "深夜 (21-6時)", range: [21, 24] },
  ];

  return timeSlots.map(({ label, range }) => {
    const postsInRange = postsWithAnalytics.filter((post) => {
      const publishedTime = post.analyticsSummary?.publishedTime;
      if (!publishedTime || publishedTime === "") {
        return false;
      }
      const hour = parseInt(publishedTime.split(":")[0], 10);
      if (isNaN(hour)) {
        return false;
      }

      if (range[0] === 21 && range[1] === 24) {
        return hour >= 21 || hour < 6;
      }

      return hour >= range[0] && hour < range[1];
    });

    if (postsInRange.length === 0) {
      return {
        label,
        range,
        postsInRange: 0,
        avgEngagementRate: 0,
        avgReach: 0,
        avgLikes: 0,
        avgComments: 0,
        avgSaves: 0,
        totalEngagement: 0,
        totalReach: 0,
      };
    }

    let totalEngagement = 0;
    let totalReach = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalSaves = 0;
    let totalEngagementRate = 0;

    postsInRange.forEach((post) => {
      const summary = post.analyticsSummary;
      if (!summary) {
        return;
      }

      const likes = summary.likes || 0;
      const comments = summary.comments || 0;
      const shares = summary.shares || 0;
      const saves = summary.saves || 0;
      const reach = summary.reach || 0;

      const engagement = likes + comments + shares + saves;
      const engagementRate = reach > 0 ? (engagement / reach) * 100 : 0;

      totalEngagement += engagement;
      totalReach += reach;
      totalLikes += likes;
      totalComments += comments;
      totalSaves += saves;
      totalEngagementRate += engagementRate;
    });

    const count = postsInRange.length;

    return {
      label,
      range,
      postsInRange: count,
      avgEngagementRate: count > 0 ? totalEngagementRate / count : 0,
      avgReach: count > 0 ? totalReach / count : 0,
      avgLikes: count > 0 ? totalLikes / count : 0,
      avgComments: count > 0 ? totalComments / count : 0,
      avgSaves: count > 0 ? totalSaves / count : 0,
      totalEngagement,
      totalReach,
    };
  });
}
