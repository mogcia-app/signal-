import { NextRequest, NextResponse } from 'next/server';
import { SimulationRequest, SimulationResult } from '../../../instagram/plan/types/plan';
import { buildPlanPrompt } from '../../../../utils/aiPromptBuilder';
import { adminAuth, adminDb } from '../../../../lib/firebase-admin';
import { UserProfile } from '../../../../types/user';

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

    // ユーザーIDを取得
    let userId = 'anonymous';
    const authHeader = request.headers.get('authorization');
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        userId = decodedToken.uid;
        console.log('✅ Authenticated user:', userId);
      } catch (authError) {
        console.warn('⚠️ Firebase認証エラー（匿名ユーザーとして処理）:', authError);
      }
    }

    // シミュレーション処理
    const simulationResult = await runSimulation(body, userId);
    
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
async function runSimulation(requestData: SimulationRequest, userId: string = 'anonymous'): Promise<SimulationResult> {
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
  
  // 「非常に困難」の場合の代替案を生成
  const alternativeOptions = feasibility.level === 'very_challenging' 
    ? generateAlternativeOptions(followerGain, currentFollowers, planPeriod)
    : null;
  
  // 投稿頻度の計算
  const postsPerWeek = calculatePostFrequency(strategyValues, postCategories, followerGain);
  const monthlyPostCount = (postsPerWeek.reel + postsPerWeek.feed + postsPerWeek.story) * 4;

  // ワークロード判定
  const workloadMessage = calculateWorkload(monthlyPostCount);

  // グラフデータ生成
  const graphData = generateGraphData(currentFollowers, followerGain, planPeriod);

  // ワンポイントアドバイス生成
  const onePointAdvice = generateOnePointAdvice(graphData.isRealistic, graphData.growthRateComparison);

  // シミュレーション結果を準備
  const simulationResultData = {
    monthlyTarget,
    feasibilityLevel: feasibility.level,
    postsPerWeek: postsPerWeek
  };

  // AIアドバイス生成（ユーザープロファイルを使用）
  const { mainAdvice, improvementTips } = await generateAISimulationAdvice(
    userId,
    currentFollowers,
    followerGain,
    goalCategory,
    strategyValues,
    postCategories,
    hashtagStrategy,
    simulationResultData
  );

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
    improvementTips,
    graphData,
    onePointAdvice,
    alternativeOptions
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

// 実現可能性を計算（保守的な基準）
function calculateFeasibility(followerGain: number, currentFollowers: number, planPeriod: string) {
  const periodMultiplier = getPeriodMultiplier(planPeriod);
  const monthlyGain = followerGain / periodMultiplier;
  const growthRate = monthlyGain / Math.max(currentFollowers, 1);

  // より保守的な基準に変更
  // 実際のInstagram運用では月3%以下が現実的、月5%以下が良い成長率
  if (growthRate <= 0.02) {
    return { level: 'very_realistic', badge: '非常に現実的' };
  } else if (growthRate <= 0.05) {
    return { level: 'realistic', badge: '現実的' };
  } else if (growthRate <= 0.1) {
    return { level: 'moderate', badge: '挑戦的' };
  } else if (growthRate <= 0.2) {
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
    `目標達成に向けて、${goalCategory === 'follower' ? 'フォロワー獲得' : 'エンゲージメント向上'}を意識したコンテンツ戦略が重要です。一貫性のある投稿で信頼性を構築しましょう。※結果は個人差があります`,
    `${goalCategory === 'follower' ? 'フォロワー獲得' : 'エンゲージメント向上'}に特化した戦略で、ターゲット層に刺さるコンテンツを継続的に投稿することが成功の鍵です。`,
    `フォロワー増加には、エンゲージメントを高めるコンテンツと定期的な投稿が不可欠です。継続的な努力が重要です。`,
    `目標達成のためには、戦略的な投稿スケジュールと質の高いコンテンツの両立が重要です。※実績は保証されません`,
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
      'フォロワーの投稿にいいねやコメント'
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

// グラフデータ生成
function generateGraphData(currentFollowers: number, followerGain: number, planPeriod: string) {
  const targetFollowers = currentFollowers + followerGain;
  const isMonthly = planPeriod.includes('月');
  const totalWeeks = isMonthly ? parseInt(planPeriod) * 4 : parseInt(planPeriod);
  
  const realisticWeeklyGrowthRate = 0.02; // 2% per week (現実的)
  const userTargetWeeklyGrowthRate = currentFollowers > 0 ? followerGain / (totalWeeks * currentFollowers) : 0;
  
  const data = [];
  let realisticFollowers = currentFollowers;
  let userTargetFollowers = currentFollowers;
  
  for (let week = 0; week <= totalWeeks; week++) {
    data.push({
      week: week === 0 ? '現在' : `第${week}週`,
      realistic: Math.round(realisticFollowers),
      userTarget: Math.round(userTargetFollowers)
    });
    
    if (week < totalWeeks) {
      realisticFollowers *= (1 + realisticWeeklyGrowthRate);
      userTargetFollowers = currentFollowers + (followerGain * (week + 1) / totalWeeks);
    }
  }
  
  return {
    data,
    realisticFinal: Math.round(realisticFollowers),
    userTargetFinal: targetFollowers,
    isRealistic: userTargetWeeklyGrowthRate <= realisticWeeklyGrowthRate * 1.5 && !isNaN(userTargetWeeklyGrowthRate),
    growthRateComparison: {
      realistic: realisticWeeklyGrowthRate * 100,
      userTarget: isNaN(userTargetWeeklyGrowthRate) ? 0 : userTargetWeeklyGrowthRate * 100
    }
  };
}

// ワンポイントアドバイス生成
function generateOnePointAdvice(isRealistic: boolean, growthRateComparison: { realistic: number; userTarget: number }) {
  if (!isRealistic) {
    return {
      type: 'warning' as const,
      title: '目標の見直しをお勧めします',
      message: `週間成長率${growthRateComparison.userTarget.toFixed(1)}%は一般的な成長率${growthRateComparison.realistic.toFixed(1)}%を大幅に上回っています。`,
      advice: 'エンゲージメント向上に特化した戦略で、ターゲット層に刺さるコンテンツを継続的に投稿することが成功の鍵です。'
    };
  } else {
    return {
      type: 'success' as const,
      title: '目標は現実的です！',
      message: '計画的なアプローチで目標達成を目指しましょう。',
      advice: 'エンゲージメント向上に特化した戦略で、ターゲット層に刺さるコンテンツを継続的に投稿することが成功の鍵です。'
    };
  }
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

// 代替案を生成（非常に困難な場合）
function generateAlternativeOptions(followerGain: number, currentFollowers: number, planPeriod: string) {
  const periodMultiplier = getPeriodMultiplier(planPeriod);
  const monthlyGain = followerGain / periodMultiplier;
  const growthRate = monthlyGain / Math.max(currentFollowers, 1);
  
  // 現実的な目標（月間成長率5%以下）
  const realisticMonthlyGrowthRate = 0.05;
  const realisticMonthlyGain = currentFollowers * realisticMonthlyGrowthRate;
  const realisticTotalGain = realisticMonthlyGain * periodMultiplier;
  const realisticTargetFollowers = currentFollowers + realisticTotalGain;
  
  // 中等度の目標（月間成長率10%以下）
  const moderateMonthlyGrowthRate = 0.10;
  const moderateMonthlyGain = currentFollowers * moderateMonthlyGrowthRate;
  const moderateTotalGain = moderateMonthlyGain * periodMultiplier;
  const moderateTargetFollowers = currentFollowers + moderateTotalGain;
  
  // 段階的アプローチ（半分ずつ達成）
  const phasedFirstTarget = currentFollowers + Math.ceil(followerGain / 2);
  const phasedSecondTarget = currentFollowers + followerGain;
  
  // 期間延長案
  const extendedPeriodMultiplier = periodMultiplier * 1.5;
  const extendedPeriod = getExtendedPeriod(planPeriod);
  
  return {
    whyDifficult: `現在の目標は月間${(growthRate * 100).toFixed(1)}%の成長率が必要です。一般的な成長率（月間3-5%）を大幅に上回るため、達成は非常に困難です。`,
    
    realistic: {
      targetFollowers: Math.round(realisticTargetFollowers),
      followerGain: Math.round(realisticTotalGain),
      monthlyGain: Math.round(realisticMonthlyGain),
      monthlyGrowthRate: 5,
      feasibility: 'very_realistic',
      recommendation: '無理なく継続できる現実的な目標です。一貫した投稿とエンゲージメント向上に集中しましょう。',
      pros: [
        '継続しやすい投稿ペース',
        'リスクが低く確実な成長',
        'コストパフォーマンスが良い',
        'フォロワーの質を維持できる'
      ],
      cons: [
        '成長ペースがゆっくり',
        '期間が長くかかる可能性'
      ]
    },
    
    moderate: {
      targetFollowers: Math.round(moderateTargetFollowers),
      followerGain: Math.round(moderateTotalGain),
      monthlyGain: Math.round(moderateMonthlyGain),
      monthlyGrowthRate: 10,
      feasibility: 'moderate',
      recommendation: 'やや挑戦的ですが、集中的な努力で達成可能な目標です。リール投稿の強化やエンゲージメント戦略の最適化を検討しましょう。',
      pros: [
        '現実的な成長を期待できる',
        '適度な挑戦でモチベーション維持',
        '戦略次第で上振れの可能性',
        '短期間で成果が見える'
      ],
      cons: [
        'やや高負荷な投稿ペースが必要',
        '一貫した戦略実行が必須'
      ]
    },
    
    phased: {
      phase1: {
        targetFollowers: phasedFirstTarget,
        followerGain: Math.ceil(followerGain / 2),
        duration: planPeriod,
        description: '第一段階：基礎を固める期間'
      },
      phase2: {
        targetFollowers: phasedSecondTarget,
        followerGain: Math.ceil(followerGain / 2),
        duration: planPeriod,
        description: '第二段階：成長を加速させる期間'
      },
      totalDuration: getDoubledPeriod(planPeriod),
      feasibility: 'moderate',
      recommendation: '目標を半分ずつ達成する段階的アプローチ。第一段階で基盤を固めてから、第二段階で成長を加速させます。',
      pros: [
        'リスク分散で達成しやすい',
        '中間的な成功体験を得られる',
        '戦略を調整できる機会がある',
        '学習しながら成長できる'
      ],
      cons: [
        '目標達成までに期間が2倍必要',
        '長期的な継続が必要'
      ]
    },
    
    extendedPeriod: {
      period: extendedPeriod,
      periodMultiplier: extendedPeriodMultiplier,
      recommendation: `期間を${extendedPeriod}に延長することで、月間${((followerGain / (extendedPeriodMultiplier * currentFollowers)) * 100).toFixed(1)}%の成長率になり、より現実的な目標になります。`,
      pros: [
        'より現実的な投稿ペースで達成可能',
        '無理のない継続的な投稿ができる',
        'コンテンツ品質を維持できる'
      ],
      cons: [
        '目標達成に時間がかかる'
      ]
    },
    
    otherStrategies: [
      {
        title: '広告予算を投入する',
        description: 'Instagram広告を活用して、オーガニックな成長を補完します。月1-2万円程度の予算で成長ペースを加速できます。',
        estimatedBoost: '月間+10-20%の成長促進',
        cost: '月1-5万円',
        feasibility: 'realistic'
      }
    ]
  };
}

// 期間を延長する
function getExtendedPeriod(planPeriod: string): string {
  switch (planPeriod) {
    case '1ヶ月': return '6ヶ月';
    case '3ヶ月': return '6ヶ月';
    case '6ヶ月': return '1年';
    case '1年': return '2年';
    default: return '6ヶ月';
  }
}

// 期間を2倍にする
function getDoubledPeriod(planPeriod: string): string {
  switch (planPeriod) {
    case '1ヶ月': return '2ヶ月';
    case '3ヶ月': return '6ヶ月';
    case '6ヶ月': return '1年';
    case '1年': return '2年';
    default: return '2ヶ月';
  }
}

// AIアドバイス生成
async function generateAISimulationAdvice(
  userId: string,
  currentFollowers: number,
  followerGain: number,
  goalCategory: string,
  strategyValues: string[],
  postCategories: string[],
  hashtagStrategy: string,
  simulationResult: Record<string, unknown>
): Promise<{ mainAdvice: string; improvementTips: string[] }> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    console.warn('OpenAI API key not configured, falling back to template advice');
    return {
      mainAdvice: generateMainAdvice(strategyValues, goalCategory, followerGain),
      improvementTips: generateImprovementTips(strategyValues, hashtagStrategy, postCategories)
    };
  }

  // ユーザープロファイルを取得
  let userProfile: UserProfile | null = null;
  try {
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (userDoc.exists) {
      userProfile = userDoc.data() as UserProfile;
    }
  } catch (error) {
    console.warn('ユーザープロファイル取得エラー（デフォルト値を使用）:', error);
  }

  // フォームデータを準備
  const formData = {
    currentFollowers: String(currentFollowers),
    targetFollowers: String(currentFollowers + followerGain),
    goalCategory: goalCategory,
    strategyValues: strategyValues,
    postCategories: postCategories,
    tone: hashtagStrategy
  };

  try {
    // プロンプトビルダーを使用してシステムプロンプトを構築
    let systemPrompt: string;
    
    if (userProfile) {
      systemPrompt = buildPlanPrompt(userProfile, 'instagram', formData, simulationResult);
    } else {
      // フォールバック: ユーザープロファイルがない場合
      systemPrompt = `あなたはInstagram運用の専門家です。ユーザーの計画データとシミュレーション結果を基に、具体的で実用的な投稿戦略アドバイスを生成してください。

計画データ:
- 現在のフォロワー数: ${currentFollowers}
- 目標フォロワー数: ${currentFollowers + followerGain}
- KPIカテゴリ: ${goalCategory}
- 選択戦略: ${strategyValues.join(', ') || 'なし'}
- 投稿カテゴリ: ${postCategories.join(', ') || 'なし'}

シミュレーション結果:
- 月間目標: ${simulationResult.monthlyTarget || 'N/A'}
- 実現可能性: ${simulationResult.feasibilityLevel || 'N/A'}
- 週間投稿数: フィード${(simulationResult.postsPerWeek as Record<string, unknown>)?.feed || 0}回、リール${(simulationResult.postsPerWeek as Record<string, unknown>)?.reel || 0}回`;
    }

    // シミュレーション専用のアドバイスリクエスト
    const userPrompt = `
以下の2つのセクションで、簡潔で実用的なアドバイスを生成してください：

【メインアドバイス】
- 1つの文章で、目標達成に向けた最も重要な戦略を提示してください
- 具体的な数値やアクションを含めてください
- 長さは50-80文字程度にしてください

【改善提案】
- 3-5個の具体的な改善提案を箇条書きで提示してください
- 各提案は15-25文字程度にしてください
- すぐに実行できるアクションを中心にしてください

出力フォーマット:
メインアドバイス: [アドバイス内容]
改善提案:
1. [提案1]
2. [提案2]
3. [提案3]
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || '';
    
    // AIレスポンスを解析
    const mainAdviceMatch = aiResponse.match(/メインアドバイス[:：]\s*(.+?)(?:\n|$)/i);
    const mainAdvice = mainAdviceMatch ? mainAdviceMatch[1].trim() : generateMainAdvice(strategyValues, goalCategory, followerGain);
    
    const tipsMatch = aiResponse.match(/改善提案[:：]\s*([\s\S]+?)(?:\n\n|\nメイン|$)/i);
    let improvementTips: string[] = [];
    
    if (tipsMatch) {
      const tipsText = tipsMatch[1];
      // 番号付きリストを抽出（例: "1. xxx\n2. xxx"）
      const tipLines = tipsText.match(/\d+[\.．]\s*(.+?)(?=\n|$)/g);
      if (tipLines) {
        improvementTips = tipLines.map((line: string) => line.replace(/^\d+[\.．]\s*/, '').trim()).filter((tip: string) => tip.length > 0);
      }
    }
    
    // 提案が不足している場合はフォールバックを使用
    if (improvementTips.length === 0) {
      improvementTips = generateImprovementTips(strategyValues, hashtagStrategy, postCategories);
    }

    return { mainAdvice, improvementTips };

  } catch (error) {
    console.error('AIアドバイス生成エラー:', error);
    // フォールバック: テンプレートアドバイスを使用
    return {
      mainAdvice: generateMainAdvice(strategyValues, goalCategory, followerGain),
      improvementTips: generateImprovementTips(strategyValues, hashtagStrategy, postCategories)
    };
  }
}

