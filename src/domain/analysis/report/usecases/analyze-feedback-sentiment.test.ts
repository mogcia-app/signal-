import { analyzeFeedbackSentiment } from "@/domain/analysis/report/usecases/analyze-feedback-sentiment";
import type { ReportFeedbackDocument, SnapshotStatus } from "@/repositories/types";

function d(value: string): Date {
  return new Date(value);
}

describe("analyzeFeedbackSentiment", () => {
  const startDate = d("2026-02-01T00:00:00.000Z");
  const endDate = d("2026-03-01T00:00:00.000Z");

  test("returns null when no entry is in period", () => {
    const entries: ReportFeedbackDocument[] = [
      {
        id: "f-1",
        postId: "p-1",
        sentiment: "positive",
        goalAchievementProspect: null,
        comment: "good",
        createdAt: d("2026-01-31T23:59:59.000Z"),
      },
      {
        id: "f-2",
        postId: "p-1",
        sentiment: "negative",
        goalAchievementProspect: null,
        comment: "bad",
        createdAt: null,
      },
    ];

    const result = analyzeFeedbackSentiment({
      entries,
      postsMap: new Map([["p-1", { id: "p-1", title: "post", postType: "feed" }]]),
      snapshotStatusMap: new Map<string, SnapshotStatus>(),
      startDate,
      endDate,
    });

    expect(result).toBeNull();
  });

  test("prioritizes goalAchievementProspect over sentiment and aggregates counts", () => {
    const entries: ReportFeedbackDocument[] = [
      {
        id: "f-1",
        postId: "p-1",
        sentiment: "negative",
        goalAchievementProspect: "high",
        comment: "great",
        createdAt: d("2026-02-10T10:00:00.000Z"),
      },
      {
        id: "f-2",
        postId: "p-1",
        sentiment: "positive",
        goalAchievementProspect: "low",
        comment: "needs work",
        createdAt: d("2026-02-11T10:00:00.000Z"),
      },
      {
        id: "f-3",
        postId: "p-2",
        sentiment: null,
        goalAchievementProspect: null,
        comment: "  ",
        createdAt: d("2026-02-12T10:00:00.000Z"),
      },
    ];

    const result = analyzeFeedbackSentiment({
      entries,
      postsMap: new Map([
        ["p-1", { id: "p-1", title: "Post 1", postType: "feed" }],
        ["p-2", { id: "p-2", title: "Post 2", postType: "reel" }],
      ]),
      snapshotStatusMap: new Map<string, SnapshotStatus>([
        ["p-1", "gold"],
        ["p-2", "negative"],
      ]),
      startDate,
      endDate,
    });

    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      total: 3,
      positive: 1,
      negative: 1,
      neutral: 1,
      positiveRate: 1 / 3,
      withCommentCount: 2,
    });
    expect(result?.commentHighlights?.positive[0]).toMatchObject({
      postId: "p-1",
      title: "Post 1",
      comment: "great",
      sentiment: "positive",
      postType: "feed",
    });
    expect(result?.commentHighlights?.negative[0]).toMatchObject({
      postId: "p-1",
      title: "Post 1",
      comment: "needs work",
      sentiment: "negative",
      postType: "feed",
    });
  });

  test("sorts posts by score desc then total desc and keeps top 6", () => {
    const entries: ReportFeedbackDocument[] = [
      { id: "1", postId: "a", sentiment: "positive", goalAchievementProspect: null, comment: "ok", createdAt: d("2026-02-01T00:00:00.000Z") },
      { id: "2", postId: "a", sentiment: "positive", goalAchievementProspect: null, comment: "ok", createdAt: d("2026-02-02T00:00:00.000Z") },
      { id: "3", postId: "b", sentiment: "positive", goalAchievementProspect: null, comment: "ok", createdAt: d("2026-02-03T00:00:00.000Z") },
      { id: "4", postId: "b", sentiment: "negative", goalAchievementProspect: null, comment: "ok", createdAt: d("2026-02-04T00:00:00.000Z") },
      { id: "5", postId: "c", sentiment: "neutral", goalAchievementProspect: null, comment: "ok", createdAt: d("2026-02-05T00:00:00.000Z") },
      { id: "6", postId: "d", sentiment: "positive", goalAchievementProspect: null, comment: "ok", createdAt: d("2026-02-06T00:00:00.000Z") },
      { id: "7", postId: "e", sentiment: "negative", goalAchievementProspect: null, comment: "ok", createdAt: d("2026-02-07T00:00:00.000Z") },
      { id: "8", postId: "f", sentiment: "positive", goalAchievementProspect: null, comment: "ok", createdAt: d("2026-02-08T00:00:00.000Z") },
      { id: "9", postId: "g", sentiment: "negative", goalAchievementProspect: null, comment: "ok", createdAt: d("2026-02-09T00:00:00.000Z") },
    ];

    const postsMap = new Map(
      ["a", "b", "c", "d", "e", "f", "g"].map((id) => [
        id,
        { id, title: `Post ${id.toUpperCase()}`, postType: "feed" as const },
      ])
    );
    const snapshotStatusMap = new Map<string, SnapshotStatus>([
      ["a", "gold"],
      ["b", "negative"],
      ["c", "normal"],
      ["d", "gold"],
      ["e", "negative"],
      ["f", "normal"],
      ["g", "normal"],
    ]);

    const result = analyzeFeedbackSentiment({
      entries,
      postsMap,
      snapshotStatusMap,
      startDate,
      endDate,
    });

    expect(result).not.toBeNull();
    expect(result?.posts).toHaveLength(6);
    // score: a=2, d=1, f=1, b=0(total2), c=0(total1), e=-1, g=-1 => top6 excludes g
    expect(result?.posts?.map((p) => p.postId)).toEqual(["a", "d", "f", "b", "c", "e"]);
    expect(result?.posts?.find((p) => p.postId === "a")).toMatchObject({
      status: "gold",
      score: 2,
      total: 2,
    });
  });
});
