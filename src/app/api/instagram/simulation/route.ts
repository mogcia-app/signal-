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

// ワークロードを計算（拡張版）
function calculateWorkload(monthlyPostCount: number) {
  const workloadMessages = {
    light: [
      '軽い負荷で継続しやすい',
      '余裕を持って取り組める投稿頻度',
      '無理なく続けられるスケジュール',
      '初心者にもおすすめの投稿ペース'
    ],
    moderate: [
      '適度な負荷で継続可能',
      'バランスの取れた投稿頻度',
      '効率的な運用が可能',
      '安定した成長を期待できるペース'
    ],
    high: [
      'やや負荷が高いが達成可能',
      '集中力が必要だが効果的な投稿頻度',
      '計画的な運用で目標達成可能',
      '積極的なアプローチで成果を期待'
    ],
    veryHigh: [
      '高い負荷、計画的な運用が必要',
      'チーム体制での運用を推奨',
      '効率化ツールの活用が必須',
      '戦略的な運用で大きな成果を期待'
    ]
  };

  if (monthlyPostCount <= 10) {
    return getRandomItem(workloadMessages.light);
  } else if (monthlyPostCount <= 20) {
    return getRandomItem(workloadMessages.moderate);
  } else if (monthlyPostCount <= 30) {
    return getRandomItem(workloadMessages.high);
  } else {
    return getRandomItem(workloadMessages.veryHigh);
  }
}

// メインアドバイスを生成（拡張版）
function generateMainAdvice(strategyValues: string[], goalCategory: string, followerGain: number) {
  const adviceTemplates = {
    reel_focused: [
      `エンゲージメント向上を重視した戦略として、リール中心の運用を推奨します。週2回のリール投稿と週3回のフィード投稿で目標達成が可能です。`,
      `リール動画の力を活用しましょう！トレンドを捉えたリール投稿で新規フォロワーを効率的に獲得できます。`,
      `リール中心戦略で、アルゴリズムに好まれるコンテンツを継続的に投稿し、自然なフォロワー増加を目指しましょう。`,
      `リール投稿を軸とした戦略で、視覚的にインパクトのあるコンテンツで注目を集めましょう。`
    ],
    engagement: [
      `コミュニティ構築を重視した戦略として、エンゲージメント向上に焦点を当てましょう。フォロワーとの双方向のコミュニケーションが鍵となります。`,
      `インタラクティブなコンテンツで、フォロワーとのつながりを深めましょう。質問やアンケートを活用してエンゲージメントを高めます。`,
      `ストーリーズを活用した親密なコミュニケーションで、フォロワーのロイヤルティを向上させましょう。`,
      `エンゲージメント重視の戦略で、フォロワーが参加したくなるコンテンツ作りを心がけましょう。`
    ],
    content_quality: [
      `高品質なコンテンツ制作に注力し、ブランド価値を高める戦略を推奨します。一貫性のある投稿で信頼性を構築しましょう。`,
      `コンテンツの質を向上させることで、フォロワーの満足度とエンゲージメント率を同時に高められます。`,
      `専門性のあるコンテンツで差別化を図り、ターゲット層に刺さる投稿を心がけましょう。`,
      `質の高いコンテンツで、フォロワーの期待を超える価値を提供しましょう。`
    ],
    hashtag: [
      `ハッシュタグ戦略を強化し、発見可能性を高めることで新規フォロワー獲得を加速させましょう。`,
      `ニッチなハッシュタグを活用して、興味のあるユーザーに確実にリーチできる戦略が効果的です。`,
      `トレンドハッシュタグとニッチハッシュタグのバランスを取って、幅広い層にアプローチしましょう。`,
      `戦略的なハッシュタグ使用で、ターゲット層に確実にリーチしましょう。`
    ],
    collaboration: [
      `コラボレーション戦略で、他アカウントとの連携により相互フォロワー獲得を目指しましょう。`,
      `同じジャンルのアカウントとの協力で、新たなオーディエンスにリーチできます。`,
      `インフルエンサーや業界関係者とのコラボで、信頼性と影響力を同時に向上させましょう。`,
      `コラボレーションを活用して、新しいコミュニティとのつながりを築きましょう。`
    ]
  };

  const defaultAdvices = [
    `目標達成に向けて、${goalCategory === 'follower' ? 'フォロワー獲得' : 'エンゲージメント向上'}を意識したコンテンツ戦略が重要です。一貫性のある投稿で信頼性を構築しましょう。`,
    `${goalCategory === 'follower' ? 'フォロワー獲得' : 'エンゲージメント向上'}に特化した戦略で、ターゲット層に刺さるコンテンツを継続的に投稿することが成功の鍵です。`,
    `フォロワー増加には、エンゲージメントを高めるコンテンツと定期的な投稿が不可欠です。`,
    `目標達成のためには、戦略的な投稿スケジュールと質の高いコンテンツの両立が重要です。`,
    `${goalCategory === 'follower' ? 'フォロワー獲得' : 'エンゲージメント向上'}を軸とした一貫性のあるブランディングで、フォロワーのロイヤルティ向上を目指しましょう。`
  ];

  // 戦略に応じたアドバイス選択
  for (const strategy of strategyValues) {
    if (strategy.includes('リール') && adviceTemplates.reel_focused) {
      return getRandomItem(adviceTemplates.reel_focused);
    }
    if (strategy.includes('エンゲージメント') && adviceTemplates.engagement) {
      return getRandomItem(adviceTemplates.engagement);
    }
    if (strategy.includes('コンテンツ') && adviceTemplates.content_quality) {
      return getRandomItem(adviceTemplates.content_quality);
    }
    if (strategy.includes('ハッシュタグ') && adviceTemplates.hashtag) {
      return getRandomItem(adviceTemplates.hashtag);
    }
    if (strategy.includes('コラボ') && adviceTemplates.collaboration) {
      return getRandomItem(adviceTemplates.collaboration);
    }
  }

  // 大規模な目標に対する特別なアドバイス
  if (followerGain > 5000) {
    const largeScaleAdvices = [
      '大規模なフォロワー増加を目指すため、広告運用も視野に入れると良いでしょう。',
      '目標達成には、コンテンツマーケティングと広告戦略の組み合わせが効果的です。',
      '大規模な成長を実現するには、チーム体制の構築と効率的な運用プロセスの確立が重要です。'
    ];
    return getRandomItem(defaultAdvices) + ' ' + getRandomItem(largeScaleAdvices);
  }

  return getRandomItem(defaultAdvices);
}

