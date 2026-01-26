/**
 * Instagram運用の成長率データ & 業界平均ベンチマーク【2026年版】
 * 出典: Thunderbit, Buffer Benchmarks 2026, Socialinsider 2026
 */

// アカウント規模の定義
export type AccountSize = "nano" | "micro" | "middle" | "mega";

// フォロワー成長率のベンチマーク（月間成長率）
export interface FollowerGrowthBenchmark {
  accountSize: AccountSize;
  label: string;
  minFollowers: number;
  maxFollowers: number;
  monthlyGrowthRate: {
    min: number; // 最小成長率（%）
    max: number; // 最大成長率（%）
  };
  annualGrowthRate: {
    min: number; // 年間最小成長率（%）
    max: number; // 年間最大成長率（%）
  };
}

export const FOLLOWER_GROWTH_BENCHMARKS: FollowerGrowthBenchmark[] = [
  {
    accountSize: "nano",
    label: "ナノ（1K未満）",
    minFollowers: 0,
    maxFollowers: 1000,
    monthlyGrowthRate: { min: 3.0, max: 5.0 }, // 保守的: 3.0%, 現実的: 5.0%, 挑戦的: 8.0%
    annualGrowthRate: { min: 18, max: 36 },
  },
  {
    accountSize: "micro",
    label: "マイクロ（1K~10K）",
    minFollowers: 1000,
    maxFollowers: 10000,
    monthlyGrowthRate: { min: 2.5, max: 4.0 }, // 保守的: 2.5%, 現実的: 4.0%, 挑戦的: 6.0%
    annualGrowthRate: { min: 18, max: 36 },
  },
  {
    accountSize: "middle",
    label: "ミドル（10K~100K）",
    minFollowers: 10000,
    maxFollowers: 100000,
    monthlyGrowthRate: { min: 1.5, max: 2.5 }, // 保守的: 1.5%, 現実的: 2.5%, 挑戦的: 4.0%
    annualGrowthRate: { min: 10, max: 18 },
  },
  {
    accountSize: "mega",
    label: "メガ（100K以上）",
    minFollowers: 100000,
    maxFollowers: Infinity,
    monthlyGrowthRate: { min: 1.0, max: 2.0 }, // 保守的: 1.0%, 現実的: 2.0%, 挑戦的: 3.0%
    annualGrowthRate: { min: 6, max: 12 },
  },
];

// 全体平均
export const AVERAGE_MONTHLY_GROWTH_RATE = 1.7; // 月間1.7%
export const AVERAGE_ANNUAL_GROWTH_RATE = 20; // 年間約20%

// エンゲージメント率の業界平均（投稿あたり）
export interface EngagementRateBenchmark {
  followerRange: {
    min: number;
    max: number;
  };
  engagementRate: {
    min: number; // 最小エンゲージメント率（%）
    max: number; // 最大エンゲージメント率（%）
  };
}

export const ENGAGEMENT_RATE_BENCHMARKS: EngagementRateBenchmark[] = [
  {
    followerRange: { min: 0, max: 1000 },
    engagementRate: { min: 3.0, max: 5.0 },
  },
  {
    followerRange: { min: 1000, max: 5000 },
    engagementRate: { min: 2.0, max: 4.0 },
  },
  {
    followerRange: { min: 5000, max: 10000 },
    engagementRate: { min: 1.5, max: 3.0 },
  },
  {
    followerRange: { min: 10000, max: 100000 },
    engagementRate: { min: 0.8, max: 1.5 },
  },
  {
    followerRange: { min: 100000, max: Infinity },
    engagementRate: { min: 0.5, max: 1.0 },
  },
];

// 全体平均エンゲージメント率
export const AVERAGE_ENGAGEMENT_RATE = 0.48; // 0.48~0.50%
export const GOOD_ENGAGEMENT_RATE = 1.02; // 優良アカウント: 1.02%以上
export const TOP_25_ENGAGEMENT_RATE = 3.0; // トップ25%: 3~6%

