import type { FeedbackSentimentSummary } from "@/types/report";
import type { ReportFeedbackDocument, SnapshotStatus } from "@/repositories/types";

export interface FeedbackPostMeta {
  id: string;
  title: string;
  postType: "feed" | "reel" | "story";
}

interface AnalyzeFeedbackSentimentInput {
  entries: ReportFeedbackDocument[];
  postsMap: Map<string, FeedbackPostMeta>;
  snapshotStatusMap: Map<string, SnapshotStatus>;
  startDate: Date;
  endDate: Date;
}

interface CommentPayload {
  postId: string;
  title: string;
  comment: string;
  sentiment: "positive" | "negative" | "neutral";
  createdAt?: string;
  postType?: "feed" | "reel" | "story";
}

function resolveSentiment(entry: ReportFeedbackDocument): "positive" | "negative" | "neutral" {
  if (entry.goalAchievementProspect === "high") {
    return "positive";
  }
  if (entry.goalAchievementProspect === "low") {
    return "negative";
  }
  if (entry.sentiment) {
    return entry.sentiment;
  }
  return "neutral";
}

export function analyzeFeedbackSentiment(input: AnalyzeFeedbackSentimentInput): FeedbackSentimentSummary | null {
  const filtered = input.entries
    .map((entry) => ({ ...entry, sentiment: resolveSentiment(entry) }))
    .filter((entry) => {
      if (!entry.createdAt) {
        return false;
      }
      return entry.createdAt >= input.startDate && entry.createdAt < input.endDate;
    });

  if (filtered.length === 0) {
    return null;
  }

  const counts = {
    positive: 0,
    negative: 0,
    neutral: 0,
  };

  let withCommentCount = 0;
  const positiveComments: CommentPayload[] = [];
  const negativeComments: CommentPayload[] = [];
  const postStats = new Map<
    string,
    {
      postId: string;
      title: string;
      postType: "feed" | "reel" | "story";
      total: number;
      positive: number;
      negative: number;
      neutral: number;
      score: number;
      status: SnapshotStatus;
    }
  >();

  filtered.forEach((entry) => {
    counts[entry.sentiment] += 1;

    const postMeta = entry.postId ? input.postsMap.get(entry.postId) : null;
    const comment = entry.comment.trim();

    if (comment) {
      withCommentCount += 1;
      const payload: CommentPayload = {
        postId: entry.postId || "",
        title: postMeta?.title || "投稿",
        comment,
        sentiment: entry.sentiment,
        createdAt: entry.createdAt?.toISOString(),
        postType: postMeta?.postType,
      };
      if (entry.sentiment === "positive") {
        positiveComments.push(payload);
      }
      if (entry.sentiment === "negative") {
        negativeComments.push(payload);
      }
    }

    if (!entry.postId) {
      return;
    }

    if (!postStats.has(entry.postId)) {
      postStats.set(entry.postId, {
        postId: entry.postId,
        title: postMeta?.title || "投稿",
        postType: postMeta?.postType || "feed",
        total: 0,
        positive: 0,
        negative: 0,
        neutral: 0,
        score: 0,
        status: input.snapshotStatusMap.get(entry.postId) || "normal",
      });
    }

    const stat = postStats.get(entry.postId)!;
    stat.total += 1;
    stat[entry.sentiment] += 1;
    stat.score = stat.positive - stat.negative;
  });

  const total = counts.positive + counts.negative + counts.neutral;
  if (total === 0) {
    return null;
  }

  return {
    total,
    positive: counts.positive,
    negative: counts.negative,
    neutral: counts.neutral,
    positiveRate: counts.positive / total,
    withCommentCount,
    commentHighlights: {
      positive: positiveComments
        .sort(
          (a: CommentPayload, b: CommentPayload) =>
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        )
        .slice(0, 3),
      negative: negativeComments
        .sort(
          (a: CommentPayload, b: CommentPayload) =>
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        )
        .slice(0, 3),
    },
    posts: Array.from(postStats.values())
      .sort((a, b) => {
        if (b.score === a.score) {
          return b.total - a.total;
        }
        return b.score - a.score;
      })
      .slice(0, 6),
  };
}
