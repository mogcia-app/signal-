import { buildPostDeepDive } from "@/domain/analysis/report/usecases/build-post-deep-dive";
import type { ReportAnalyticsDocument, SnapshotStatus } from "@/repositories/types";

function analytics(overrides: Partial<ReportAnalyticsDocument>): ReportAnalyticsDocument {
  return {
    postId: "post-1",
    title: "Post 1",
    postType: "feed",
    publishedAt: new Date("2026-02-10T10:00:00.000Z"),
    publishedTime: "10:00",
    likes: 10,
    comments: 5,
    shares: 2,
    reach: 100,
    saves: 3,
    followerIncrease: 4,
    ...overrides,
  };
}

describe("buildPostDeepDive", () => {
  test("builds deep dive with computed engagementRate and snapshot reference", () => {
    const analyticsByPostId = new Map<string, ReportAnalyticsDocument>([
      [
        "post-1",
        analytics({
          postId: "post-1",
          title: "Feed A",
          postType: "feed",
          likes: 20,
          comments: 10,
          reach: 200,
          saves: 6,
          followerIncrease: 7,
        }),
      ],
    ]);
    const snapshotStatusMap = new Map<string, SnapshotStatus>([["post-1", "gold"]]);

    const result = buildPostDeepDive({
      analyticsByPostId,
      snapshotStatusMap,
    });

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0]).toMatchObject({
      id: "post-1",
      title: "Feed A",
      postType: "feed",
      analyticsSummary: {
        likes: 20,
        comments: 10,
        saves: 6,
        reach: 200,
        followerIncrease: 7,
        engagementRate: 0.15, // (20 + 10) / 200
      },
      snapshotReferences: [{ id: "post-1", status: "gold" }],
    });
  });

  test("returns engagementRate 0 when reach is 0", () => {
    const analyticsByPostId = new Map<string, ReportAnalyticsDocument>([
      [
        "post-1",
        analytics({
          postId: "post-1",
          likes: 100,
          comments: 20,
          reach: 0,
        }),
      ],
    ]);

    const result = buildPostDeepDive({
      analyticsByPostId,
      snapshotStatusMap: new Map<string, SnapshotStatus>(),
    });

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].analyticsSummary?.engagementRate).toBe(0);
    expect(result.posts[0].snapshotReferences).toEqual([]);
  });

  test("applies limit and keeps map insertion order", () => {
    const analyticsByPostId = new Map<string, ReportAnalyticsDocument>([
      ["p-1", analytics({ postId: "p-1", title: "First" })],
      ["p-2", analytics({ postId: "p-2", title: "Second" })],
      ["p-3", analytics({ postId: "p-3", title: "Third" })],
    ]);
    const snapshotStatusMap = new Map<string, SnapshotStatus>([
      ["p-1", "normal"],
      ["p-2", "negative"],
      ["p-3", "gold"],
    ]);

    const result = buildPostDeepDive({
      analyticsByPostId,
      snapshotStatusMap,
      limit: 2,
    });

    expect(result.posts).toHaveLength(2);
    expect(result.posts.map((p) => p.id)).toEqual(["p-1", "p-2"]);
    expect(result.posts[0].snapshotReferences?.[0]?.status).toBe("normal");
    expect(result.posts[1].snapshotReferences?.[0]?.status).toBe("negative");
  });
});
