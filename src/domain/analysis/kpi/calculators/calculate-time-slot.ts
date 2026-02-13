import type { PostWithAnalytics, TimeSlotEntry } from "@/domain/analysis/kpi/types";

export function calculateTimeSlotAnalysis(postsWithAnalytics: PostWithAnalytics[]): TimeSlotEntry[] {
  const timeSlots = [
    { label: "早朝 (6-9時)", range: [6, 9], color: "from-blue-400 to-blue-600" },
    { label: "午前 (9-12時)", range: [9, 12], color: "from-green-400 to-green-600" },
    { label: "午後 (12-15時)", range: [12, 15], color: "from-yellow-400 to-yellow-600" },
    { label: "夕方 (15-18時)", range: [15, 18], color: "from-orange-400 to-orange-600" },
    { label: "夜 (18-21時)", range: [18, 21], color: "from-red-400 to-red-600" },
    { label: "深夜 (21-6時)", range: [21, 24], color: "from-purple-400 to-purple-600" },
  ];

  return timeSlots.map(({ label, range, color }) => {
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

    const avgEngagement =
      postsInRange.length > 0
        ? postsInRange.reduce((sum, post) => {
            const summary = post.analyticsSummary;
            if (!summary) {
              return sum;
            }
            return sum + ((summary.likes || 0) + (summary.comments || 0) + (summary.shares || 0));
          }, 0) / postsInRange.length
        : 0;

    const postTypeStats = ["feed", "reel"].map((type) => {
      const typePosts = postsInRange.filter((post) => post.postType === type);
      const typeAvgEngagement =
        typePosts.length > 0
          ? typePosts.reduce((sum, post) => {
              const summary = post.analyticsSummary;
              if (!summary) {
                return sum;
              }
              return sum + ((summary.likes || 0) + (summary.comments || 0) + (summary.shares || 0));
            }, 0) / typePosts.length
          : 0;
      return {
        type: type as "feed" | "reel",
        count: typePosts.length,
        avgEngagement: Number(typeAvgEngagement.toFixed(2)),
      };
    });

    return {
      label,
      range,
      color,
      postsInRange: postsInRange.length,
      avgEngagement,
      postTypes: postTypeStats,
    };
  });
}
