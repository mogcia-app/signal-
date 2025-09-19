// 拡張されたシミュレーションロジック

export interface EnhancedSimulationRequest {
  followerGain: number;
  currentFollowers: number;
  planPeriod: string;
  goalCategory: string;
  strategyValues: string[];
  postCategories: string[];
  hashtagStrategy: string;
  // 新規追加要素
  accountAge: number; // アカウント開設からの月数
  currentEngagementRate: number; // 現在のエンゲージメント率
  avgPostsPerWeek: number; // 現在の週間投稿数
  contentQuality: 'low' | 'medium' | 'high'; // コンテンツ品質
  niche: string; // ジャンル・ニッチ
  budget: number; // 広告予算（月額）
  teamSize: number; // 運営チーム人数
}

export interface EnhancedSimulationResult {
  targetDate: string;
  monthlyTarget: number;
  weeklyTarget: number;
  feasibilityLevel: string;
  feasibilityBadge: string;
  postsPerWeek: {
    reel: number;
    feed: number;
    story: number;
  };
  monthlyPostCount: number;
  workloadMessage: string;
  mainAdvice: string;
  improvementTips: string[];
  // 新規追加要素
  growthCurve: {
    month1: number;
    month2: number;
    month3: number;
    total: number;
  };
  riskFactors: string[];
  successProbability: number; // 成功確率（0-100%）
  recommendedBudget: number;
  competitorAnalysis: {
    avgGrowthRate: number;
    marketPosition: string;
    opportunities: string[];
  };
}

// 成長曲線計算（S字カーブ）
export function calculateGrowthCurve(
  followerGain: number,
  currentFollowers: number,
  planPeriod: string
) {
  const periodMonths = getPeriodInMonths(planPeriod);
  const totalGrowth = followerGain;
  
  // S字成長曲線のパラメータ
  const k = totalGrowth; // 最大成長数
  const a = 0.1; // 初期成長率
  const b = 0.5; // 成長の加速率
  
  const growthCurve: number[] = [];
  for (let month = 1; month <= periodMonths; month++) {
    // S字カーブ: f(x) = k / (1 + e^(-a(x-b)))
    const growth = Math.round(k / (1 + Math.exp(-a * (month - b * periodMonths))));
    growthCurve.push(growth);
  }
  
  return {
    monthly: growthCurve,
    cumulative: growthCurve.map((_, i) => 
      growthCurve.slice(0, i + 1).reduce((sum, val) => sum + val, 0)
    )
  };
}

// 高度な実現可能性判定
export function calculateAdvancedFeasibility(request: EnhancedSimulationRequest) {
  const factors = {
    growthRate: request.followerGain / (request.currentFollowers * getPeriodInMonths(request.planPeriod)),
    accountMaturity: Math.min(request.accountAge / 12, 1), // 1年以上で成熟
    engagementHealth: request.currentEngagementRate,
    contentQuality: getContentQualityScore(request.contentQuality),
    postingConsistency: Math.min(request.avgPostsPerWeek / 7, 1),
    strategyAlignment: calculateStrategyScore(request.strategyValues, request.goalCategory),
    budgetSupport: Math.min(request.budget / 10000, 1), // 月1万円で基準
    teamCapacity: Math.min(request.teamSize / 3, 1) // 3人で基準
  };
  
  // 重み付きスコア計算
  const weights = {
    growthRate: 0.25,
    accountMaturity: 0.15,
    engagementHealth: 0.20,
    contentQuality: 0.15,
    postingConsistency: 0.10,
    strategyAlignment: 0.10,
    budgetSupport: 0.03,
    teamCapacity: 0.02
  };
  
  const totalScore = Object.entries(factors).reduce((sum, [key, value]) => {
    return sum + (value * weights[key as keyof typeof weights]);
  }, 0);
  
  // リスクファクター特定
  const riskFactors = [];
  if (factors.growthRate > 0.3) riskFactors.push('目標成長率が高すぎる可能性');
  if (factors.accountMaturity < 0.3) riskFactors.push('アカウントが新しく、基盤が不安定');
  if (factors.engagementHealth < 0.02) riskFactors.push('エンゲージメント率が低い');
  if (factors.contentQuality < 0.6) riskFactors.push('コンテンツ品質の向上が必要');
  if (factors.postingConsistency < 0.3) riskFactors.push('投稿頻度が不十分');
  
  // 成功確率計算
  const successProbability = Math.min(Math.max(totalScore * 100, 10), 95);
  
  // レベルとバッジの決定
  let level = 'realistic';
  let badge = '現実的';
  
  if (totalScore >= 0.8) {
    level = 'very_realistic';
    badge = '非常に現実的';
  } else if (totalScore >= 0.6) {
    level = 'realistic';
    badge = '現実的';
  } else if (totalScore >= 0.4) {
    level = 'moderate';
    badge = '挑戦的';
  } else if (totalScore >= 0.2) {
    level = 'challenging';
    badge = '困難';
  } else {
    level = 'very_challenging';
    badge = '非常に困難';
  }

  return {
    score: totalScore,
    level,
    badge,
    riskFactors,
    successProbability,
    recommendations: generateRecommendations(factors)
  };
}

