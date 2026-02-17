import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/server/auth-context";

interface PlanSimulationRequest {
  currentFollowers: number;
  targetFollowers: number;
  operationPurpose: string;
  weeklyPosts: string;
  reelCapability: string;
  storyFrequency?: string;
  targetAudience?: string;
  postingTime?: string;
  regionRestriction?: string;
  regionName?: string;
}

interface Risk {
  category: string;
  type: string;
  probability: number;
  impact: number;
  severity: "高リスク" | "中リスク" | "低リスク";
  countermeasures: string[];
  score: number;
  keyAdvice?: string;
}

interface SimulationResult {
  achievementRate: number;
  difficulty: {
    stars: string;
    label: string;
    industryRange: string;
    achievementRate: number;
  };
  requiredKPIs: {
    monthlyReach: number;
    profileViews: number;
    engagementRate: string;
    saves: number;
    newFollowers: number;
  };
  postingScore: number;
  postingFrequencyCorrection: number;
  followerScaleCoefficient: number;
  purposeMatchingCoefficient: number;
  baseAchievementRate: number;
  storyCoefficient?: number;
  targetTimeCoefficient?: number;
  regionCoefficient?: number;
  impactBreakdown?: {
    story: { label: string; impact: string };
    time: { label: string; impact: string };
    region: { label: string; impact: string };
  };
  risks: Risk[];
  recommendations: string[];
  suggestedAdjustments: SuggestedAdjustment[];
}

interface SuggestedAdjustment {
  field:
    | "weeklyPosts"
    | "reelCapability"
    | "storyFrequency"
    | "postingTime"
    | "regionRestriction"
    | "customTargetFollowers";
  value: string | number;
  label: string;
  reason: string;
  expectedImpact?: string;
}

/**
 * 成長率難易度係数を取得
 */
function getBaseAchievementRate(growthRate: number): number {
  if (growthRate < 5) {return 0.95;}
  if (growthRate < 10) {return 0.80;}
  if (growthRate < 15) {return 0.65;}
  if (growthRate < 25) {return 0.45;}
  if (growthRate < 40) {return 0.25;}
  if (growthRate < 60) {return 0.10;}
  return 0.03;
}

/**
 * フィード投稿係数を取得
 */
function getFeedPostCoefficient(weeklyPosts: string): number {
  switch (weeklyPosts) {
    case "none":
      return 0.0;
    case "weekly-1-2":
      return 0.6;
    case "weekly-3-4":
      return 0.9;
    case "daily":
      return 1.2;
    default:
      return 0.6;
  }
}

/**
 * リール投稿係数を取得
 */
function getReelPostCoefficient(reelCapability: string): number {
  switch (reelCapability) {
    case "none":
      return 0.0;
    case "weekly-1-2":
      return 1.0;
    case "weekly-3-4":
      return 1.4;
    case "daily":
      return 1.8;
    default:
      return 1.0;
  }
}

/**
 * 投稿頻度達成補正を取得
 */
function getPostingFrequencyCorrection(postingScore: number): number {
  if (postingScore < 0.3) {return 0.20;}
  if (postingScore < 0.6) {return 0.50;}
  if (postingScore < 0.9) {return 0.80;}
  if (postingScore < 1.2) {return 1.00;}
  if (postingScore < 1.5) {return 1.15;}
  return 1.30;
}

/**
 * 現在フォロワー規模係数を取得
 */
function getFollowerScaleCoefficient(currentFollowers: number): number {
  if (currentFollowers <= 50) {return 0.60;}
  if (currentFollowers <= 100) {return 0.75;}
  if (currentFollowers <= 300) {return 0.90;}
  if (currentFollowers <= 500) {return 1.00;}
  if (currentFollowers <= 1000) {return 1.10;}
  if (currentFollowers <= 3000) {return 1.20;}
  if (currentFollowers <= 5000) {return 1.15;}
  if (currentFollowers <= 10000) {return 1.10;}
  return 1.05;
}

/**
 * 運用目的マッチング係数を取得
 */
function getPurposeMatchingCoefficient(
  operationPurpose: string,
  feedCoefficient: number,
  reelCoefficient: number
): number {
  const hasReel = reelCoefficient > 0;
  const hasFeed = feedCoefficient > 0;
  const hasBoth = hasReel && hasFeed;

  switch (operationPurpose) {
    case "認知拡大":
      if (hasReel && !hasFeed) {return 1.20;}
      if (hasFeed && !hasReel) {return 0.90;}
      return 1.05;

    case "採用・リクルーティング強化":
      return 0.95;

    case "商品・サービスの販売促進":
      if (hasBoth) {return 1.10;}
      return 1.00;

    case "ファンを作りたい":
      return 1.05;

    case "来店・問い合わせを増やしたい":
      return 0.95;

    case "企業イメージ・ブランディング":
      return 0.95;

    default:
      return 1.00;
  }
}