// 投稿タイプ別パフォーマンス（2026年）
export interface PostTypePerformance {
  postType: "reel" | "carousel" | "image";
  label: string;
  averageReachRate: number; // 平均リーチ率（%）
  engagementRate: {
    min: number;
    max: number;
  };
  growthEffectiveness: number; // 成長への効果（1~5）
}

export const POST_TYPE_PERFORMANCE: PostTypePerformance[] = [
  {
    postType: "reel",
    label: "リール（Reels）",
    averageReachRate: 30.81,
    engagementRate: { min: 1.2, max: 1.23 },
    growthEffectiveness: 5, // ★★★★★ 新規リーチ最強
  },
  {
    postType: "carousel",
    label: "カルーセル",
    averageReachRate: 14.45,
    engagementRate: { min: 1.2, max: 1.2 },
    growthEffectiveness: 4, // ★★★★☆ 保存率高い
  },
  {
    postType: "image",
    label: "画像投稿",
    averageReachRate: 13.14,
    engagementRate: { min: 0.6, max: 0.8 },
    growthEffectiveness: 2, // ★★☆☆☆ 既存フォロワー向け
  },
];

// 推奨投稿頻度（2026年）
export interface RecommendedPostFrequency {
  postType: "feed" | "reel" | "story";
  label: string;
  recommendedFrequency: {
    perWeek: {
      min: number;
      max: number;
    };
    perMonth: {
      min: number;
      max: number;
    };
  };
  notes: string;
}

export const RECOMMENDED_POST_FREQUENCY: RecommendedPostFrequency[] = [
  {
    postType: "feed",
    label: "フィード投稿",
    recommendedFrequency: {
      perWeek: { min: 3, max: 5 },
      perMonth: { min: 18, max: 20 },
    },
    notes: "2~3日に1回が目安",
  },
  {
    postType: "reel",
    label: "リール",
    recommendedFrequency: {
      perWeek: { min: 2, max: 4 },
      perMonth: { min: 8, max: 16 },
    },
    notes: "成長重視なら週4回以上",
  },
  {
    postType: "story",
    label: "ストーリーズ",
    recommendedFrequency: {
      perWeek: { min: 7, max: 21 },
      perMonth: { min: 30, max: 90 },
    },
    notes: "毎日1~3回",
  },
];

// アカウント規模を判定
export function getAccountSize(followers: number): AccountSize {
  if (followers < 1000) return "nano";
  if (followers < 10000) return "micro";
  if (followers < 100000) return "middle";
  return "mega";
}

// アカウント規模に応じた成長率を取得（2026年最新データ）
export function getGrowthRateForAccountSize(followers: number): {
  monthly: { min: number; max: number; conservative: number; realistic: number; aggressive: number };
  annual: { min: number; max: number };
} {
  const accountSize = getAccountSize(followers);
  const benchmark = FOLLOWER_GROWTH_BENCHMARKS.find(
    (b) => b.accountSize === accountSize
  );

  if (!benchmark) {
    // フォールバック: 全体平均
    const avg = AVERAGE_MONTHLY_GROWTH_RATE;
    return {
      monthly: { 
        min: avg, 
        max: avg,
        conservative: avg,
        realistic: avg,
        aggressive: avg * 1.6,
      },
      annual: { min: AVERAGE_ANNUAL_GROWTH_RATE, max: AVERAGE_ANNUAL_GROWTH_RATE },
    };
  }

  // 保守的/現実的/挑戦的の3段階を計算
  const conservative = benchmark.monthlyGrowthRate.min;
  const realistic = benchmark.monthlyGrowthRate.max;
  const aggressive = realistic * 1.6; // 現実的の1.6倍を挑戦的とする

  return {
    monthly: {
      min: conservative,
      max: aggressive,
      conservative,
      realistic,
      aggressive,
    },
    annual: benchmark.annualGrowthRate,
  };
}

