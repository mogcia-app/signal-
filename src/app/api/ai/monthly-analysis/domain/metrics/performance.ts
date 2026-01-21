/**
 * Domain層: パフォーマンス評価関連の純粋計算
 * 副作用なしの数値計算関数
 */

import type { AnalyticsRecord, FeedbackAggregate } from "./engagement";
import { calculateEngagementRate, computeBaselineMetrics, deriveSentimentScore } from "./engagement";
import type { PostPerformanceTag, PostLearningSignal } from "../../types";

// ヘルパー関数（将来utils層に移動予定）
function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (typeof value === "string") {
    return value
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean) as unknown as T[];
  }
  return [];
}

/**
 * 再現可能性スコアを計算
 * 次も再現できる行動・構造があったかを評価
 */
export function calculateReproducibilityScore(
  record: AnalyticsRecord,
  aggregate: FeedbackAggregate | undefined,
  allRecords: AnalyticsRecord[]
): number {
  let score = 0;
  const factors: string[] = [];

  // 1. フィードバックで「再現したい」という意見があるか
  if (aggregate) {
    const positiveRatio = aggregate.positiveWeight / Math.max(1, aggregate.positiveWeight + aggregate.negativeWeight);
    if (positiveRatio >= 0.7) {
      score += 0.3;
      factors.push("フィードバックで再現希望が高い");
    }
    // コメントに「また見たい」「参考になる」などのキーワードがあるか
    const reproductionKeywords = ["また", "参考", "真似", "活用", "使いたい", "良い", "素晴らしい"];
    const hasReproductionComment = aggregate.comments.some((comment) =>
      reproductionKeywords.some((keyword) => comment.includes(keyword))
    );
    if (hasReproductionComment) {
      score += 0.2;
      factors.push("再現を希望するコメントがある");
    }
  }

  // 2. 類似投稿との一貫性（同じカテゴリ、同じハッシュタグパターンで成功しているか）
  const sameCategoryRecords = allRecords.filter(
    (r) => r.category === record.category && r.id !== record.id
  );
  if (sameCategoryRecords.length > 0) {
    const avgER = sameCategoryRecords.reduce((sum, r) => {
      const er = calculateEngagementRate(r);
      return sum + er;
    }, 0) / sameCategoryRecords.length;
    const currentER = calculateEngagementRate(record);
    if (currentER >= avgER * 0.9) {
      // 同じカテゴリで平均的な成果を出している = 再現可能なパターン
      score += 0.2;
      factors.push("同じ投稿タイプで一貫した成果");
    }
  }

  // 3. 特定の構造が識別できるか（ハッシュタグパターン、テーマなど）
  const hashtags = ensureArray<string>(record.hashtags);
  if (hashtags.length >= 3) {
    // ハッシュタグが適切に設定されている = 構造化されている
    score += 0.15;
    factors.push("構造化されたハッシュタグパターン");
  }

  // 4. タイトルやコンテンツが明確なテーマを持っているか
  if (record.title && record.title.length >= 10) {
    score += 0.15;
    factors.push("明確なテーマ・構造");
  }

  return Math.min(1, score);
}

/**
 * 改善可能性スコアを計算
 * 改善すれば変えられる要因が特定できたかを評価
 */