/**
 * 難易度ラベルを取得
 */
function getDifficultyLabel(achievementRate: number): {
  stars: string;
  label: string;
  industryRange: string;
} {
  if (achievementRate >= 80) {
    return {
      stars: "★☆☆☆☆",
      label: "非常に達成しやすい",
      industryRange: "業界平均の上位10%",
    };
  }
  if (achievementRate >= 60) {
    return {
      stars: "★★☆☆☆",
      label: "達成しやすい",
      industryRange: "業界平均の上位25%",
    };
  }
  if (achievementRate >= 40) {
    return {
      stars: "★★★☆☆",
      label: "標準的",
      industryRange: "業界平均の中位",
    };
  }
  if (achievementRate >= 20) {
    return {
      stars: "★★★★☆",
      label: "挑戦的",
      industryRange: "業界平均の下位25%",
    };
  }
  if (achievementRate >= 10) {
    return {
      stars: "★★★★★",
      label: "非常に困難",
      industryRange: "業界平均の下位10%",
    };
  }
  return {
    stars: "★★★★★",
    label: "ほぼ不可能",
    industryRange: "業界平均の下位5%",
  };
}

/**
 * 必要KPIを計算
 */
function calculateRequiredKPIs(
  targetIncrease: number,
  currentFollowers: number,
  postingScore: number
): {
  monthlyReach: number;
  profileViews: number;
  engagementRate: string;
  saves: number;
  newFollowers: number;
} {
  // フォロー転換率: 2.5%
  const followConversionRate = 0.025;
  // プロフィールアクセス率: 12%
  const profileAccessRate = 0.12;

  // 必要フォロワー獲得数
  const requiredNewFollowers = targetIncrease;

  // 必要プロフィールアクセス数
  const requiredProfileViews = Math.ceil(
    requiredNewFollowers / followConversionRate
  );

  // 必要月間リーチ
  const requiredMonthlyReach = Math.ceil(
    requiredProfileViews / profileAccessRate
  );

  // 投稿スコアに基づくエンゲージメント率の推定
  let estimatedEngagementRate = 2.0; // ベース2%
  if (postingScore >= 1.5) {
    estimatedEngagementRate = 4.5;
  } else if (postingScore >= 1.2) {
    estimatedEngagementRate = 3.5;
  } else if (postingScore >= 0.9) {
    estimatedEngagementRate = 3.0;
  } else if (postingScore >= 0.6) {
    estimatedEngagementRate = 2.5;
  } else if (postingScore >= 0.3) {
    estimatedEngagementRate = 2.0;
  } else {
    estimatedEngagementRate = 1.5;
  }

  // 保存数はリーチの5%程度を想定
  const estimatedSaves = Math.ceil(requiredMonthlyReach * 0.05);

  return {
    monthlyReach: requiredMonthlyReach,
    profileViews: requiredProfileViews,
    engagementRate: `${estimatedEngagementRate.toFixed(1)}%`,
    saves: estimatedSaves,
    newFollowers: requiredNewFollowers,
  };
}

/**
 * ストーリーズ投稿頻度係数を取得
 */
function getStoryCoefficient(
  storyFrequency: string | undefined,
  operationPurpose: string,
  growthRate: number
): number {
  if (!storyFrequency || storyFrequency === "none") {
    return 1.00;
  }

  // 成長率30%未満の場合はストーリーズの影響は限定的
  if (growthRate < 30) {
    return 1.00;
  }

  let baseCoefficient = 1.00;
  switch (storyFrequency) {
    case "weekly-1-2":
      baseCoefficient = 1.08;
      break;
    case "weekly-3-4":
      baseCoefficient = 1.15;
      break;
    case "daily":
      baseCoefficient = 1.25;
      break;
    default:
      return 1.00;
  }

  // 運用目的別のストーリーズ効果
  let purposeMultiplier = 1.0;
  switch (operationPurpose) {
    case "ファンを作りたい":
      purposeMultiplier = 1.2;
      break;
    case "来店・問い合わせを増やしたい":
      purposeMultiplier = 1.15;
      break;
    case "採用・リクルーティング強化":
      purposeMultiplier = 1.1;
      break;
    default:
      purposeMultiplier = 1.0;
  }

  return baseCoefficient * purposeMultiplier;
}