// エンゲージメント率を取得
export function getEngagementRateForFollowers(followers: number): {
  min: number;
  max: number;
} {
  const benchmark = ENGAGEMENT_RATE_BENCHMARKS.find(
    (b) => followers >= b.followerRange.min && followers < b.followerRange.max
  );

  if (!benchmark) {
    // フォールバック: 全体平均
    return { min: AVERAGE_ENGAGEMENT_RATE, max: AVERAGE_ENGAGEMENT_RATE };
  }

  return benchmark.engagementRate;
}

// 投稿タイプ別のパフォーマンスを取得
export function getPostTypePerformance(postType: "reel" | "carousel" | "image"): PostTypePerformance | null {
  return POST_TYPE_PERFORMANCE.find((p) => p.postType === postType) || null;
}

// 必要月間成長率を計算
export function calculateRequiredMonthlyGrowthRate(
  currentFollowers: number,
  targetFollowers: number,
  months: number
): number {
  if (currentFollowers <= 0 || months <= 0) return 0;
  
  // 必要月間成長率 = ((目標フォロワー数 / 現在フォロワー数) ^ (1/期間月数) - 1) × 100
  const ratio = targetFollowers / currentFollowers;
  const monthlyRate = Math.pow(ratio, 1 / months) - 1;
  return monthlyRate * 100;
}

// 目標タイプ別の調整係数
export function getGoalTypeAdjustment(goalType?: string): number {
  const adjustments: Record<string, number> = {
    "フォロワーを増やす": 1.2,      // 業界平均の+20%
    "お客を増やす": 1.0,              // 業界平均
    "エンゲージメントを高める": 0.9,  // 業界平均の-10%（質重視）
    "商品・サービスを広める": 1.1,    // 業界平均の+10%
  };
  return adjustments[goalType || ""] || 1.0;
}