export function calculateImprovabilityScore(
  record: AnalyticsRecord,
  aggregate: FeedbackAggregate | undefined,
  baseline: ReturnType<typeof computeBaselineMetrics>
): number {
  let score = 0;
  const factors: string[] = [];

  // 1. フィードバックで改善点が指摘されているか
  if (aggregate) {
    const negativeRatio = aggregate.negativeWeight / Math.max(1, aggregate.positiveWeight + aggregate.negativeWeight);
    if (negativeRatio >= 0.3) {
      score += 0.3;
      factors.push("フィードバックで改善点が指摘されている");
    }
    // コメントに改善を促すキーワードがあるか
    const improvementKeywords = ["改善", "もっと", "違う", "変えて", "違和感", "分かりにくい"];
    const hasImprovementComment = aggregate.comments.some((comment) =>
      improvementKeywords.some((keyword) => comment.includes(keyword))
    );
    if (hasImprovementComment) {
      score += 0.2;
      factors.push("改善を促すコメントがある");
    }
  }

  // 2. 数値が低いが、改善可能な要因が特定できるか
  const engagementRate = calculateEngagementRate(record);
  const isBelowAverage = baseline.avgEngagement > 0 && engagementRate < baseline.avgEngagement * 0.8;
  
  if (isBelowAverage) {
    // 改善可能な要因をチェック
    const hashtags = ensureArray<string>(record.hashtags);
    if (hashtags.length < 3) {
      score += 0.2;
      factors.push("ハッシュタグが少ない（改善可能）");
    }
    if (!record.title || record.title.length < 10) {
      score += 0.15;
      factors.push("タイトルが不明確（改善可能）");
    }
    if (record.category === "feed" && engagementRate < baseline.avgEngagement * 0.7) {
      score += 0.15;
      factors.push("投稿タイプの見直しが必要");
    }
  }

  // 3. 構造的な問題が特定できるか
  const hashtags = ensureArray<string>(record.hashtags);
  if (hashtags.length === 0) {
    score += 0.2;
    factors.push("ハッシュタグ未設定（改善可能）");
  }

  return Math.min(1, score);
}

/**
 * 投稿パフォーマンスを評価
 */
