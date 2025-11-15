// フォームデータの型定義
export interface PlanFormData {
  planPeriod: string;
  currentFollowers: string;
  followerGain: string;
  goalCategory: string;
  otherGoal: string;
  targetAudience: string;
  aiHelpRequest: string;
  pastLearnings: string;
  brandConcept: string;
  colorVisual: string;
  tone: string;
  weeklyFocus: string;
  feedFreq: string;
  reelFreq: string;
  storyFreq: string;
  saveGoal: string;
  likeGoal: string;
  reachGoal: string;
  referenceAccounts: string;
  hashtagStrategy: string;
  constraints: string;
  freeMemo: string;
}

// シミュレーション結果の型定義
export interface SimulationResult {
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
  graphData: {
    data: Array<{
      week: string;
      realistic: number;
      userTarget: number;
    }>;
    realisticFinal: number;
    userTargetFinal: number;
    isRealistic: boolean;
    growthRateComparison: {
      realistic: number;
      userTarget: number;
    };
  };
  onePointAdvice: {
    type: "warning" | "success";
    title: string;
    message: string;
    advice: string;
  };
  alternativeOptions?: AlternativeOptions | null;
}

// 代替案の型定義
export interface AlternativeOptions {
  whyDifficult: string;
  realistic: AlternativeOption;
  moderate: AlternativeOption;
  phased: PhasedOption;
  extendedPeriod: ExtendedPeriodOption;
  otherStrategies: OtherStrategy[];
}

export interface AlternativeOption {
  targetFollowers: number;
  followerGain: number;
  monthlyGain: number;
  monthlyGrowthRate: number;
  feasibility: string;
  recommendation: string;
  pros: string[];
  cons: string[];
}

export interface PhasedOption {
  phase1: {
    targetFollowers: number;
    followerGain: number;
    duration: string;
    description: string;
  };
  phase2: {
    targetFollowers: number;
    followerGain: number;
    duration: string;
    description: string;
  };
  totalDuration: string;
  feasibility: string;
  recommendation: string;
  pros: string[];
  cons: string[];
}

export interface ExtendedPeriodOption {
  period: string;
  periodMultiplier: number;
  recommendation: string;
  pros: string[];
  cons: string[];
}

export interface OtherStrategy {
  title: string;
  description: string;
  estimatedBoost: string;
  cost: string;
  feasibility: string;
}

// デバッグ情報の型定義
export interface DebugInfo {
  step: string;
  requestData?: Record<string, unknown>;
  timestamp: string;
  status?: number;
  error?: string;
  details?: Record<string, unknown>;
  improvementTipsCount?: number;
  improvementTips?: string[];
}

// シミュレーションリクエストの型定義
export interface SimulationRequest {
  followerGain: number;
  currentFollowers: number;
  planPeriod: string;
  goalCategory: string;
  strategyValues: string[];
  postCategories: string[];
  hashtagStrategy: string;
  referenceAccounts: string;
  // 拡張要素（オプション）
  accountAge?: number; // アカウント開設からの月数
  currentEngagementRate?: number; // 現在のエンゲージメント率
  avgPostsPerWeek?: number; // 現在の週間投稿数
  contentQuality?: "low" | "medium" | "high"; // コンテンツ品質
  niche?: string; // ジャンル・ニッチ
  budget?: number; // 広告予算（月額）
  teamSize?: number; // 運営チーム人数
  [key: string]: unknown;
}

// AI診断結果の型定義
export interface AIDiagnosisResult {
  overallStrategy: string;
  postComposition: string;
  customerJourney: string;
  successTips: string;
  brandWorldview: {
    concept: string;
    mainColor: string;
    subColor: string;
    tone: string;
  };
  feedRecommendations: string[];
  reelRecommendations: string[];
  storyRecommendations: string[];
}

// A/Bテスト関連の型定義
export interface ABTestScenario {
  id: string;
  name: string;
  description: string;
  strategy: {
    postsPerWeek: { reel: number; feed: number; story: number };
    contentMix: Record<string, number>; // コンテンツタイプの比率
    postingSchedule: string[]; // 投稿時間
    hashtagStrategy: string;
    engagementStrategy: string;
  };
  expectedOutcome: {
    followerGrowth: number;
    engagementRate: number;
    reach: number;
  };
  riskLevel: "low" | "medium" | "high";
  resourceRequirement: {
    timePerWeek: number; // 週あたりの時間
    budget: number; // 月あたりの予算
    teamSize: number;
  };
  score?: number; // シナリオスコア
}

export interface ABTestComparison {
  scenarios: ABTestScenario[];
  winner: string;
  confidence: number;
  recommendation: string;
  timeline: {
    phase: string;
    duration: string;
    expectedResult: string;
  }[];
}

// 統一された計画データの型定義（全ページ共通）
export interface PlanData {
  id: string;
  userId: string;
  snsType: string;
  status: string;
  title: string;
  targetFollowers: number;
  currentFollowers: number;
  actualFollowers?: number;
  analyticsFollowerIncrease?: number;
  planPeriod: string;
  targetAudience: string;
  category: string;
  strategies: string[];
  postCategories: string[];
  createdAt: string | { toDate?: () => Date };
  updatedAt: string | { toDate?: () => Date };

  // シミュレーション結果（APIから返された完全なデータ）
  simulationResult?: Record<string, unknown> | null;

  // フォームデータ全体
  formData?: Record<string, unknown>;

  // AI戦略
  generatedStrategy?: string | null;
}

// デフォルトの計画データ
export const DEFAULT_PLAN_DATA: PlanData = {
  id: "default-plan",
  userId: "default-user",
  snsType: "instagram",
  status: "active",
  title: "Instagram成長加速計画",
  targetFollowers: 10000,
  currentFollowers: 3250,
  actualFollowers: 3250,
  analyticsFollowerIncrease: 0,
  planPeriod: "6ヶ月",
  targetAudience: "20〜30代女性",
  category: "フォロワー獲得",
  strategies: ["ハッシュタグ最適化", "ストーリー活用", "リール投稿", "エンゲージメント向上"],
  postCategories: ["ノウハウ", "実績紹介", "ビフォーアフター"],
  createdAt: "2024-09-01",
  updatedAt: "2024-09-01",
  simulationResult: {
    monthlyTarget: 500,
    feasibilityLevel: "high",
    feasibilityBadge: "達成可能",
  },
  formData: {},
  generatedStrategy: null,
};
