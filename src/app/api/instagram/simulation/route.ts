import { NextRequest, NextResponse } from 'next/server';
import { SimulationRequest, SimulationResult } from '../../../instagram/plan/types/plan';

export async function POST(request: NextRequest) {
  try {
    const body: SimulationRequest = await request.json();
    
    // バリデーション
    if (!body.followerGain || !body.currentFollowers || !body.planPeriod) {
      return NextResponse.json(
        { error: '必要なパラメータが不足しています' },
        { status: 400 }
      );
    }

    // シミュレーション処理
    const simulationResult = await runSimulation(body);
    
    return NextResponse.json(simulationResult);
  } catch (error) {
    console.error('シミュレーションエラー:', error);
    return NextResponse.json(
      { error: 'シミュレーション処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// シミュレーション処理ロジック（簡素化版）
async function runSimulation(requestData: SimulationRequest): Promise<SimulationResult> {
  const {
    followerGain,
    currentFollowers,
    planPeriod,
    goalCategory,
    strategyValues,
    postCategories,
    hashtagStrategy
  } = requestData;

  // 期間に基づく計算
  const periodMultiplier = getPeriodMultiplier(planPeriod);
  const monthlyTarget = Math.ceil(followerGain / periodMultiplier);
  const weeklyTarget = Math.ceil(followerGain / (periodMultiplier * 4));

  // 実現可能性の判定
  const feasibility = calculateFeasibility(followerGain, currentFollowers, planPeriod);
  
  // 投稿頻度の計算
  const postsPerWeek = calculatePostFrequency(strategyValues, postCategories, followerGain);
  const monthlyPostCount = (postsPerWeek.reel + postsPerWeek.feed + postsPerWeek.story) * 4;

  // ワークロード判定
  const workloadMessage = calculateWorkload(monthlyPostCount);

  // AIアドバイス生成
  const mainAdvice = generateMainAdvice(strategyValues, goalCategory, followerGain);
  const improvementTips = generateImprovementTips(strategyValues, hashtagStrategy, postCategories);

  // 目標達成日を計算
  const targetDate = calculateTargetDate(planPeriod);

  return {
    targetDate,
    monthlyTarget,
    weeklyTarget,
    feasibilityLevel: feasibility.level,
    feasibilityBadge: feasibility.badge,
    postsPerWeek,
    monthlyPostCount,
    workloadMessage,
    mainAdvice,
    improvementTips
  };
}

// 期間乗数を取得
function getPeriodMultiplier(planPeriod: string): number {
  switch (planPeriod) {
    case '1ヶ月': return 1;
    case '3ヶ月': return 3;
    case '6ヶ月': return 6;
    case '1年': return 12;
    default: return 1;
  }
}

// 実現可能性を計算
function calculateFeasibility(followerGain: number, currentFollowers: number, planPeriod: string) {
  const periodMultiplier = getPeriodMultiplier(planPeriod);
  const monthlyGain = followerGain / periodMultiplier;
  const growthRate = monthlyGain / Math.max(currentFollowers, 1);

  if (growthRate <= 0.05) {
    return { level: 'very_realistic', badge: '非常に現実的' };
  } else if (growthRate <= 0.1) {
    return { level: 'realistic', badge: '現実的' };
  } else if (growthRate <= 0.2) {
    return { level: 'moderate', badge: '挑戦的' };
  } else if (growthRate <= 0.5) {
    return { level: 'challenging', badge: '困難' };
  } else {
    return { level: 'very_challenging', badge: '非常に困難' };
  }
}

// 投稿頻度を計算
function calculatePostFrequency(strategyValues: string[], postCategories: string[], followerGain: number) {
  let reel = 1;
  let feed = 2;
  let story = 3;

  // 戦略による調整
  if (strategyValues.includes('リール中心運用')) {
    reel = Math.min(4, Math.ceil(followerGain / 1000) + 2);
  }
  if (strategyValues.includes('フィード投稿強化')) {
    feed = Math.min(5, Math.ceil(followerGain / 800) + 2);
  }
  if (strategyValues.includes('ストーリーで交流を深める')) {
    story = Math.min(7, Math.ceil(followerGain / 500) + 3);
  }

  return { reel, feed, story };
}

// ワークロードを計算
function calculateWorkload(monthlyPostCount: number) {
  if (monthlyPostCount <= 10) {
    return '軽い負荷で継続しやすい';
  } else if (monthlyPostCount <= 20) {
    return '適度な負荷で継続可能';
  } else if (monthlyPostCount <= 30) {
    return 'やや負荷が高いが達成可能';
  } else {
    return '高い負荷、計画的な運用が必要';
  }
}

// メインアドバイスを生成
function generateMainAdvice(strategyValues: string[], goalCategory: string, followerGain: number) {
  const strategies = strategyValues.join('、');
  const category = goalCategory === 'follower' ? 'フォロワー獲得' : 'エンゲージメント向上';
  
  return `${category}を重視した戦略として、${strategies}を推奨します。週${Math.ceil(followerGain / 1000) + 1}回のリール投稿と週${Math.ceil(followerGain / 800) + 2}回のフィード投稿で目標達成が可能です。`;
}

// 改善提案を生成
function generateImprovementTips(strategyValues: string[], hashtagStrategy: string, postCategories: string[]) {
  const tips = [];

  if (strategyValues.includes('ハッシュタグ見直し')) {
    tips.push('ハッシュタグを15-20個使用してリーチを拡大');
  }
  
  if (strategyValues.includes('ストーリーで交流を深める')) {
    tips.push('ストーリーで日常的な交流を促進');
  }
  
  tips.push('投稿時間を午後2-4時、夜8-10時に集中');
  
  if (postCategories.includes('ノウハウ')) {
    tips.push('ノウハウ系投稿で専門性をアピール');
  }
  
  if (postCategories.includes('実績紹介')) {
    tips.push('実績紹介で信頼性を向上');
  }

  return tips;
}

// 目標達成日を計算
function calculateTargetDate(planPeriod: string): string {
  const now = new Date();
  const targetDate = new Date(now);

  switch (planPeriod) {
    case '1ヶ月':
      targetDate.setMonth(targetDate.getMonth() + 1);
      break;
    case '3ヶ月':
      targetDate.setMonth(targetDate.getMonth() + 3);
      break;
    case '6ヶ月':
      targetDate.setMonth(targetDate.getMonth() + 6);
      break;
    case '1年':
      targetDate.setFullYear(targetDate.getFullYear() + 1);
      break;
    default:
      targetDate.setMonth(targetDate.getMonth() + 1);
  }

  return targetDate.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