// ランダムアイテム選択ヘルパー関数
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// 改善提案を生成（拡張版）
function generateImprovementTips(strategyValues: string[], hashtagStrategy: string, postCategories: string[]) {
  const allTips = {
    hashtag: [
      'ハッシュタグを15-20個使用してリーチを拡大',
      'トレンドハッシュタグを3-5個含めて注目度をアップ',
      'ニッチなハッシュタグでターゲット層にリーチ',
      'ハッシュタグの組み合わせで発見可能性を向上'
    ],
    story: [
      'ストーリーで日常的な交流を促進',
      'ストーリーズの質問機能でエンゲージメント向上',
      'ストーリーでリアルタイムな情報発信',
      'ストーリーズハイライトでコンテンツを整理'
    ],
    timing: [
      '投稿時間を午後2-4時、夜8-10時に集中',
      'ターゲット層のアクティブ時間に投稿',
      '週末の投稿でリーチを最大化',
      '定期的な投稿スケジュールでフォロワーに習慣化'
    ],
    content: [
      'ノウハウ系投稿で専門性をアピール',
      '実績紹介で信頼性を向上',
      'Before/After形式で効果を視覚化',
      'ユーザー体験談で共感を呼ぶコンテンツ',
      'トレンドを取り入れた話題性のある投稿',
      '教育的コンテンツでフォロワーに価値を提供'
    ],
    engagement: [
      '質問やアンケートでフォロワーとの対話促進',
      'コメント返信でコミュニティ形成',
      'フォロワーの投稿にいいねやコメント',
      'ライブ配信でリアルタイム交流'
    ]
  };

  const tips = [];

  // 戦略に応じた提案
  if (strategyValues.includes('ハッシュタグ見直し')) {
    tips.push(getRandomItem(allTips.hashtag));
  }
  
  if (strategyValues.includes('ストーリーで交流を深める')) {
    tips.push(getRandomItem(allTips.story));
  }

  // 基本的な提案（必ず含める）
  tips.push(getRandomItem(allTips.timing));
  
  // コンテンツカテゴリに応じた提案
  if (postCategories.includes('ノウハウ')) {
    tips.push(getRandomItem(allTips.content.filter(tip => tip.includes('ノウハウ'))));
  }
  
  if (postCategories.includes('実績紹介')) {
    tips.push(getRandomItem(allTips.content.filter(tip => tip.includes('実績'))));
  }

  // エンゲージメント向上の提案
  tips.push(getRandomItem(allTips.engagement));

  // 重複を除去して返す
  return [...new Set(tips)];
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