// 達成難易度を計算（計算根拠を透明化）
export function calculateFeasibilityScore(
  currentFollowers: number,
  targetFollowers: number,
  months: number,
  goalType?: string,
  postingFrequency?: number
): {
  requiredGrowthRate: number; // 必要月間成長率（%）
  industryAverage: number; // 業界平均成長率（%）
  adjustedAverage: number; // 調整済み業界平均成長率（%）
  difficultyRatio: number; // 達成難易度スコア（0-100+）
  level: "very_easy" | "easy" | "realistic" | "challenging" | "very_challenging" | "unrealistic";
  label: string;
  breakdown?: {
    userTargetRate: number;
    sizeCategory: string;
    industryBaseline: number;
    goalAdjustment: number;
    freqMultiplier: number;
    formula: string;
  };
} {
  const requiredGrowthRate = calculateRequiredMonthlyGrowthRate(
    currentFollowers,
    targetFollowers,
    months
  );

  const growthBenchmark = getGrowthRateForAccountSize(currentFollowers);
  const industryBaseline = growthBenchmark.monthly.realistic; // 現実的成長率を基準とする
  
  // 目標タイプによる調整
  const goalAdjustment = getGoalTypeAdjustment(goalType);
  
  // 投稿頻度による調整
  let freqMultiplier = 1.0;
  if (postingFrequency !== undefined) {
    if (postingFrequency >= 3 && postingFrequency <= 5) {
      freqMultiplier = 1.0;  // 最適範囲
    } else if (postingFrequency < 3) {
      freqMultiplier = 0.85;  // 低頻度ペナルティ
    } else {
      freqMultiplier = 0.95;  // 過剰投稿ペナルティ
    }
  }
  
  // 調整済み業界平均
  const adjustedAverage = industryBaseline * goalAdjustment * freqMultiplier;

  // 達成難易度スコア = (必要月間成長率 / 調整済み業界平均成長率) × 100
  const difficultyRatio = adjustedAverage > 0
    ? (requiredGrowthRate / adjustedAverage) * 100
    : 0;

  // 判定基準（2026年ベンチマークデータに基づく）
  // 達成難易度スコア	判定	ユーザーへの表示
  // 0~70	簡単	🟢 達成しやすい目標です
  // 71~110	現実的	🔵 現実的な目標です
  // 111~150	挑戦的	🟡 挑戦的な目標です
  // 151以上	非現実的	🔴 非常に困難な目標です
  let level: "very_easy" | "easy" | "realistic" | "challenging" | "very_challenging" | "unrealistic";
  let label: string;
  let color: string;
  let icon: string;

  if (difficultyRatio <= 70) {
    level = "easy";
    label = "達成しやすい目標です。余裕を持って取り組めます";
    color = "#4CAF50";
    icon = "🟢";
  } else if (difficultyRatio <= 110) {
    level = "realistic";
    label = "現実的な目標です。継続的な投稿で達成可能";
    color = "#2196F3";
    icon = "🔵";
  } else if (difficultyRatio <= 150) {
    level = "challenging";
    label = "挑戦的な目標です。高品質な投稿と積極的なエンゲージメントが必要";
    color = "#FF9800";
    icon = "🟡";
  } else {
    level = "unrealistic";
    label = "非常に困難な目標です。より現実的な代替案を検討してください";
    color = "#F44336";
    icon = "🔴";
  }

  // アカウント規模カテゴリを取得
  const accountSize = getAccountSize(currentFollowers);
  const sizeCategoryMap: Record<string, string> = {
    nano: "0-1000",
    micro: "1001-10000",
    middle: "10001-100000",
    mega: "100000+",
  };
  const sizeCategory = sizeCategoryMap[accountSize] || "不明";

  return {
    requiredGrowthRate,
    industryAverage: industryBaseline,
    adjustedAverage,
    difficultyRatio: Math.round(difficultyRatio),
    level,
    label,
    breakdown: {
      userTargetRate: requiredGrowthRate,
      sizeCategory,
      industryBaseline,
      goalAdjustment,
      freqMultiplier,
      formula: `(${requiredGrowthRate.toFixed(1)}% ÷ ${adjustedAverage.toFixed(1)}%) × 100 = ${Math.round(difficultyRatio)}`,
    },
  };
}

// 現実的な目標を提案
export function suggestRealisticTarget(
  currentFollowers: number,
  targetFollowers: number,
  months: number
): {
  adjustedTarget: number;
  adjustedMonths: number;
  optionA: { target: number; months: number; feasibility: string };
  optionB: { target: number; months: number; feasibility: string };
} {
  const growthBenchmark = getGrowthRateForAccountSize(currentFollowers);
  const maxMonthlyGrowthRate = growthBenchmark.monthly.max / 100; // パーセントを小数に変換

  // オプションA: 期間を延長
  const adjustedMonths = Math.ceil(
    Math.log(targetFollowers / currentFollowers) / Math.log(1 + maxMonthlyGrowthRate)
  );

  // オプションB: 目標を調整
  const adjustedTarget = Math.round(
    currentFollowers * Math.pow(1 + maxMonthlyGrowthRate, months)
  );

  // オプションAの達成可能性
  const optionAFeasibility = calculateFeasibilityScore(
    currentFollowers,
    targetFollowers,
    adjustedMonths
  );

  // オプションBの達成可能性
  const optionBFeasibility = calculateFeasibilityScore(
    currentFollowers,
    adjustedTarget,
    months
  );

  return {
    adjustedTarget,
    adjustedMonths,
    optionA: {
      target: targetFollowers,
      months: adjustedMonths,
      feasibility: optionAFeasibility.label,
    },
    optionB: {
      target: adjustedTarget,
      months: months,
      feasibility: optionBFeasibility.label,
    },
  };
}

