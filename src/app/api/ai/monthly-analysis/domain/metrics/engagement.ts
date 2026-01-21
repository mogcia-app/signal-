/**
 * Domain層: エンゲージメント関連の純粋計算
 * 副作用なしの数値計算関数
 */

import * as admin from "firebase-admin";

// 型定義
export interface AnalyticsRecord {
  id: string;
  postId: string | null;
  title: string;
  content: string;
  hashtags: string[];
  category: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  followerIncrease: number;
  publishedAt: Date | null;
  sentiment?: "satisfied" | "dissatisfied" | null;
  sentimentMemo?: string;
}

export interface FeedbackAggregate {
  postId: string;
  positive: number;
  negative: number;
  neutral: number;
  positiveWeight: number;
  negativeWeight: number;
  comments: string[];
}

/**
 * エンゲージメント率を計算
 */
export function calculateEngagementRate(record: AnalyticsRecord): number {
  const totalEngagement =
    (record.likes || 0) + (record.comments || 0) + (record.shares || 0) + (record.saves || 0);
  if (!record.reach || record.reach <= 0) {
    return Number(totalEngagement.toFixed(2));
  }
  return Number(((totalEngagement / record.reach) * 100).toFixed(2));
}

/**
 * ベースラインメトリクスを計算
 */
export function computeBaselineMetrics(records: AnalyticsRecord[]) {
  const engagementValues = records
    .map((record) => calculateEngagementRate(record))
    .filter((value) => Number.isFinite(value) && value > 0);
  const reachValues = records
    .map((record) => record.reach)
    .filter((value) => Number.isFinite(value) && value > 0);
  const followerValues = records
    .map((record) => record.followerIncrease)
    .filter((value) => Number.isFinite(value) && value > 0);

  const average = (values: number[], fallback: number) =>
    values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;

  return {
    avgEngagement: average(engagementValues, 0),
    avgReach: average(reachValues, 0),
    avgFollowerIncrease: average(followerValues, 0),
  };
}

/**
 * フィードバックデータを集計
 */
export function aggregateFeedbackData(
  feedbackSnapshot: admin.firestore.QuerySnapshot<admin.firestore.DocumentData>
): Map<string, FeedbackAggregate> {
  const aggregates = new Map<string, FeedbackAggregate>();

  feedbackSnapshot.forEach((doc) => {
    const data = doc.data() || {};
    const postId = typeof data.postId === "string" && data.postId.length > 0 ? data.postId : null;
    if (!postId) {
      return;
    }
    const sentiment = typeof data.sentiment === "string" ? data.sentiment : "neutral";
    const weight = typeof data.weight === "number" ? data.weight : 1;
    const comment = typeof data.comment === "string" ? data.comment.trim() : "";

    const aggregate =
      aggregates.get(postId) ||
      ({
        postId,
        positive: 0,
        negative: 0,
        neutral: 0,
        positiveWeight: 0,
        negativeWeight: 0,
        comments: [],
      } as FeedbackAggregate);

    if (sentiment === "positive") {
      aggregate.positive += 1;
      aggregate.positiveWeight += weight;
    } else if (sentiment === "negative") {
      aggregate.negative += 1;
      aggregate.negativeWeight += weight;
    } else {
      aggregate.neutral += 1;
    }

    if (comment.length > 0) {
      aggregate.comments.push(comment);
    }

    aggregates.set(postId, aggregate);
  });

  return aggregates;
}

/**
 * センチメントスコアを計算
 */
export function deriveSentimentScore(
  aggregate: FeedbackAggregate | undefined,
  analyticsSentiment: AnalyticsRecord["sentiment"]
): {
  score: number;
  label: "positive" | "negative" | "neutral";
  counts: {
    positive: number;
    negative: number;
    neutral: number;
  };
} {
  let positiveWeight = aggregate?.positiveWeight ?? 0;
  let negativeWeight = aggregate?.negativeWeight ?? 0;
  let neutralWeight = aggregate?.neutral ?? 0;
  let positiveCount = aggregate?.positive ?? 0;
  let negativeCount = aggregate?.negative ?? 0;
  let neutralCount = aggregate?.neutral ?? 0;

  if (analyticsSentiment === "satisfied") {
    positiveWeight += 1;
    positiveCount += 1;
  } else if (analyticsSentiment === "dissatisfied") {
    negativeWeight += 1;
    negativeCount += 1;
  } else if (!aggregate) {
    neutralWeight += 1;
    neutralCount += 1;
  }

  const totalWeight = positiveWeight + negativeWeight + neutralWeight;
  const score = totalWeight > 0 ? positiveWeight / totalWeight : 0.5;

  let label: "positive" | "negative" | "neutral" = "neutral";
  if (score >= 0.6) {
    label = "positive";
  } else if (score <= 0.4) {
    label = "negative";
  }

  return {
    score,
    label,
    counts: {
      positive: positiveCount,
      negative: negativeCount,
      neutral: neutralCount,
    },
  };
}

