/**
 * フォロワー増加ロジック
 * 月間成長率0.8%を基準とした計算
 */

/**
 * 月間成長率0.8%で目標フォロワー数を計算
 * 計算式: 目標フォロワー数 = 現在のフォロワー数 × (1 + 0.008) ^ 期間月数
 */
export function calculateTargetFollowersByAI(
  currentFollowers: number,
  periodMonths: number
): number {
  if (currentFollowers <= 0 || periodMonths <= 0) {
    return 0;
  }
  const monthlyGrowthRate = 0.008; // 0.8%
  const target = currentFollowers * Math.pow(1 + monthlyGrowthRate, periodMonths);
  return Math.round(target);
}

/**
 * AI予想推移を週次で計算（月間成長率0.8%）
 * 現在のフォロワー数から目標フォロワー数まで、週次で推移を計算
 */
export function calculateAIPredictionWeekly(
  currentFollowers: number,
  targetFollowers: number,
  periodMonths: number
): Array<{ week: number; followers: number }> {
  if (currentFollowers <= 0 || periodMonths <= 0) {
    return [];
  }

  const totalWeeks = periodMonths * 4;
  const monthlyGrowthRate = 0.008; // 0.8%
  const weeklyGrowthRate = Math.pow(1 + monthlyGrowthRate, 1 / 4) - 1; // 週次成長率に変換

  const predictions: Array<{ week: number; followers: number }> = [];
  let current = currentFollowers;

  for (let week = 0; week <= totalWeeks; week++) {
    if (week === 0) {
      predictions.push({ week: 0, followers: currentFollowers });
    } else {
      current = current * (1 + weeklyGrowthRate);
      // 目標フォロワー数を超えないように制限
      const predicted = Math.min(Math.round(current), targetFollowers);
      predictions.push({ week, followers: predicted });
    }
  }

  return predictions;
}

/**
 * 目標フォロワー数に基づく週次予測（線形予測）
 * ユーザーが入力した目標フォロワー数に基づく予測
 */
export function calculateTargetWeeklyPredictions(
  currentFollowers: number,
  targetFollowers: number,
  periodMonths: number
): Array<{ week: number; followers: number }> {
  if (currentFollowers <= 0 || periodMonths <= 0) {
    return [];
  }

  const totalWeeks = periodMonths * 4;
  const totalGain = targetFollowers - currentFollowers;
  const weeklyGain = totalGain / totalWeeks;

  const predictions: Array<{ week: number; followers: number }> = [];
  let current = currentFollowers;

  for (let week = 0; week <= totalWeeks; week++) {
    if (week === 0) {
      predictions.push({ week: 0, followers: currentFollowers });
    } else {
      current += weeklyGain;
      predictions.push({ week, followers: Math.round(current) });
    }
  }

  return predictions;
}