/**
 * ターゲット属性×時間帯係数を取得
 */
function getTargetTimeCoefficient(
  targetAudience: string | undefined,
  postingTime: string | undefined
): number {
  if (!postingTime || postingTime === "") {
    return 1.10; // AIに任せる場合
  }

  // ターゲット属性がない場合は標準値
  if (!targetAudience || targetAudience === "") {
    return 1.00;
  }

  // ターゲット属性から年齢層を推定
  let ageGroup: "10代" | "20代" | "30代" | "40代" | "50代以上" | "指定なし" = "指定なし";
  
  if (targetAudience.includes("10代")) {
    ageGroup = "10代";
  } else if (targetAudience.includes("20代")) {
    ageGroup = "20代";
  } else if (targetAudience.includes("30代")) {
    ageGroup = "30代";
  } else if (targetAudience.includes("40代")) {
    ageGroup = "40代";
  } else if (targetAudience.includes("50代") || targetAudience.includes("50代以上")) {
    ageGroup = "50代以上";
  }

  // 時間帯×年齢層の係数マトリックス
  const coefficientMatrix: Record<string, Record<string, number>> = {
    "10代": {
      morning: 0.70,
      noon: 0.85,
      evening: 1.15,
      night: 1.25,
      "late-night": 1.10,
      "": 1.20, // AIに任せる
    },
    "20代": {
      morning: 0.80,
      noon: 1.10,
      evening: 1.00,
      night: 1.20,
      "late-night": 0.95,
      "": 1.15,
    },
    "30代": {
      morning: 0.75,
      noon: 1.05,
      evening: 0.90,
      night: 1.15,
      "late-night": 0.80,
      "": 1.12,
    },
    "40代": {
      morning: 0.85,
      noon: 1.10,
      evening: 0.85,
      night: 1.10,
      "late-night": 0.70,
      "": 1.10,
    },
    "50代以上": {
      morning: 1.05,
      noon: 1.15,
      evening: 1.00,
      night: 0.95,
      "late-night": 0.60,
      "": 1.08,
    },
    "指定なし": {
      morning: 1.00,
      noon: 1.00,
      evening: 1.00,
      night: 1.00,
      "late-night": 1.00,
      "": 1.10,
    },
  };

  return coefficientMatrix[ageGroup]?.[postingTime] || 1.00;
}

/**
 * 地域名を正規化
 */
function normalizeRegionName(regionName: string): string {
  // 都道府県名の正規化
  const prefectureMap: Record<string, string> = {
    東京: "東京都",
    大阪: "大阪府",
    京都: "京都府",
    兵庫: "兵庫県",
    神奈川: "神奈川県",
    愛知: "愛知県",
    福岡: "福岡県",
    北海道: "北海道",
    宮城: "宮城県",
    広島: "広島県",
    埼玉: "埼玉県",
    千葉: "千葉県",
  };

  let normalized = regionName;
  
  // 都道府県名の正規化
  for (const [key, value] of Object.entries(prefectureMap)) {
    if (normalized.includes(key) && !normalized.includes(value)) {
      normalized = normalized.replace(key, value);
    }
  }

  return normalized;
}

/**
 * 地域限定係数を取得
 */
function getRegionCoefficient(
  regionRestriction: string | undefined,
  regionName: string | undefined,
  operationPurpose: string
): number {
  if (!regionRestriction || regionRestriction === "none" || !regionName) {
    return 1.00;
  }

  // 基本係数（地域限定はリーチ範囲が狭まる）
  const baseCoefficient = 0.75;

  // 運用目的別の補正
  let purposeMultiplier = 1.0;
  switch (operationPurpose) {
    case "来店・問い合わせを増やしたい":
      purposeMultiplier = 1.20;
      break;
    case "認知拡大":
      purposeMultiplier = 0.90;
      break;
    case "採用・リクルーティング強化":
      purposeMultiplier = 1.10;
      break;
    default:
      purposeMultiplier = 1.00;
  }

  // 人口規模係数
  let populationCoefficient = 1.00;
  const normalizedRegion = normalizeRegionName(regionName);
  
  if (normalizedRegion.includes("東京都")) {
    populationCoefficient = 1.15;
  } else if (
    normalizedRegion.includes("大阪府") ||
    normalizedRegion.includes("愛知県") ||
    normalizedRegion.includes("神奈川県")
  ) {
    populationCoefficient = 1.10;
  } else if (
    normalizedRegion.includes("福岡") ||
    normalizedRegion.includes("仙台") ||
    normalizedRegion.includes("札幌") ||
    normalizedRegion.includes("横浜") ||
    normalizedRegion.includes("名古屋") ||
    normalizedRegion.includes("京都") ||
    normalizedRegion.includes("神戸") ||
    normalizedRegion.includes("広島") ||
    normalizedRegion.includes("北九州") ||
    normalizedRegion.includes("川崎") ||
    normalizedRegion.includes("さいたま") ||
    normalizedRegion.includes("千葉") ||
    normalizedRegion.includes("堺")
  ) {
    populationCoefficient = 1.05; // 政令指定都市
  }

  return baseCoefficient * purposeMultiplier * populationCoefficient;
}

