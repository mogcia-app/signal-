import { NextRequest, NextResponse } from "next/server";
import { SimulationRequest, SimulationResult } from "../../../instagram/plan/types/plan";
import { buildPlanPrompt } from "../../../../utils/aiPromptBuilder";
import { adminDb } from "../../../../lib/firebase-admin";
import { UserProfile } from "../../../../types/user";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";
import {
  calculateFeasibilityScore,
  calculateRequiredMonthlyGrowthRate,
  getGrowthRateForAccountSize,
} from "../../../../lib/instagram-benchmarks";

export async function POST(request: NextRequest) {
  try {
    const { uid: userId } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "instagram-simulation", limit: 20, windowSeconds: 60 },
      auditEventName: "instagram_simulation",
    });

    const body: SimulationRequest = await request.json();

    // バリデーション
    if (!body.followerGain || !body.currentFollowers || !body.planPeriod) {
      return NextResponse.json({ error: "必要なパラメータが不足しています" }, { status: 400 });
    }

    // シミュレーション処理
    const simulationResult = await runSimulation(body, userId);

    return NextResponse.json(simulationResult);
  } catch (error) {
    console.error("シミュレーションエラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

// シミュレーション処理ロジック（簡素化版）
async function runSimulation(
  requestData: SimulationRequest,
  userId: string = "anonymous"
): Promise<SimulationResult> {
  const {
    followerGain,
    currentFollowers,
    planPeriod,
    goalCategory,
    strategyValues,
    postCategories,
    hashtagStrategy,
  } = requestData;

  // 期間に基づく計算
  const periodMultiplier = getPeriodMultiplier(planPeriod);
  const monthlyTarget = Math.ceil(followerGain / periodMultiplier);
  const weeklyTarget = Math.ceil(followerGain / (periodMultiplier * 4));

  // 必要成長率を計算（代替案生成で使用）
  const requiredGrowthRate = calculateRequiredMonthlyGrowthRate(
    currentFollowers,
    currentFollowers + followerGain,
    periodMultiplier
  );

  // 投稿頻度の計算（先に計算してfeasibility計算に使用）
  const postsPerWeek = calculatePostFrequency(strategyValues || [], postCategories || [], followerGain);
  const totalPostingFrequency = postsPerWeek.reel + postsPerWeek.feed + postsPerWeek.story;

  // 実現可能性の判定（新しいベンチマークデータに基づく、目標タイプと投稿頻度を考慮）
  const feasibility = calculateFeasibility(
    followerGain, 
    currentFollowers, 
    planPeriod,
    goalCategory,
    totalPostingFrequency
  );

  // 代替案の表示判定：達成難易度スコアが110以上（挑戦的 or 非現実的）の場合のみ表示
  const feasibilityScore = feasibility.feasibilityScore?.difficultyRatio || 0;
  const shouldShowAlternatives = feasibilityScore >= 110;
  
  const alternativeOptions = shouldShowAlternatives
    ? generateAlternativeOptionsWithBenchmarks(
        followerGain, 
        currentFollowers, 
        planPeriod,
        goalCategory,
        feasibilityScore,
        requiredGrowthRate
      )
    : null;

  // グラフデータ生成
  const graphData = generateGraphData(currentFollowers, followerGain, planPeriod);

  // levelからcolorを決定
  const getDifficultyColor = (level: string): "green" | "yellow" | "orange" | "red" => {
    if (level === "realistic" || level === "moderate") return "green";
    if (level === "challenging") return "yellow";
    if (level === "very_challenging") return "orange";
    return "red";
  };

  // levelからmessageを生成
  const getDifficultyMessage = (level: string, label: string): string => {
    return label || `達成難易度: ${level}`;
  };

  // graphDataからweeklyPredictionsを生成
  const weeklyPredictions = graphData.data.map((d: { userTarget: number }) => d.userTarget);

  return {
    requiredMonthlyGrowthRate: requiredGrowthRate,
    difficultyScore: feasibility.feasibilityScore.difficultyRatio,
    difficultyLevel: feasibility.level as "realistic" | "challenging" | "very-challenging" | "unrealistic",
    difficultyMessage: getDifficultyMessage(feasibility.level, feasibility.feasibilityScore.label),
    difficultyColor: getDifficultyColor(feasibility.level),
    weeklyPredictions: weeklyPredictions,
    estimatedWeeklyMinutes: postsPerWeek.feed * 10 + postsPerWeek.reel * 15 + postsPerWeek.story * 5 + 10,
    timeBreakdown: {
      feed: postsPerWeek.feed * 10,
      reel: postsPerWeek.reel * 15,
      story: postsPerWeek.story * 5,
      comments: 10,
    },
    requiredActions: [],
    alternativePlans: alternativeOptions ? [] : undefined, // TODO: alternativeOptionsをAlternativePlan[]に変換
  };
}

// 期間乗数を取得
function getPeriodMultiplier(planPeriod: string): number {
  switch (planPeriod) {
    case "1ヶ月":
      return 1;
    case "3ヶ月":
      return 3;
    case "6ヶ月":
      return 6;
    case "1年":
      return 12;
    default:
      return 1;
  }
}

// 実現可能性を計算（保守的な基準）
// 実現可能性を計算（2026年ベンチマークデータに基づく）
function calculateFeasibility(
  followerGain: number, 
  currentFollowers: number, 
  planPeriod: string,
  goalType?: string,
  postingFrequency?: number
) {
  const periodMultiplier = getPeriodMultiplier(planPeriod);
  const targetFollowers = currentFollowers + followerGain;
  
  // 新しいベンチマークデータに基づく達成難易度計算（目標タイプと投稿頻度を考慮）
  const feasibilityScore = calculateFeasibilityScore(
    currentFollowers,
    targetFollowers,
    periodMultiplier,
    goalType,
    postingFrequency
  );

  // レベルをマッピング
  const levelMap: Record<string, string> = {
    very_easy: "very_realistic",
    easy: "realistic",
    realistic: "moderate",
    challenging: "challenging",
    very_challenging: "very_challenging",
    unrealistic: "very_challenging",
  };

  const badgeMap: Record<string, string> = {
    very_easy: "非常に現実的",
    easy: "現実的",
    realistic: "挑戦的",
    challenging: "困難",
    very_challenging: "非常に困難",
    unrealistic: "非現実的",
  };

  return {
    level: levelMap[feasibilityScore.level] || "moderate",
    badge: badgeMap[feasibilityScore.level] || "挑戦的",
    feasibilityScore, // 詳細情報も含める
  };
}

// 投稿頻度を計算
function calculatePostFrequency(
  strategyValues: string[],
  postCategories: string[],
  followerGain: number
) {
  let reel = 1;
  let feed = 2;
  let story = 3;

  // 戦略による調整
  if (strategyValues.includes("リール中心運用")) {
    reel = Math.min(4, Math.ceil(followerGain / 1000) + 2);
  }
  if (strategyValues.includes("フィード投稿強化")) {
    feed = Math.min(5, Math.ceil(followerGain / 800) + 2);
  }
  if (strategyValues.includes("ストーリーで交流を深める")) {
    story = Math.min(7, Math.ceil(followerGain / 500) + 3);
  }

  return { reel, feed, story };
}

// ワークロードを計算（拡張版）
function calculateWorkload(monthlyPostCount: number) {
  const workloadMessages = {
    light: [
      "軽い負荷で継続しやすい",
      "余裕を持って取り組める投稿頻度",
      "無理なく続けられるスケジュール",
      "初心者にもおすすめの投稿ペース",
    ],
    moderate: [
      "適度な負荷で継続可能",
      "バランスの取れた投稿頻度",
      "効率的な運用が可能",
      "安定した成長を期待できるペース",
    ],
    high: [
      "やや負荷が高いが達成可能",
      "集中力が必要だが効果的な投稿頻度",
      "計画的な運用で目標達成可能",
      "積極的なアプローチで成果を期待",
    ],
    veryHigh: [
      "高い負荷、計画的な運用が必要",
      "チーム体制での運用を推奨",
      "効率化ツールの活用が必須",
      "戦略的な運用で大きな成果を期待",
    ],
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
      `リール投稿を軸とした戦略で、視覚的にインパクトのあるコンテンツで注目を集めましょう。`,
    ],
    engagement: [
      `コミュニティ構築を重視した戦略として、エンゲージメント向上に焦点を当てましょう。フォロワーとの双方向のコミュニケーションが鍵となります。`,
      `インタラクティブなコンテンツで、フォロワーとのつながりを深めましょう。質問やアンケートを活用してエンゲージメントを高めます。`,
      `ストーリーズを活用した親密なコミュニケーションで、フォロワーのロイヤルティを向上させましょう。`,
      `エンゲージメント重視の戦略で、フォロワーが参加したくなるコンテンツ作りを心がけましょう。`,
    ],
    content_quality: [
      `高品質なコンテンツ制作に注力し、ブランド価値を高める戦略を推奨します。一貫性のある投稿で信頼性を構築しましょう。`,
      `コンテンツの質を向上させることで、フォロワーの満足度とエンゲージメント率を同時に高められます。`,
      `専門性のあるコンテンツで差別化を図り、ターゲット層に刺さる投稿を心がけましょう。`,
      `質の高いコンテンツで、フォロワーの期待を超える価値を提供しましょう。`,
    ],
    hashtag: [
      `ハッシュタグ戦略を強化し、発見可能性を高めることで新規フォロワー獲得を加速させましょう。`,
      `ニッチなハッシュタグを活用して、興味のあるユーザーに確実にリーチできる戦略が効果的です。`,
      `トレンドハッシュタグとニッチハッシュタグのバランスを取って、幅広い層にアプローチしましょう。`,
      `戦略的なハッシュタグ使用で、ターゲット層に確実にリーチしましょう。`,
    ],
    collaboration: [
      `コラボレーション戦略で、他アカウントとの連携により相互フォロワー獲得を目指しましょう。`,
      `同じジャンルのアカウントとの協力で、新たなオーディエンスにリーチできます。`,
      `インフルエンサーや業界関係者とのコラボで、信頼性と影響力を同時に向上させましょう。`,
      `コラボレーションを活用して、新しいコミュニティとのつながりを築きましょう。`,
    ],
  };

  const defaultAdvices = [
    `目標達成に向けて、${goalCategory === "follower" ? "フォロワー獲得" : "エンゲージメント向上"}を意識したコンテンツ戦略が重要です。一貫性のある投稿で信頼性を構築しましょう。※結果は個人差があります`,
    `${goalCategory === "follower" ? "フォロワー獲得" : "エンゲージメント向上"}に特化した戦略で、ターゲット層に刺さるコンテンツを継続的に投稿することが成功の鍵です。`,
    `フォロワー増加には、エンゲージメントを高めるコンテンツと定期的な投稿が不可欠です。継続的な努力が重要です。`,
    `目標達成のためには、戦略的な投稿スケジュールと質の高いコンテンツの両立が重要です。※実績は保証されません`,
    `${goalCategory === "follower" ? "フォロワー獲得" : "エンゲージメント向上"}を軸とした一貫性のあるブランディングで、フォロワーのロイヤルティ向上を目指しましょう。`,
  ];

  // 戦略に応じたアドバイス選択
  for (const strategy of strategyValues) {
    if (strategy.includes("リール") && adviceTemplates.reel_focused) {
      return getRandomItem(adviceTemplates.reel_focused);
    }
    if (strategy.includes("エンゲージメント") && adviceTemplates.engagement) {
      return getRandomItem(adviceTemplates.engagement);
    }
    if (strategy.includes("コンテンツ") && adviceTemplates.content_quality) {
      return getRandomItem(adviceTemplates.content_quality);
    }
    if (strategy.includes("ハッシュタグ") && adviceTemplates.hashtag) {
      return getRandomItem(adviceTemplates.hashtag);
    }
    if (strategy.includes("コラボ") && adviceTemplates.collaboration) {
      return getRandomItem(adviceTemplates.collaboration);
    }
  }

  // 大規模な目標に対する特別なアドバイス
  if (followerGain > 5000) {
    const largeScaleAdvices = [
      "大規模なフォロワー増加を目指すため、広告運用も視野に入れると良いでしょう。",
      "目標達成には、コンテンツマーケティングと広告戦略の組み合わせが効果的です。",
      "大規模な成長を実現するには、チーム体制の構築と効率的な運用プロセスの確立が重要です。",
    ];
    return getRandomItem(defaultAdvices) + " " + getRandomItem(largeScaleAdvices);
  }

  return getRandomItem(defaultAdvices);
}

// ランダムアイテム選択ヘルパー関数
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// 改善提案を生成（拡張版）
function generateImprovementTips(
  strategyValues: string[],
  hashtagStrategy: string,
  postCategories: string[]
) {
  const allTips = {
    hashtag: [
      "ハッシュタグを15-20個使用してリーチを拡大",
      "トレンドハッシュタグを3-5個含めて注目度をアップ",
      "ニッチなハッシュタグでターゲット層にリーチ",
      "ハッシュタグの組み合わせで発見可能性を向上",
    ],
    story: [
      "ストーリーで日常的な交流を促進",
      "ストーリーズの質問機能でエンゲージメント向上",
      "ストーリーでリアルタイムな情報発信",
      "ストーリーズハイライトでコンテンツを整理",
    ],
    timing: [
      "投稿時間を午後2-4時、夜8-10時に集中",
      "ターゲット層のアクティブ時間に投稿",
      "週末の投稿でリーチを最大化",
      "定期的な投稿スケジュールでフォロワーに習慣化",
    ],
    content: [
      "ノウハウ系投稿で専門性をアピール",
      "実績紹介で信頼性を向上",
      "Before/After形式で効果を視覚化",
      "ユーザー体験談で共感を呼ぶコンテンツ",
      "トレンドを取り入れた話題性のある投稿",
      "教育的コンテンツでフォロワーに価値を提供",
    ],
    engagement: [
      "質問やアンケートでフォロワーとの対話促進",
      "コメント返信でコミュニティ形成",
      "フォロワーの投稿にいいねやコメント",
    ],
  };

  const tips = [];

  // 戦略に応じた提案
  if (strategyValues.includes("ハッシュタグ見直し")) {
    tips.push(getRandomItem(allTips.hashtag));
  }

  if (strategyValues.includes("ストーリーで交流を深める")) {
    tips.push(getRandomItem(allTips.story));
  }

  // 基本的な提案（必ず含める）
  tips.push(getRandomItem(allTips.timing));

  // コンテンツカテゴリに応じた提案
  if (postCategories.includes("ノウハウ")) {
    tips.push(getRandomItem(allTips.content.filter((tip) => tip.includes("ノウハウ"))));
  }

  if (postCategories.includes("実績紹介")) {
    tips.push(getRandomItem(allTips.content.filter((tip) => tip.includes("実績"))));
  }

  // エンゲージメント向上の提案
  tips.push(getRandomItem(allTips.engagement));

  // 重複を除去して返す
  return [...new Set(tips)];
}

// グラフデータ生成
function generateGraphData(currentFollowers: number, followerGain: number, planPeriod: string) {
  const targetFollowers = currentFollowers + followerGain;
  const isMonthly = planPeriod.includes("月");
  const totalWeeks = isMonthly ? parseInt(planPeriod) * 4 : parseInt(planPeriod);

  // 現実的な成長率を計算（月間3-5%を基準）
  const monthlyGrowthRate = 0.04; // 月間4%（現実的）
  const weeklyGrowthRate = monthlyGrowthRate / 4; // 週間約1%
  
  // 現実的な最終フォロワー数を計算（月間成長率から）
  const periodMultiplier = getPeriodMultiplier(planPeriod);
  const realisticTotalGain = currentFollowers * monthlyGrowthRate * periodMultiplier;
  const realisticFinalFollowers = currentFollowers + realisticTotalGain;
  
  const userTargetWeeklyGrowthRate =
    currentFollowers > 0 ? followerGain / (totalWeeks * currentFollowers) : 0;

  const data = [];
  let realisticFollowers = currentFollowers;
  let userTargetFollowers = currentFollowers;

  for (let week = 0; week <= totalWeeks; week++) {
    data.push({
      week: week === 0 ? "現在" : `第${week}週`,
      realistic: Math.round(realisticFollowers),
      userTarget: Math.round(userTargetFollowers),
    });

    if (week < totalWeeks) {
      // 現実的成長：線形に段階的に増加（複利ではなく）
      const realisticWeeklyGain = realisticTotalGain / totalWeeks;
      realisticFollowers = currentFollowers + (realisticWeeklyGain * (week + 1));
      
      // ユーザーの目標：線形に目標まで到達
      userTargetFollowers = currentFollowers + (followerGain * (week + 1)) / totalWeeks;
    }
  }

  return {
    data,
    realisticFinal: Math.round(realisticFinalFollowers),
    userTargetFinal: targetFollowers,
    isRealistic:
      userTargetWeeklyGrowthRate <= weeklyGrowthRate * 1.5 &&
      !isNaN(userTargetWeeklyGrowthRate),
    growthRateComparison: {
      realistic: weeklyGrowthRate * 100,
      userTarget: isNaN(userTargetWeeklyGrowthRate) ? 0 : userTargetWeeklyGrowthRate * 100,
    },
  };
}

// ワンポイントアドバイス生成
function generateOnePointAdvice(
  isRealistic: boolean,
  growthRateComparison: { realistic: number; userTarget: number }
) {
  if (!isRealistic) {
    return {
      type: "warning" as const,
      title: "目標の見直しをお勧めします",
      message: `週間成長率${growthRateComparison.userTarget.toFixed(1)}%は一般的な成長率${growthRateComparison.realistic.toFixed(1)}%を大幅に上回っています。`,
      advice:
        "エンゲージメント向上に特化した戦略で、ターゲット層に刺さるコンテンツを継続的に投稿することが成功の鍵です。",
    };
  } else {
    return {
      type: "success" as const,
      title: "目標は現実的です！",
      message: "計画的なアプローチで目標達成を目指しましょう。",
      advice:
        "エンゲージメント向上に特化した戦略で、ターゲット層に刺さるコンテンツを継続的に投稿することが成功の鍵です。",
    };
  }
}

// 目標達成日を計算
function calculateTargetDate(planPeriod: string): string {
  const now = new Date();
  const targetDate = new Date(now);

  switch (planPeriod) {
    case "1ヶ月":
      targetDate.setMonth(targetDate.getMonth() + 1);
      break;
    case "3ヶ月":
      targetDate.setMonth(targetDate.getMonth() + 3);
      break;
    case "6ヶ月":
      targetDate.setMonth(targetDate.getMonth() + 6);
      break;
    case "1年":
      targetDate.setFullYear(targetDate.getFullYear() + 1);
      break;
    default:
      targetDate.setMonth(targetDate.getMonth() + 1);
  }

  return targetDate.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// 代替案を生成（非常に困難な場合）
// 週あたり時間を計算（Signal.でできること：投稿文生成のみを考慮）
function calculateWeeklyTime(
  feedPosts: number,
  reelPosts: number,
  storiesPosts: number,
  engagementLevel: "low" | "medium" | "high"
): { weeklyMinutes: number; dailyMinutes: number } {
  // Signal.でできること：投稿文生成時間のみ
  const TIME_PER_POST = {
    feed: 1,       // フィード1投稿: Signal.での投稿文生成約1分
    reel: 1,       // リール1投稿: Signal.での投稿文生成約1分
    stories: 0.5   // ストーリーズ1投稿: Signal.での投稿文生成約30秒
  };
  
  // エンゲージメント対応時間（Signal.でのコメント返信文生成）
  const ENGAGEMENT_TIME = {
    low: 5,        // コメント返信文生成: 週5分
    medium: 10,   // コメント返信文生成: 週10分
    high: 15       // コメント返信文生成: 週15分
  };
  
  const feedTime = feedPosts * TIME_PER_POST.feed;
  const reelTime = reelPosts * TIME_PER_POST.reel;
  const storiesTime = storiesPosts * TIME_PER_POST.stories;
  const engagementTime = ENGAGEMENT_TIME[engagementLevel];
  
  const weeklyMinutes = Math.round(feedTime + reelTime + storiesTime + engagementTime);
  const dailyMinutes = Math.round(weeklyMinutes / 7);
  
  return { weeklyMinutes, dailyMinutes };
}

// 代替案を生成（2026年ベンチマークデータに基づく、改善版）
function generateAlternativeOptionsWithBenchmarks(
  followerGain: number,
  currentFollowers: number,
  planPeriod: string,
  goalType?: string,
  feasibilityScore: number = 0,
  requiredGrowthRate: number = 0
) {
  const periodMultiplier = getPeriodMultiplier(planPeriod);
  const targetFollowers = currentFollowers + followerGain;
  
  // 期間を日数に変換（1ヶ月=30日基準）
  const periodDays = periodMultiplier * 30;
  const periodMultiplierForCalculation = periodDays / 30; // 期間補正係数

  const growthBenchmark = getGrowthRateForAccountSize(currentFollowers);
  const adjustedAverage = growthBenchmark.monthly.realistic;

  // 代替案表示の理由を生成
  let whyDifficult: string;
  let recommendedAction: string;
  
  if (feasibilityScore >= 150) {
    whyDifficult = `現在の目標は月間${requiredGrowthRate.toFixed(1)}%の成長率が必要です。業界平均（${adjustedAverage.toFixed(1)}%）を${(feasibilityScore / 100).toFixed(1)}倍上回るため、達成は非常に困難です。`;
    recommendedAction = "より現実的な目標に調整することを強くおすすめします。";
  } else if (feasibilityScore >= 110) {
    whyDifficult = `現在の目標は月間${requiredGrowthRate.toFixed(1)}%の成長率が必要です。業界平均（${adjustedAverage.toFixed(1)}%）を上回る挑戦的な目標です。`;
    recommendedAction = "高頻度投稿と積極的なエンゲージメントが必要です。または、より達成しやすい目標も検討できます。";
  } else {
    whyDifficult = `現在の目標は月間${requiredGrowthRate.toFixed(1)}%の成長率が必要です。`;
    recommendedAction = "";
  }

  // 保守的プラン（達成確率80%）
  const conservativeGrowthRate = growthBenchmark.monthly.conservative;
  const conservativeIncrease = Math.round(
    currentFollowers * (conservativeGrowthRate / 100) * periodMultiplierForCalculation
  );
  const conservativeTargetFollowers = currentFollowers + conservativeIncrease;
  const conservativeTime = calculateWeeklyTime(3, 1, 4, "low");

  // 現実的プラン（達成確率50%）
  const realisticGrowthRate = growthBenchmark.monthly.realistic;
  const realisticIncrease = Math.round(
    currentFollowers * (realisticGrowthRate / 100) * periodMultiplierForCalculation
  );
  const realisticTargetFollowers = currentFollowers + realisticIncrease;
  const realisticTime = calculateWeeklyTime(5, 2, 7, "medium");

  // 挑戦的プラン（達成確率20%）
  const aggressiveGrowthRate = growthBenchmark.monthly.aggressive;
  const aggressiveIncrease = Math.round(
    currentFollowers * (aggressiveGrowthRate / 100) * periodMultiplierForCalculation
  );
  const aggressiveTargetFollowers = currentFollowers + aggressiveIncrease;
  const aggressiveTime = calculateWeeklyTime(6, 3, 14, "high");

  // 段階的アプローチ
  const phasedFirstTarget = currentFollowers + Math.ceil(conservativeIncrease);
  const phasedSecondTarget = aggressiveTargetFollowers;

  // 期間延長案
  const extendedPeriodMultiplier = periodMultiplier * 1.5;
  const extendedPeriod = getExtendedPeriod(planPeriod);

  return {
    whyDifficult,
    recommendedAction,

    realistic: {
      targetFollowers: conservativeTargetFollowers,
      followerGain: conservativeIncrease,
      monthlyGain: Math.round(conservativeIncrease / periodMultiplier),
      monthlyGrowthRate: conservativeGrowthRate,
      feasibility: "very_realistic",
      probability: "80%",
      weeklyMinutes: conservativeTime.weeklyMinutes,
      dailyMinutes: conservativeTime.dailyMinutes,
      postingDescription: "週3回フィード + 週1回リール + 週3-4回ストーリーズ",
      recommendation:
        "無理なく継続できる現実的な目標です。週3〜4回の投稿とストーリーズを週3〜4回投稿することで達成可能です。",
      pros: [
        "継続しやすい投稿ペース",
        "リスクが低く確実な成長",
        "コストパフォーマンスが良い",
        "フォロワーの質を維持できる",
      ],
      cons: ["成長ペースがゆっくり", "期間が長くかかる可能性"],
      suitableFor: "初心者・副業・時間が限られている方",
    },

    moderate: {
      targetFollowers: realisticTargetFollowers,
      followerGain: realisticIncrease,
      monthlyGain: Math.round(realisticIncrease / periodMultiplier),
      monthlyGrowthRate: realisticGrowthRate,
      feasibility: "moderate",
      probability: "50%",
      weeklyMinutes: realisticTime.weeklyMinutes,
      dailyMinutes: realisticTime.dailyMinutes,
      postingDescription: "週4-5回フィード + 週2回リール + ほぼ毎日ストーリーズ",
      recommendation:
        "業界平均並みの成長を目指す標準プランです。リール投稿を週2回、フィード投稿を週4〜5回、ストーリーズをほぼ毎日投稿することで達成可能です。",
      pros: [
        "現実的な成長を期待できる",
        "適度な挑戦でモチベーション維持",
        "戦略次第で上振れの可能性",
        "短期間で成果が見える",
      ],
      cons: ["やや高負荷な投稿ペースが必要", "一貫した戦略実行が必須"],
      suitableFor: "中級者・本格的に成長させたい方",
    },

    phased: {
      phase1: {
        targetFollowers: phasedFirstTarget,
        followerGain: Math.ceil(conservativeIncrease),
        duration: planPeriod,
        description: "第一段階：基礎を固める期間",
      },
      phase2: {
        targetFollowers: phasedSecondTarget,
        followerGain: aggressiveIncrease,
        duration: planPeriod,
        description: "第二段階：成長を加速させる期間",
      },
      totalDuration: getDoubledPeriod(planPeriod),
      feasibility: "challenging",
      probability: "20%",
      weeklyMinutes: aggressiveTime.weeklyMinutes,
      dailyMinutes: aggressiveTime.dailyMinutes,
      postingDescription: "週5-7回フィード + 週3回以上リール + 毎日複数回ストーリーズ",
      recommendation:
        "高頻度投稿とエンゲージメント強化が必須の挑戦的プランです。リールを週3回以上、フィードを週5〜7回、ストーリーズを毎日複数回投稿することで達成可能です。",
      pros: [
        "短期間で大きな成長を期待できる",
        "バイラル性の高いコンテンツで加速",
        "積極的なアプローチで成果を最大化",
      ],
      cons: ["高い負荷が必要", "時間と労力の投資が大きい", "継続が困難な可能性"],
      suitableFor: "経験者・専任担当者・予算がある方",
    },

    extendedPeriod: {
      period: extendedPeriod,
      periodMultiplier: extendedPeriodMultiplier,
      recommendation: `期間を${extendedPeriod}に延長することで、月間${((followerGain / (extendedPeriodMultiplier * currentFollowers)) * 100).toFixed(1)}%の成長率になり、より現実的な目標になります。`,
      pros: [
        "より現実的な投稿ペースで達成可能",
        "無理のない継続的な投稿ができる",
        "コンテンツ品質を維持できる",
      ],
      cons: ["目標達成に時間がかかる"],
    },

    otherStrategies: [
      {
        title: "広告予算を投入する",
        description:
          "Instagram広告を活用して、オーガニックな成長を補完します。月1-2万円程度の予算で成長ペースを加速できます。",
        estimatedBoost: "月間+10-20%の成長促進",
        cost: "月1-5万円",
        feasibility: "realistic",
      },
      {
        title: "リール投稿を増やす",
        description:
          "リールは画像投稿の2倍以上のリーチを獲得できます。週2回から週4回に増やすことで、新規フォロワー獲得を加速できます。",
        estimatedBoost: "リーチ率30.81%（画像投稿の2.3倍）",
        cost: "時間のみ",
        feasibility: "realistic",
      },
    ],
  };
}

// 期間を延長する
function getExtendedPeriod(planPeriod: string): string {
  switch (planPeriod) {
    case "1ヶ月":
      return "6ヶ月";
    case "3ヶ月":
      return "6ヶ月";
    case "6ヶ月":
      return "1年";
    case "1年":
      return "2年";
    default:
      return "6ヶ月";
  }
}

// 期間を2倍にする
function getDoubledPeriod(planPeriod: string): string {
  switch (planPeriod) {
    case "1ヶ月":
      return "2ヶ月";
    case "3ヶ月":
      return "6ヶ月";
    case "6ヶ月":
      return "1年";
    case "1年":
      return "2年";
    default:
      return "2ヶ月";
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
    if (process.env.NODE_ENV === "development") {
      console.warn("OpenAI API key not configured, falling back to template advice");
      console.log("🔧 改善ポイント生成: 自社ロジック（テンプレート）を使用");
    }
    return {
      mainAdvice: generateMainAdvice(strategyValues, goalCategory, followerGain),
      improvementTips: generateImprovementTips(strategyValues, hashtagStrategy, postCategories),
    };
  }
  
  if (process.env.NODE_ENV === "development") {
    console.log("🤖 改善ポイント生成: OpenAI APIを使用");
  }

  // ユーザープロファイルを取得
  let userProfile: UserProfile | null = null;
  try {
    const userDoc = await adminDb.collection("users").doc(userId).get();
    if (userDoc.exists) {
      userProfile = userDoc.data() as UserProfile;
    }
  } catch (error) {
    console.warn("ユーザープロファイル取得エラー（デフォルト値を使用）:", error);
  }

  // フォームデータを準備
  const formData = {
    currentFollowers: String(currentFollowers),
    targetFollowers: String(currentFollowers + followerGain),
    goalCategory: goalCategory,
    strategyValues: strategyValues,
    postCategories: postCategories,
    tone: hashtagStrategy,
  };

  try {
    // プロンプトビルダーを使用してシステムプロンプトを構築
    let systemPrompt: string;

    if (userProfile) {
      systemPrompt = buildPlanPrompt(userProfile, "instagram", formData, simulationResult);
    } else {
      // フォールバック: ユーザープロファイルがない場合
      systemPrompt = `あなたはInstagram運用の専門家です。ユーザーの計画データとシミュレーション結果を基に、具体的で実用的な投稿戦略アドバイスを生成してください。

計画データ:
- 現在のフォロワー数: ${currentFollowers}
- 目標フォロワー数: ${currentFollowers + followerGain}
- KPIカテゴリ: ${goalCategory}
- 選択戦略: ${strategyValues.join(", ") || "なし"}
- 投稿カテゴリ: ${postCategories.join(", ") || "なし"}

シミュレーション結果:
- 月間目標: ${simulationResult.monthlyTarget || "N/A"}
- 実現可能性: ${simulationResult.feasibilityLevel || "N/A"}
- 週間投稿数: フィード${(simulationResult.postsPerWeek as Record<string, unknown>)?.feed || 0}回、リール${(simulationResult.postsPerWeek as Record<string, unknown>)?.reel || 0}回`;
    }

    // シミュレーション専用のアドバイスリクエスト
    const postsPerWeek = simulationResult.postsPerWeek as { reel: number; feed: number; story: number };
    const userPrompt = `
以下の2つのセクションで、簡潔で実用的なアドバイスを生成してください：

【メインアドバイス】
- 1つの文章で、目標達成に向けた最も重要な戦略を提示してください
- **必ず以下の実際の投稿頻度を反映してください**：
  - リール: 週${postsPerWeek.reel}回
  - フィード: 週${postsPerWeek.feed}回
  - ストーリー: 毎日
- これらの数値を正確に使用してください
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

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || "Unknown error"}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || "";

    // AIレスポンスを解析
    const mainAdviceMatch = aiResponse.match(/メインアドバイス[:：]\s*(.+?)(?:\n|$)/i);
    const mainAdvice = mainAdviceMatch
      ? (process.env.NODE_ENV === "development" && console.log("✅ メインアドバイス生成: AI生成成功"), mainAdviceMatch[1].trim())
      : (process.env.NODE_ENV === "development" && console.log("⚠️ メインアドバイス生成: AIレスポンスが空のため、自社ロジック（テンプレート）にフォールバック"), generateMainAdvice(strategyValues, goalCategory, followerGain));

    const tipsMatch = aiResponse.match(/改善提案[:：]\s*([\s\S]+?)(?:\n\n|\nメイン|$)/i);
    let improvementTips: string[] = [];

    if (tipsMatch) {
      const tipsText = tipsMatch[1];
      // 番号付きリストを抽出（例: "1. xxx\n2. xxx"）
      const tipLines = tipsText.match(/\d+[\.．]\s*(.+?)(?=\n|$)/g);
      if (tipLines) {
        improvementTips = tipLines
          .map((line: string) => line.replace(/^\d+[\.．]\s*/, "").trim())
          .filter((tip: string) => tip.length > 0);
      }
    }

    // 提案が不足している場合はフォールバックを使用
    if (improvementTips.length === 0) {
      if (process.env.NODE_ENV === "development") {
        console.log("⚠️ 改善ポイント生成: AIレスポンスが空のため、自社ロジック（テンプレート）にフォールバック");
      }
      improvementTips = generateImprovementTips(strategyValues, hashtagStrategy, postCategories);
    } else {
      if (process.env.NODE_ENV === "development") {
        console.log(`✅ 改善ポイント生成: AI生成成功（${improvementTips.length}個の提案）`);
      }
    }

    return { mainAdvice, improvementTips };
  } catch (error) {
    console.error("AIアドバイス生成エラー:", error);
    if (process.env.NODE_ENV === "development") {
      console.log("⚠️ 改善ポイント生成: エラー発生のため、自社ロジック（テンプレート）にフォールバック");
    }
    // フォールバック: テンプレートアドバイスを使用
    return {
      mainAdvice: generateMainAdvice(strategyValues, goalCategory, followerGain),
      improvementTips: generateImprovementTips(strategyValues, hashtagStrategy, postCategories),
    };
  }
}
