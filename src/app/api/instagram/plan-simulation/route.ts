import { NextRequest, NextResponse } from "next/server";
import { PlanFormData, SimulationResult } from "../../../instagram/plan/types/plan";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";

/**
 * 業界平均成長率を取得（フォロワー数別）
 */
function getIndustryAverage(currentFollowers: number): { min: number; max: number; average: number } {
  if (currentFollowers < 1000) {
    return { min: 2.0, max: 3.0, average: 2.5 };
  } else if (currentFollowers < 10000) {
    return { min: 1.5, max: 2.5, average: 2.0 };
  } else if (currentFollowers < 100000) {
    return { min: 1.0, max: 1.5, average: 1.2 };
  } else {
    return { min: 0.6, max: 1.0, average: 0.8 };
  }
}

/**
 * 必要月間成長率を計算
 * 計算式: ((目標フォロワー数 / 現在フォロワー数) ^ (1 / 期間月数) - 1) × 100
 */
function calculateRequiredMonthlyGrowthRate(
  currentFollowers: number,
  targetFollowers: number,
  periodMonths: number
): number {
  if (currentFollowers <= 0 || periodMonths <= 0) {
    return 0;
  }
  
  const ratio = targetFollowers / currentFollowers;
  const monthlyRate = Math.pow(ratio, 1 / periodMonths) - 1;
  return monthlyRate * 100;
}

/**
 * 達成難易度スコアを計算
 * 計算式: (必要月間成長率 / 業界平均成長率) × 100
 */
function calculateDifficultyScore(
  requiredGrowthRate: number,
  industryAverage: number
): number {
  if (industryAverage <= 0) {
    return 0;
  }
  return (requiredGrowthRate / industryAverage) * 100;
}

/**
 * 難易度レベルを判定
 */
function getDifficultyLevel(score: number): {
  level: "realistic" | "challenging" | "very-challenging" | "unrealistic";
  message: string;
  color: "green" | "yellow" | "orange" | "red";
} {
  if (score < 80) {
    return {
      level: "realistic",
      message: "現実的な目標です。計画通りに進めれば達成可能です。",
      color: "green",
    };
  } else if (score < 110) {
    return {
      level: "challenging",
      message: "挑戦的な目標です。努力と工夫が必要です。",
      color: "yellow",
    };
  } else if (score < 150) {
    return {
      level: "very-challenging",
      message: "非常に挑戦的な目標です。高い努力と戦略が必要です。",
      color: "orange",
    };
  } else {
    return {
      level: "unrealistic",
      message: "非現実的な目標です。目標を見直すことをお勧めします。",
      color: "red",
    };
  }
}

/**
 * 週次予測を計算
 */
function calculateWeeklyPredictions(
  currentFollowers: number,
  targetFollowers: number,
  periodMonths: number
): number[] {
  const weeks = periodMonths * 4;
  const totalGrowth = targetFollowers - currentFollowers;
  const weeklyGrowth = totalGrowth / weeks;
  
  const predictions: number[] = [];
  for (let i = 0; i < weeks; i++) {
    predictions.push(Math.round(currentFollowers + weeklyGrowth * (i + 1)));
  }
  
  return predictions;
}

/**
 * 推定所要時間を計算
 */
function calculateEstimatedTime(
  weeklyFeedPosts: number,
  weeklyReelPosts: number,
  weeklyStoryPosts: number
): {
  totalMinutes: number;
  dailyMinutes: number;
  breakdown: {
    feed: number;
    reel: number;
    story: number;
    comments: number;
  };
} {
  const FEED_MINUTES_PER_POST = 30;
  const REEL_MINUTES_PER_POST = 60;
  const STORY_MINUTES_PER_POST = 5;
  const COMMENTS_MINUTES_PER_WEEK = 30;

  const feedMinutes = weeklyFeedPosts * FEED_MINUTES_PER_POST;
  const reelMinutes = weeklyReelPosts * REEL_MINUTES_PER_POST;
  const storyMinutes = weeklyStoryPosts * STORY_MINUTES_PER_POST;
  const totalMinutes = feedMinutes + reelMinutes + storyMinutes + COMMENTS_MINUTES_PER_WEEK;
  const dailyMinutes = Math.round((totalMinutes / 7) * 10) / 10;

  return {
    totalMinutes,
    dailyMinutes,
    breakdown: {
      feed: feedMinutes,
      reel: reelMinutes,
      story: storyMinutes,
      comments: COMMENTS_MINUTES_PER_WEEK,
    },
  };
}

/**
 * 必要な取り組みを生成
 */
function generateRequiredActions(
  level: "realistic" | "challenging" | "very-challenging" | "unrealistic",
  weeklyFeedPosts: number,
  weeklyReelPosts: number,
  weeklyStoryPosts: number
): string[] {
  const actions: string[] = [];

  if (weeklyFeedPosts > 0) {
    actions.push(`週${weeklyFeedPosts}回のフィード投稿を継続する`);
  }
  if (weeklyReelPosts > 0) {
    actions.push(`週${weeklyReelPosts}回のリール投稿を継続する`);
  }
  if (weeklyStoryPosts > 0) {
    actions.push(`週${weeklyStoryPosts}回のストーリーズ投稿を継続する`);
  }

  if (level === "challenging" || level === "very-challenging" || level === "unrealistic") {
    actions.push("ハッシュタグ戦略を見直す");
    actions.push("投稿時間を最適化する");
    actions.push("エンゲージメント率を向上させる");
  }

  if (level === "very-challenging" || level === "unrealistic") {
    actions.push("コンテンツの質を大幅に向上させる");
    actions.push("コラボレーションやインフルエンサーマーケティングを検討する");
  }

  return actions;
}