/**
 * リスク分析を実行
 */
function analyzeRisks(
  postingScore: number,
  feedCoefficient: number,
  reelCoefficient: number,
  storyFrequency: string | undefined,
  currentFollowers: number,
  growthRate: number,
  operationPurpose: string,
  regionRestriction: string | undefined,
  _achievementRate: number
): Risk[] {
  const risks: Risk[] = [];

  // 【リスク1】投稿頻度の維持
  let frequencyRiskProbability = 0;
  if (postingScore >= 1.5) {
    frequencyRiskProbability = 10;
  } else if (postingScore >= 1.2) {
    frequencyRiskProbability = 20;
  } else if (postingScore >= 0.9) {
    frequencyRiskProbability = 35;
  } else if (postingScore >= 0.6) {
    frequencyRiskProbability = 50;
  } else {
    frequencyRiskProbability = 70;
  }

  if (storyFrequency === "daily") {
    frequencyRiskProbability += 10;
  }

  if (currentFollowers < 100) {
    frequencyRiskProbability += 15;
  }

  let frequencyRiskImpact = 0;
  if (postingScore >= 1.2) {
    frequencyRiskImpact = -25;
  } else if (postingScore >= 0.9) {
    frequencyRiskImpact = -15;
  } else {
    frequencyRiskImpact = -10;
  }

  const frequencyRiskSeverity: "高リスク" | "中リスク" | "低リスク" =
    frequencyRiskProbability >= 50
      ? "高リスク"
      : frequencyRiskProbability >= 30
      ? "中リスク"
      : "低リスク";

  const frequencyCountermeasures: string[] = [];
  if (postingScore >= 1.2) {
    frequencyCountermeasures.push("週次で投稿計画を立て、事前に3投稿分ストック");
    frequencyCountermeasures.push("Metaビジネススイートで予約投稿を設定");
    frequencyCountermeasures.push("制作時間を1投稿30分以内に短縮するテンプレート作成");
  } else if (postingScore >= 0.6) {
    frequencyCountermeasures.push("投稿ストックを2週間分作成");
    frequencyCountermeasures.push("予約投稿機能の活用");
    frequencyCountermeasures.push("テンプレート化で制作時間短縮");
  } else {
    frequencyCountermeasures.push("最低限の投稿頻度を維持(週1回は確実に)");
    frequencyCountermeasures.push("ストック作成とスケジュール管理");
  }

  if (storyFrequency === "daily") {
    frequencyCountermeasures.push("ストーリーズは日常のスキマ時間で撮影(完璧を求めない)");
  }

  risks.push({
    category: "投稿頻度の維持",
    type: "運用リスク",
    probability: frequencyRiskProbability,
    impact: frequencyRiskImpact,
    severity: frequencyRiskSeverity,
    countermeasures: frequencyCountermeasures,
    score: frequencyRiskProbability * Math.abs(frequencyRiskImpact),
    keyAdvice: "投稿頻度の維持が計画達成の鍵です。ストック作成とスケジュール管理を徹底しましょう。",
  });

  // 【リスク2】リーチ数の伸び悩み
  let reachRiskProbability = 0;
  if (growthRate >= 40) {
    reachRiskProbability = 60;
  } else if (growthRate >= 25) {
    reachRiskProbability = 45;
  } else if (growthRate >= 15) {
    reachRiskProbability = 30;
  } else if (growthRate >= 10) {
    reachRiskProbability = 20;
  } else {
    reachRiskProbability = 10;
  }

  if (reelCoefficient < 0.6) {
    reachRiskProbability += 20;
  }

  if (currentFollowers < 300) {
    reachRiskProbability += 15;
  }

  if (
    regionRestriction === "restricted" &&
    operationPurpose !== "来店・問い合わせを増やしたい"
  ) {
    reachRiskProbability += 10;
  }

  let reachRiskImpact = 0;
  if (growthRate >= 25) {
    reachRiskImpact = -30;
  } else if (growthRate >= 15) {
    reachRiskImpact = -20;
  } else {
    reachRiskImpact = -10;
  }

  const reachCountermeasures: string[] = [];
  if (reelCoefficient < 1.0) {
    reachCountermeasures.push("リール投稿を週1回増やす(発見タブ露出を狙う)");
  }
  reachCountermeasures.push("ハッシュタグの見直し(月1回、投稿後の分析から)");
  if (operationPurpose === "認知拡大") {
    reachCountermeasures.push("トレンド音源の積極活用");
    reachCountermeasures.push("保存されやすいHow-toコンテンツを増やす");
  }
  if (currentFollowers < 300) {
    reachCountermeasures.push("フォロワーへの積極的なコメント・エンゲージ");
  }

  risks.push({
    category: "リーチ数の伸び悩み",
    type: "成長リスク",
    probability: reachRiskProbability,
    impact: reachRiskImpact,
    severity:
      reachRiskProbability >= 50
        ? "高リスク"
        : reachRiskProbability >= 30
        ? "中リスク"
        : "低リスク",
    countermeasures: reachCountermeasures,
    score: reachRiskProbability * Math.abs(reachRiskImpact),
    keyAdvice: "リーチ数を伸ばすには、リール投稿とハッシュタグ戦略が重要です。",
  });

  // 【リスク3】エンゲージメント率の低下
  let engagementRiskProbability = 0;
  if (feedCoefficient < 0.6) {
    engagementRiskProbability = 35;
  }

  if (storyFrequency === "none" || !storyFrequency) {
    engagementRiskProbability += 20;
  }

  if (
    operationPurpose === "ファンを作りたい" &&
    (storyFrequency === "none" || !storyFrequency)
  ) {
    engagementRiskProbability += 15;
  }

  if (currentFollowers >= 5000) {
    engagementRiskProbability += 10;
  }

  let engagementRiskImpact = 0;
  if (operationPurpose === "ファンを作りたい") {
    engagementRiskImpact = -25;
  } else if (
    operationPurpose === "商品・サービスの販売促進" ||
    operationPurpose === "来店・問い合わせを増やしたい"
  ) {
    engagementRiskImpact = -20;
  } else {
    engagementRiskImpact = -10;
  }

  const engagementCountermeasures: string[] = [
    "キャプションで質問を投げかける(コメントを誘発)",
    "ストーリーズのアンケート・質問機能を活用",
    "フォロワーのコメントに24時間以内に返信",
  ];

  if (storyFrequency === "none" || !storyFrequency) {
    engagementCountermeasures.push("ストーリーズを週2-3回投稿し、日常を見せる");
  }

  if (operationPurpose === "ファンを作りたい") {
    engagementCountermeasures.push("ユーザー参加型企画(フォトコンテストなど)を月1回実施");
  }

  risks.push({
    category: "エンゲージメント率の低下",
    type: "品質リスク",
    probability: engagementRiskProbability,
    impact: engagementRiskImpact,
    severity:
      engagementRiskProbability >= 50
        ? "高リスク"
        : engagementRiskProbability >= 30
        ? "中リスク"
        : "低リスク",
    countermeasures: engagementCountermeasures,
    score: engagementRiskProbability * Math.abs(engagementRiskImpact),
    keyAdvice: "エンゲージメント向上には、双方向のコミュニケーションが不可欠です。",
  });

  // 【リスク4】フォロワーの質の低下
  let followerQualityRisk = 0;
  if (growthRate >= 40) {
    followerQualityRisk = 40;
  } else if (growthRate >= 25) {
    followerQualityRisk = 25;
  } else {
    followerQualityRisk = 10;
  }

  if (operationPurpose === "認知拡大" && reelCoefficient >= 1.4) {
    followerQualityRisk += 15;
  }

  let qualityRiskImpact = -15;
  if (
    operationPurpose === "商品・サービスの販売促進" ||
    operationPurpose === "採用・リクルーティング強化"
  ) {
    qualityRiskImpact = -25;
  }

  const qualityCountermeasures: string[] = [
    "ターゲット層が使うニッチハッシュタグを中心に選定",
    "プロフィールに明確なターゲット像を記載",
    "投稿内容をペルソナに一貫させる",
  ];

  if (regionRestriction === "restricted") {
    qualityCountermeasures.push("位置情報タグを毎回付け、地域密着を明確に");
  }

  risks.push({
    category: "フォロワーの質の低下",
    type: "成長リスク",
    probability: followerQualityRisk,
    impact: qualityRiskImpact,
    severity:
      followerQualityRisk >= 40
        ? "高リスク"
        : followerQualityRisk >= 25
        ? "中リスク"
        : "低リスク",
    countermeasures: qualityCountermeasures,
    score: followerQualityRisk * Math.abs(qualityRiskImpact),
    keyAdvice: "質の高いフォロワー獲得には、ターゲットを明確にした一貫したコンテンツ戦略が必要です。",
  });

  // リスクスコアでソートし、上位3件を返す（確率20%以上のみ）
  return risks
    .filter((r) => r.probability >= 20)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

/**
 * 推奨事項を生成
 */
function generateRecommendations(
  achievementRate: number,
  postingScore: number,
  feedCoefficient: number,
  reelCoefficient: number,
  growthRate: number,
  storyCoefficient?: number,
  targetTimeCoefficient?: number,
  regionCoefficient?: number
): string[] {
  const recommendations: string[] = [];

  if (achievementRate < 30) {
    recommendations.push("目標を下げることを検討してください");
  }

  if (postingScore < 0.6) {
    if (feedCoefficient === 0) {
      recommendations.push("フィード投稿を週1-2回から始めましょう");
    }
    if (reelCoefficient === 0) {
      recommendations.push("リール投稿を週1-2回追加すると効果的です");
    }
    if (feedCoefficient > 0 && reelCoefficient === 0) {
      recommendations.push("リール投稿を追加すると発見タブでの露出が増えます");
    }
  }

  if (growthRate > 40) {
    recommendations.push("成長率が高いため、目標を段階的に設定することをおすすめします");
  }

  if (postingScore >= 1.2 && achievementRate < 50) {
    recommendations.push("投稿頻度は十分です。コンテンツの質やエンゲージメント向上に注力しましょう");
  }

  if (achievementRate >= 60) {
    recommendations.push("現実的な目標です。継続的な投稿で達成可能です");
  }

  // オプション設定に関する推奨事項
  if (storyCoefficient && storyCoefficient > 1.2) {
    recommendations.push("ストーリーズ投稿が効果的に機能しています");
  } else if (growthRate >= 30 && (!storyCoefficient || storyCoefficient <= 1.0)) {
    recommendations.push("ストーリーズ投稿を追加するとエンゲージメントが向上します");
  }

  if (targetTimeCoefficient && targetTimeCoefficient < 1.0) {
    recommendations.push("投稿時間帯を最適化すると効果が上がります");
  }

  if (regionCoefficient && regionCoefficient < 0.8) {
    recommendations.push("地域限定がリーチに影響している可能性があります");
  }

  return recommendations;
}

function generateSuggestedAdjustments(
  body: PlanSimulationRequest,
  achievementRate: number,
  growthRate: number
): SuggestedAdjustment[] {
  const adjustments: SuggestedAdjustment[] = [];
  const increase = body.targetFollowers - body.currentFollowers;

  if (achievementRate < 60 && (body.weeklyPosts === "none" || body.weeklyPosts === "weekly-1-2")) {
    adjustments.push({
      field: "weeklyPosts",
      value: "weekly-3-4",
      label: "フィード投稿を週3-4回に増やす",
      reason: "投稿頻度を上げると到達母数を増やしやすくなります。",
      expectedImpact: "達成率の改善が見込めます",
    });
  }

  if (achievementRate < 60 && (body.reelCapability === "none" || body.reelCapability === "weekly-1-2")) {
    adjustments.push({
      field: "reelCapability",
      value: "weekly-3-4",
      label: "リール投稿を週3-4回に増やす",
      reason: "リール強化は発見経由の流入に直結しやすいです。",
      expectedImpact: "新規リーチの改善が見込めます",
    });
  }

  if (growthRate >= 30 && (!body.storyFrequency || body.storyFrequency === "none")) {
    adjustments.push({
      field: "storyFrequency",
      value: "weekly-3-4",
      label: "ストーリーズを週3-4回に設定する",
      reason: "高い成長目標では接触頻度の追加が有効です。",
      expectedImpact: "エンゲージメント改善が見込めます",
    });
  }

  if (body.targetAudience && body.postingTime && body.postingTime !== "") {
    adjustments.push({
      field: "postingTime",
      value: "",
      label: "投稿時間帯をAI最適化に戻す",
      reason: "固定時間よりも最適時間探索のほうが成果が安定する場合があります。",
      expectedImpact: "時間帯ミスマッチのリスク低減",
    });
  }

  if (
    body.regionRestriction === "restricted" &&
    body.operationPurpose !== "来店・問い合わせを増やしたい" &&
    body.operationPurpose !== "採用・リクルーティング強化"
  ) {
    adjustments.push({
      field: "regionRestriction",
      value: "none",
      label: "地域限定を解除する",
      reason: "認知拡大系の目標では配信範囲を広げるほうが有利です。",
      expectedImpact: "リーチ拡大が見込めます",
    });
  }

  if (achievementRate < 30 && increase > 5) {
    const reducedIncrease = Math.max(5, Math.round(increase * 0.7));
    adjustments.push({
      field: "customTargetFollowers",
      value: reducedIncrease,
      label: `目標増加数を+${reducedIncrease}人に調整する`,
      reason: "段階的な目標に分解すると達成可能性が上がります。",
      expectedImpact: "実行負荷の低減が見込めます",
    });
  }

  if (adjustments.length === 0) {
    if (!body.storyFrequency || body.storyFrequency === "none") {
      adjustments.push({
        field: "storyFrequency",
        value: "weekly-1-2",
        label: "ストーリーズを週1-2回追加する",
        reason: "まずは軽い接触頻度の追加から始めると、運用負荷を抑えて改善できます。",
        expectedImpact: "継続運用の安定化が見込めます",
      });
    } else if (body.weeklyPosts !== "daily") {
      adjustments.push({
        field: "weeklyPosts",
        value: body.weeklyPosts === "weekly-1-2" ? "weekly-3-4" : "daily",
        label: "フィード投稿を1段階増やす",
        reason: "現在の運用が安定しているため、次の成長余地を作るフェーズです。",
        expectedImpact: "追加成長の余地を作れます",
      });
    } else if (body.reelCapability !== "daily") {
      adjustments.push({
        field: "reelCapability",
        value: body.reelCapability === "weekly-1-2" ? "weekly-3-4" : "daily",
        label: "リール投稿を1段階増やす",
        reason: "発見面の露出をさらに増やす余地があります。",
        expectedImpact: "新規接触増加が見込めます",
      });
    } else {
      const reducedIncrease = Math.max(5, Math.round(increase * 0.9));
      adjustments.push({
        field: "customTargetFollowers",
        value: reducedIncrease,
        label: `目標増加数を+${reducedIncrease}人に微調整する`,
        reason: "運用負荷と達成確度のバランスを取りやすくします。",
        expectedImpact: "目標の安定達成が見込めます",
      });
    }
  }

  return adjustments.slice(0, 4);
}

/**
 * 計画シミュレーションAPI
 * 
 * フロントエンドからはブラックボックスとして扱う
 * 詳細な係数と計算式に基づいて達成可能性を計算
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "plan-simulation", limit: 20, windowSeconds: 60 },
      auditEventName: "plan_simulation",
    });

    const body: PlanSimulationRequest = await request.json();

    // バリデーション
    if (
      !body.currentFollowers ||
      !body.targetFollowers ||
      !body.operationPurpose ||
      !body.weeklyPosts ||
      !body.reelCapability
    ) {
      return NextResponse.json(
        { error: "必須項目が不足しています" },
        { status: 400 }
      );
    }

    const currentFollowers = body.currentFollowers;
    const targetFollowers = body.targetFollowers;
    const increase = targetFollowers - currentFollowers;
    const growthRate = (increase / currentFollowers) * 100;

    // 1. 成長率難易度係数
    const baseAchievementRate = getBaseAchievementRate(growthRate);

    // 2. 投稿頻度係数
    const feedCoefficient = getFeedPostCoefficient(body.weeklyPosts);
    const reelCoefficient = getReelPostCoefficient(body.reelCapability);
    const postingScore =
      feedCoefficient * 0.4 + reelCoefficient * 0.6;
    const postingFrequencyCorrection =
      getPostingFrequencyCorrection(postingScore);

    // 3. 現在フォロワー規模係数
    const followerScaleCoefficient =
      getFollowerScaleCoefficient(currentFollowers);

    // 4. 運用目的マッチング係数
    const purposeMatchingCoefficient = getPurposeMatchingCoefficient(
      body.operationPurpose,
      feedCoefficient,
      reelCoefficient
    );

    // 5. オプション設定の係数
    const storyCoefficient = getStoryCoefficient(
      body.storyFrequency,
      body.operationPurpose,
      growthRate
    );
    const targetTimeCoefficient = getTargetTimeCoefficient(
      body.targetAudience,
      body.postingTime
    );
    const regionCoefficient = getRegionCoefficient(
      body.regionRestriction,
      body.regionName,
      body.operationPurpose
    );

    // 6. 最終達成可能性の計算
    const achievementRate =
      baseAchievementRate *
      postingFrequencyCorrection *
      followerScaleCoefficient *
      purposeMatchingCoefficient *
      storyCoefficient *
      targetTimeCoefficient *
      regionCoefficient *
      100;
    const roundedAchievementRate = Math.round(achievementRate * 10) / 10;

    // 難易度ラベルを取得
    const difficulty = {
      ...getDifficultyLabel(achievementRate),
      achievementRate: roundedAchievementRate,
    };

    // 必要KPIを計算
    const requiredKPIs = calculateRequiredKPIs(
      increase,
      currentFollowers,
      postingScore
    );

    // リスク分析を実行
    const risks = analyzeRisks(
      postingScore,
      feedCoefficient,
      reelCoefficient,
      body.storyFrequency,
      currentFollowers,
      growthRate,
      body.operationPurpose,
      body.regionRestriction,
      achievementRate
    );

    // 推奨事項を生成
    const recommendations = generateRecommendations(
      achievementRate,
      postingScore,
      feedCoefficient,
      reelCoefficient,
      growthRate,
      storyCoefficient,
      targetTimeCoefficient,
      regionCoefficient
    );
    const suggestedAdjustments = generateSuggestedAdjustments(
      body,
      achievementRate,
      growthRate
    );

    // 影響度の内訳を計算
    const impactBreakdown = {
      story: {
        label: storyCoefficient > 1.0 
          ? `ストーリーズ${body.storyFrequency === "daily" ? "毎日" : body.storyFrequency === "weekly-3-4" ? "週3-4回" : "週1-2回"}投稿`
          : "ストーリーズ未設定",
        impact: storyCoefficient > 1.0 
          ? `+${Math.round((storyCoefficient - 1.0) * 100)}%`
          : "影響なし",
      },
      time: {
        label: targetTimeCoefficient > 1.0 
          ? "投稿時間帯の最適化"
          : targetTimeCoefficient < 1.0
          ? "投稿時間帯の改善余地"
          : "投稿時間帯未設定",
        impact: targetTimeCoefficient > 1.0
          ? `+${Math.round((targetTimeCoefficient - 1.0) * 100)}%`
          : targetTimeCoefficient < 1.0
          ? `${Math.round((targetTimeCoefficient - 1.0) * 100)}%`
          : "影響なし",
      },
      region: {
        label: regionCoefficient !== 1.0
          ? regionCoefficient > 1.0 
            ? `地域×目的のマッチ(${body.regionName})`
            : `地域限定(${body.regionName})`
          : "地域限定なし",
        impact: regionCoefficient > 1.0
          ? `+${Math.round((regionCoefficient - 1.0) * 100)}%`
          : regionCoefficient < 1.0
          ? `${Math.round((regionCoefficient - 1.0) * 100)}%`
          : "影響なし",
      },
    };

    const result: SimulationResult = {
      achievementRate: roundedAchievementRate,
      difficulty,
      requiredKPIs,
      postingScore: Math.round(postingScore * 100) / 100,
      postingFrequencyCorrection: Math.round(
        postingFrequencyCorrection * 100
      ) / 100,
      followerScaleCoefficient: Math.round(
        followerScaleCoefficient * 100
      ) / 100,
      purposeMatchingCoefficient: Math.round(
        purposeMatchingCoefficient * 100
      ) / 100,
      baseAchievementRate: Math.round(baseAchievementRate * 100) / 100,
      storyCoefficient: Math.round(storyCoefficient * 100) / 100,
      targetTimeCoefficient: Math.round(targetTimeCoefficient * 100) / 100,
      regionCoefficient: Math.round(regionCoefficient * 100) / 100,
      impactBreakdown,
      risks,
      recommendations,
      suggestedAdjustments,
    };

    return NextResponse.json({ simulation: result });
  } catch (error) {
    console.error("計画シミュレーションエラー:", error);
    return NextResponse.json(
      { error: "シミュレーションの生成に失敗しました" },
      { status: 500 }
    );
  }
}
