import type { PostDeepDiveData } from "@/types/report";
import type { ReportAnalyticsDocument, SnapshotStatus } from "@/repositories/types";

interface BuildPostDeepDiveInput {
  analyticsByPostId: Map<string, ReportAnalyticsDocument>;
  snapshotStatusMap: Map<string, SnapshotStatus>;
  limit?: number;
}

export function buildPostDeepDive(input: BuildPostDeepDiveInput): { posts: PostDeepDiveData[] } {
  const posts = Array.from(input.analyticsByPostId.entries())
    .slice(0, input.limit || 10)
    .map(([postId, analytics]) => ({
      id: postId,
      title: analytics.title,
      postType: analytics.postType,
      createdAt: analytics.publishedAt,
      analyticsSummary: {
        likes: analytics.likes,
        comments: analytics.comments,
        saves: analytics.saves,
        reach: analytics.reach,
        followerIncrease: analytics.followerIncrease,
        engagementRate: analytics.reach > 0 ? (analytics.likes + analytics.comments) / analytics.reach : 0,
      },
      snapshotReferences: input.snapshotStatusMap.has(postId)
        ? [
            {
              id: postId,
              status: input.snapshotStatusMap.get(postId)!,
            },
          ]
        : [],
    }));

  return { posts };
}