// 目標達成に必要な投稿頻度を計算
export interface RecommendedPostingFrequency {
  feed: {
    perWeek: { min: number; max: number };
    description: string;
  };
  reel: {
    perWeek: { min: number; max: number };
    description: string;
  };
  story: {
    perWeek: { min: number; max: number };
    description: string;
  };
}

export function calculateRecommendedPostingFrequency(
  currentFollowers: number,
  targetFollowers: number,
  months: number,
  difficultyRatio: number
): RecommendedPostingFrequency {
  const baseFrequency = RECOMMENDED_POST_FREQUENCY;
  const feedBase = baseFrequency.find((f) => f.postType === "feed");
  const reelBase = baseFrequency.find((f) => f.postType === "reel");
  const storyBase = baseFrequency.find((f) => f.postType === "story");

  // 難易度に応じて投稿頻度を調整
  let feedMultiplier = 1.0;
  let reelMultiplier = 1.0;
  let storyMultiplier = 1.0;

  if (difficultyRatio < 50) {
    // 簡単すぎる: 標準的な投稿頻度
    feedMultiplier = 1.0;
    reelMultiplier = 1.0;
    storyMultiplier = 1.0;
  } else if (difficultyRatio < 100) {
    // 現実的: 標準的な投稿頻度
    feedMultiplier = 1.0;
    reelMultiplier = 1.0;
    storyMultiplier = 1.0;
  } else if (difficultyRatio < 150) {
    // やや厳しい: やや多めの投稿頻度
    feedMultiplier = 1.2;
    reelMultiplier = 1.3;
    storyMultiplier = 1.0; // ストーリーは既に毎日推奨
  } else if (difficultyRatio < 200) {
    // かなり厳しい: かなり多めの投稿頻度
    feedMultiplier = 1.5;
    reelMultiplier = 1.8;
    storyMultiplier = 1.0;
  } else {
    // 非現実的: 非常に多めの投稿頻度
    feedMultiplier = 2.0;
    reelMultiplier = 2.5;
    storyMultiplier = 1.0;
  }

  // フォロワー規模に応じた調整
  const accountSize = getAccountSize(currentFollowers);
  let sizeMultiplier = 1.0;
  if (accountSize === "nano" || accountSize === "micro") {
    // 小規模アカウントは成長しやすいので、やや控えめでもOK
    sizeMultiplier = 0.9;
  } else if (accountSize === "middle") {
    sizeMultiplier = 1.0;
  } else {
    // 大規模アカウントは成長が鈍化するので、やや多めに
    sizeMultiplier = 1.1;
  }

  const finalFeedMultiplier = feedMultiplier * sizeMultiplier;
  const finalReelMultiplier = reelMultiplier * sizeMultiplier;

  return {
    feed: {
      perWeek: {
        min: Math.round((feedBase?.recommendedFrequency.perWeek.min || 3) * finalFeedMultiplier),
        max: Math.round((feedBase?.recommendedFrequency.perWeek.max || 5) * finalFeedMultiplier),
      },
      description: difficultyRatio < 150 
        ? "週3〜4回の投稿"
        : difficultyRatio < 200
        ? "週4〜6回の投稿"
        : "週6回以上の投稿",
    },
    reel: {
      perWeek: {
        min: Math.round((reelBase?.recommendedFrequency.perWeek.min || 2) * finalReelMultiplier),
        max: Math.round((reelBase?.recommendedFrequency.perWeek.max || 4) * finalReelMultiplier),
      },
      description: difficultyRatio < 150
        ? "リール投稿を週1回"
        : difficultyRatio < 200
        ? "リール投稿を週2〜3回"
        : "リール投稿を週3回以上",
    },
    story: {
      perWeek: {
        min: storyBase?.recommendedFrequency.perWeek.min || 7,
        max: storyBase?.recommendedFrequency.perWeek.max || 21,
      },
      description: "ストーリーズを毎日",
    },
  };
}

