import { PlanFormData, SimulationResult, AlternativePlan, IndustryAverage } from "../types/plan";

/**
 * 業界平均成長率を取得（フォロワー数別）
 */
export function getIndustryAverage(currentFollowers: number): IndustryAverage {
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
export function calculateRequiredMonthlyGrowthRate(
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
export function calculateDifficultyScore(
  requiredGrowthRate: number,
  industryAverage: number
): number {
  if (industryAverage <= 0) {
    return 0;
  }
  return (requiredGrowthRate / industryAverage) * 100;
}

/**
 * 達成難易度レベルを判定
 */
export function getDifficultyLevel(score: number): {
  level: SimulationResult["difficultyLevel"];
  message: string;
  color: SimulationResult["difficultyColor"];
} {
  if (score <= 80) {
    return {
      level: "realistic",
      message: "✅ 現実的な目標です！",
      color: "green",
    };
  } else if (score <= 120) {
    return {
      level: "challenging",
      message: "⚠️ 努力次第で達成可能",
      color: "yellow",
    };
  } else if (score <= 200) {
    return {
      level: "very-challenging",
      message: "⚠️ かなりの努力が必要です",
      color: "orange",
    };
  } else {
    return {
      level: "unrealistic",
      message: "❌ この目標は達成が非常に困難です",
      color: "red",
    };
  }
}

/**
 * 週次フォロワー増加予測を計算
 * 簡易的な線形予測（等差数列的に増加）
 */
export function calculateWeeklyPredictions(
  currentFollowers: number,
  targetFollowers: number,
  periodMonths: number
): number[] {
  const totalWeeks = periodMonths * 4;
  const totalGain = targetFollowers - currentFollowers;
  const weeklyGain = totalGain / totalWeeks;
  
  const predictions: number[] = [];
  let current = currentFollowers;
  
  for (let week = 1; week <= totalWeeks; week++) {
    current += weeklyGain;
    predictions.push(Math.round(current));
  }
  
  return predictions;
}

/**
 * 推定所要時間を計算
 * 計算式: (フィード投稿回数 × 10分) + (リール投稿回数 × 15分) + (ストーリーズ回数 × 5分) + 10分(コメント返信)
 */
export function calculateEstimatedTime(
  weeklyFeedPosts: number,
  weeklyReelPosts: number,
  weeklyStoryPosts: number
): {
  totalMinutes: number;
  dailyMinutes: number;
  breakdown: SimulationResult["timeBreakdown"];
} {
  const feedMinutes = weeklyFeedPosts * 10;
  const reelMinutes = weeklyReelPosts * 15;
  const storyMinutes = weeklyStoryPosts * 5;
  const commentMinutes = 10;
  
  const totalMinutes = feedMinutes + reelMinutes + storyMinutes + commentMinutes;
  const dailyMinutes = Math.round((totalMinutes / 7) * 10) / 10;
  
  return {
    totalMinutes,
    dailyMinutes,
    breakdown: {
      feed: feedMinutes,
      reel: reelMinutes,
      story: storyMinutes,
      comments: commentMinutes,
    },
  };
}

/**
 * 必要な取り組みを生成
 */
export function generateRequiredActions(
  difficultyLevel: SimulationResult["difficultyLevel"],
  weeklyFeedPosts: number,
  weeklyReelPosts: number,
  weeklyStoryPosts: number
): string[] {
  const actions: string[] = [];
  
  if (difficultyLevel === "realistic" || difficultyLevel === "challenging") {
    actions.push(`✅ 週${weeklyFeedPosts}回のフィード投稿`);
    if (weeklyReelPosts > 0) {
      actions.push(`✅ 週${weeklyReelPosts}回のリール投稿`);
    }
    if (weeklyStoryPosts > 0) {
      actions.push(`✅ 週${weeklyStoryPosts}回のストーリーズ投稿`);
    }
    actions.push("✅ コメント返信を必ず行う");
    actions.push("✅ ハッシュタグ20〜30個使用");
  } else if (difficultyLevel === "very-challenging") {
    actions.push(`⚠️ 週${weeklyFeedPosts}回以上のフィード投稿が必要`);
    actions.push(`⚠️ 週${weeklyReelPosts}回以上のリール投稿が必要`);
    actions.push("⚠️ 広告投資を検討");
    actions.push("⚠️ インフルエンサーとのコラボを検討");
  } else {
    actions.push("❌ 毎日5回以上の投稿が必要");
    actions.push("❌ 毎日リール投稿が必須");
    actions.push("❌ 広告に月10万円以上の投資");
    actions.push("❌ インフルエンサーとのコラボ必須");
    actions.push("❌ バイラル投稿が必須");
    actions.push("→ 現実的ではありません");
  }
  
  return actions;
}

/**
 * 代替案を生成（非現実的な場合のみ）
 */
export function generateAlternativePlans(
  currentFollowers: number,
  periodMonths: number
): AlternativePlan[] {
  const industryAvg = getIndustryAverage(currentFollowers);
  
  // 案1: 保守的（推奨）
  const conservativeTarget = Math.round(
    currentFollowers * Math.pow(1 + industryAvg.min / 100, periodMonths)
  );
  
  // 案2: 現実的
  const realisticTarget = Math.round(
    currentFollowers * Math.pow(1 + industryAvg.average / 100, periodMonths)
  );
  
  // 案3: 挑戦的
  const challengingTarget = Math.round(
    currentFollowers * Math.pow(1 + industryAvg.max / 100, periodMonths)
  );
  
  return [
    {
      id: "conservative",
      name: "保守的（推奨）",
      targetFollowers: conservativeTarget,
      periodMonths,
      weeklyFeedPosts: 3,
      weeklyReelPosts: 1,
      weeklyStoryPosts: 7,
      description: "目標を業界平均の月2%成長に調整。投稿頻度は週3〜4回。",
    },
    {
      id: "realistic",
      name: "現実的",
      targetFollowers: realisticTarget,
      periodMonths,
      weeklyFeedPosts: 4,
      weeklyReelPosts: 1,
      weeklyStoryPosts: 7,
      description: "目標を業界平均の月2.5%成長に調整。投稿頻度は週4〜5回。",
    },
    {
      id: "challenging",
      name: "挑戦的",
      targetFollowers: challengingTarget,
      periodMonths,
      weeklyFeedPosts: 5,
      weeklyReelPosts: 2,
      weeklyStoryPosts: 7,
      description: "目標を業界平均の月3%成長に調整。投稿頻度は週5回以上 + 広告投資を検討。",
    },
  ];
}

/**
 * シミュレーション結果を計算
 */
export function calculateSimulation(formData: PlanFormData): SimulationResult {
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