// 競合分析
export function analyzeCompetitors(niche: string, currentFollowers: number) {
  // ジャンル別の平均成長率データ（実際のデータに置き換え）
  const nicheData = {
    '美容・ファッション': { avgGrowthRate: 0.08, marketSaturation: 'high' },
    'ビジネス・起業': { avgGrowthRate: 0.12, marketSaturation: 'medium' },
    'ライフスタイル': { avgGrowthRate: 0.06, marketSaturation: 'high' },
    'テック・IT': { avgGrowthRate: 0.15, marketSaturation: 'low' },
    '教育・学習': { avgGrowthRate: 0.10, marketSaturation: 'medium' }
  };
  
  const data = nicheData[niche as keyof typeof nicheData] || nicheData['ライフスタイル'];
  
  let marketPosition = 'small';
  if (currentFollowers > 100000) marketPosition = 'large';
  else if (currentFollowers > 10000) marketPosition = 'medium';
  
  return {
    avgGrowthRate: data.avgGrowthRate,
    marketPosition,
    marketSaturation: data.marketSaturation,
    opportunities: generateOpportunities(niche, data.marketSaturation)
  };
}

// ヘルパー関数
function getPeriodInMonths(planPeriod: string): number {
  const multipliers = { '1ヶ月': 1, '3ヶ月': 3, '6ヶ月': 6, '1年': 12 };
  return multipliers[planPeriod as keyof typeof multipliers] || 1;
}

function getContentQualityScore(quality: string): number {
  const scores = { 'low': 0.3, 'medium': 0.6, 'high': 0.9 };
  return scores[quality as keyof typeof scores] || 0.6;
}

function calculateStrategyScore(strategies: string[], goal: string): number {
  const strategyWeights = {
    'follower': ['リール中心運用', 'ハッシュタグ見直し', 'UGC活用'],
    'engagement': ['ストーリーで交流を深める', 'コメント促進', 'フィード投稿強化'],
    'branding': ['カルーセル導線設計', 'UGC活用', 'キャンペーン実施']
  };
  
  const relevantStrategies = strategyWeights[goal as keyof typeof strategyWeights] || [];
  const matchCount = strategies.filter(s => relevantStrategies.includes(s)).length;
  return Math.min(matchCount / relevantStrategies.length, 1);
}

function generateRecommendations(factors: Record<string, number>): string[] {
  const recommendations = [];
  
  if (factors.contentQuality < 0.6) {
    recommendations.push('コンテンツ品質の向上に投資する');
  }
  if (factors.postingConsistency < 0.3) {
    recommendations.push('投稿スケジュールの自動化を検討する');
  }
  if (factors.engagementHealth < 0.02) {
    recommendations.push('コミュニティ構築に重点を置く');
  }
  
  return recommendations;
}

function generateOpportunities(niche: string, saturation: string): string[] {
  const opportunities = {
    'low': ['市場参入の好機', '差別化が容易', '成長余地が大きい'],
    'medium': ['ニッチ戦略が有効', '品質で差別化', 'コミュニティ重視'],
    'high': ['競争激化', '個性化が重要', '長期戦略が必要']
  };
  
  return opportunities[saturation as keyof typeof opportunities] || opportunities['medium'];
}