/**
 * 代替案を生成
 */
function generateAlternativePlans(
  currentFollowers: number,
  periodMonths: number
): Array<{
  id: string;
  name: string;
  targetFollowers: number;
  periodMonths: number;
  weeklyFeedPosts: number;
  weeklyReelPosts: number;
  weeklyStoryPosts: number;
  description: string;
}> {
  const growthRate = 0.02; // 月2%成長
  const targetFollowers1 = Math.round(currentFollowers * Math.pow(1 + growthRate, periodMonths));
  const targetFollowers2 = Math.round(currentFollowers * Math.pow(1 + growthRate * 1.5, periodMonths));
  const targetFollowers3 = Math.round(currentFollowers * Math.pow(1 + growthRate * 2, periodMonths));

  return [
    {
      id: "alt-1",
      name: "現実的な目標案",
      targetFollowers: targetFollowers1,
      periodMonths,
      weeklyFeedPosts: 3,
      weeklyReelPosts: 1,
      weeklyStoryPosts: 5,
      description: "無理なく続けられるペースで、着実に成長を目指します。",
    },
    {
      id: "alt-2",
      name: "バランス型目標案",
      targetFollowers: targetFollowers2,
      periodMonths,
      weeklyFeedPosts: 4,
      weeklyReelPosts: 2,
      weeklyStoryPosts: 7,
      description: "投稿頻度を上げて、より積極的に成長を目指します。",
    },
    {
      id: "alt-3",
      name: "積極的な目標案",
      targetFollowers: targetFollowers3,
      periodMonths,
      weeklyFeedPosts: 5,
      weeklyReelPosts: 3,
      weeklyStoryPosts: 7,
      description: "高い頻度で投稿し、最大限の成長を目指します。",
    },
  ];
}

/**
 * シミュレーション結果を計算
 */
function calculateSimulation(formData: PlanFormData): SimulationResult {
  const { currentFollowers, targetFollowers, periodMonths, weeklyFeedPosts, weeklyReelPosts, weeklyStoryPosts } = formData;
  
  // 必要月間成長率を計算
  const requiredGrowthRate = calculateRequiredMonthlyGrowthRate(
    currentFollowers,
    targetFollowers,
    periodMonths
  );
  
  // 業界平均を取得
  const industryAvg = getIndustryAverage(currentFollowers);
  
  // 達成難易度スコアを計算
  const difficultyScore = calculateDifficultyScore(requiredGrowthRate, industryAvg.average);
  
  // 難易度レベルを判定
  const { level, message, color } = getDifficultyLevel(difficultyScore);
  
  // 週次予測を計算
  const weeklyPredictions = calculateWeeklyPredictions(
    currentFollowers,
    targetFollowers,
    periodMonths
  );
  
  // 推定所要時間を計算
  const { totalMinutes, dailyMinutes, breakdown } = calculateEstimatedTime(
    weeklyFeedPosts,
    weeklyReelPosts,
    weeklyStoryPosts
  );
  
  // 必要な取り組みを生成
  const requiredActions = generateRequiredActions(
    level,
    weeklyFeedPosts,
    weeklyReelPosts,
    weeklyStoryPosts
  );
  
  // 非現実的な場合のみ代替案を生成
  const alternativePlans = level === "unrealistic" 
    ? generateAlternativePlans(currentFollowers, periodMonths)
    : undefined;
  
  return {
    requiredMonthlyGrowthRate: Math.round(requiredGrowthRate * 10) / 10,
    difficultyScore: Math.round(difficultyScore * 10) / 10,
    difficultyLevel: level,
    difficultyMessage: message,
    difficultyColor: color,
    weeklyPredictions,
    estimatedWeeklyMinutes: totalMinutes,
    timeBreakdown: breakdown,
    requiredActions,
    alternativePlans,
  };
}

/**
 * POST: 計画シミュレーションを計算
 */
export async function POST(request: NextRequest) {
  try {
    const { uid: userId } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "instagram-plan-simulation", limit: 30, windowSeconds: 60 },
      auditEventName: "instagram_plan_simulation",
    });

    const body: { formData: PlanFormData } = await request.json();

    // バリデーション
    if (!body.formData) {
      return NextResponse.json({ error: "formDataが必要です" }, { status: 400 });
    }

    const { formData } = body;

    if (formData.currentFollowers <= 0 || formData.targetFollowers <= 0) {
      return NextResponse.json(
        { error: "現在のフォロワー数と目標フォロワー数は1以上である必要があります" },
        { status: 400 }
      );
    }

    if (formData.targetFollowers <= formData.currentFollowers) {
      return NextResponse.json(
        { error: "目標フォロワー数は現在のフォロワー数より大きい必要があります" },
        { status: 400 }
      );
    }

    // シミュレーション計算（すべてバックエンドで実行）
    const result = calculateSimulation(formData);

    return NextResponse.json({ result });
  } catch (error) {
    console.error("シミュレーション計算エラー:", error);
    const { status, body: errorBody } = buildErrorResponse(error);
    return NextResponse.json(errorBody, { status });
  }
}