export function evaluatePostPerformance(
  record: AnalyticsRecord,
  baseline: ReturnType<typeof computeBaselineMetrics>,
  aggregate: FeedbackAggregate | undefined,
  allRecords: AnalyticsRecord[] = []
): PostLearningSignal | null {
  const engagementRate = calculateEngagementRate(record);
  
  // 従来のKPIスコア（参考用に保持）
  const components: number[] = [];
  if (baseline.avgReach > 0) {
    components.push(record.reach / baseline.avgReach);
  } else if (record.reach > 0) {
    components.push(1);
  }
  if (baseline.avgEngagement > 0) {
    components.push(engagementRate / baseline.avgEngagement);
  } else if (engagementRate > 0) {
    components.push(1);
  }
  if (baseline.avgFollowerIncrease > 0 && record.followerIncrease >= 0) {
    components.push(
      record.followerIncrease === 0 && baseline.avgFollowerIncrease === 0
        ? 1
        : (record.followerIncrease + 0.01) / (baseline.avgFollowerIncrease + 0.01)
    );
  }
  const kpiScore =
    components.length > 0
      ? Number(
          Math.max(
            0,
            Math.min(3, components.reduce((sum, value) => sum + value, 0) / components.length)
          ).toFixed(2)
        )
      : 0;

  // 新しい評価ロジック：再現可能性と改善可能性
  const reproducibilityScore = calculateReproducibilityScore(record, aggregate, allRecords);
  const improvabilityScore = calculateImprovabilityScore(record, aggregate, baseline);
  const sentiment = deriveSentimentScore(aggregate, record.sentiment);

  // 新しい定義に基づくタグ付け
  let tag: PostPerformanceTag = "neutral";

  // 「良かった（gold）」: 再現可能なパターンがある（数値が低くてもOK）
  if (reproducibilityScore >= 0.5) {
    tag = "gold";
  }
  // 「ダメだった（red）」: 改善可能な要因が特定できる（数値が高くてもOK）
  else if (improvabilityScore >= 0.5) {
    tag = "red";
  }
  // 従来のロジックも参考として使用（再現可能性・改善可能性が低い場合）
  else {
    const highKpi =
      kpiScore >= 1.1 ||
      (baseline.avgEngagement > 0 && engagementRate >= baseline.avgEngagement * 1.3) ||
      (baseline.avgReach > 0 && record.reach >= baseline.avgReach * 1.3) ||
      record.followerIncrease > 0;
    const lowKpi =
      (kpiScore > 0 && kpiScore <= 0.85) ||
      (baseline.avgEngagement > 0 && engagementRate <= baseline.avgEngagement * 0.7) ||
      (baseline.avgReach > 0 && record.reach <= baseline.avgReach * 0.7);

    if (sentiment.score >= 0.65 && highKpi) {
      tag = "gold";
    } else if (sentiment.score >= 0.65 && !highKpi) {
      tag = "gray";
    } else if (sentiment.score <= 0.4 && lowKpi) {
      tag = "red";
    }
  }

  const hashtags = ensureArray<string>(record.hashtags)
    .map((tagStr) => tagStr.replace(/^#+/, "").trim())
    .filter((tagStr) => tagStr.length > 0)
    .slice(0, 10);

  return {
    postId: record.postId ?? record.id,
    title: record.title || "タイトル未設定",
    category: record.category || "feed",
    hashtags,
    metrics: {
      reach: record.reach,
      saves: record.saves ?? 0,
      likes: record.likes ?? 0,
      comments: record.comments ?? 0,
      shares: record.shares ?? 0,
      savesRate: record.reach > 0 ? (record.saves ?? 0) / record.reach : 0,
      commentsRate: record.reach > 0 ? (record.comments ?? 0) / record.reach : 0,
      likesRate: record.reach > 0 ? (record.likes ?? 0) / record.reach : 0,
      reachToFollowerRatio: record.followerIncrease !== undefined && record.followerIncrease !== null
        ? record.reach / Math.max(1, record.followerIncrease + 1)
        : 0,
      velocityScore: 0,
      totalEngagement: (record.likes ?? 0) + (record.comments ?? 0) + (record.shares ?? 0) + (record.saves ?? 0),
      earlyEngagement: null,
      watchTimeSeconds: null,
      linkClicks: null,
      impressions: null,
    },
    comparisons: {
      reachDiff: 0,
      engagementRateDiff: 0,
      savesRateDiff: 0,
      commentsRateDiff: 0,
      clusterPerformanceDiff: 0,
    },
    significance: {
      reach: "neutral",
      engagement: "neutral",
      savesRate: "neutral",
      commentsRate: "neutral",
    },
    cluster: {
      id: record.category || "cluster-default",
      label: record.category || "投稿クラスタ",
      centroidDistance: 0,
      baselinePerformance: 0,
      similarPosts: [],
    },
    engagementRate,
    reach: record.reach,
    followerIncrease: record.followerIncrease,
    kpiScore,
    sentimentScore: Number(sentiment.score.toFixed(2)),
    sentimentLabel: sentiment.label,
    tag,
    feedbackCounts: sentiment.counts,
  };
}

/**
 * 投稿パフォーマンススコアを計算
 */
export function calculatePostPerformanceScore(metrics: {
  engagementRate: number;
  reach: number;
  followerIncrease: number;
  baseline: {
    avgEngagement: number;
    avgReach: number;
    avgFollowerIncrease: number;
  };
}): number {
  const { engagementRate, reach, followerIncrease, baseline } = metrics;
  const components: number[] = [];

  if (baseline.avgReach > 0) {
    components.push(reach / baseline.avgReach);
  } else if (reach > 0) {
    components.push(1);
  }

  if (baseline.avgEngagement > 0) {
    components.push(engagementRate / baseline.avgEngagement);
  } else if (engagementRate > 0) {
    components.push(1);
  }

  if (baseline.avgFollowerIncrease > 0 && followerIncrease >= 0) {
    components.push(
      followerIncrease === 0 && baseline.avgFollowerIncrease === 0
        ? 1
        : (followerIncrease + 0.01) / (baseline.avgFollowerIncrease + 0.01)
    );
  }

  return components.length > 0
    ? Number(
        Math.max(
          0,
          Math.min(3, components.reduce((sum, value) => sum + value, 0) / components.length)
        ).toFixed(2)
      )
    : 0;
}

