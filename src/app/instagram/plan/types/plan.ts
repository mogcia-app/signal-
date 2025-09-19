// フォームデータの型定義
export interface PlanFormData {
  goalName: string;
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
  // 拡張要素
  growthCurve?: {
    month1: number;
    month2: number;
    month3: number;
    total: number;
  };
  riskFactors?: string[];
  successProbability?: number; // 成功確率（0-100%）
  recommendedBudget?: number;
  competitorAnalysis?: {
    avgGrowthRate: number;
    marketPosition: string;
    opportunities: string[];
  };
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
  contentQuality?: 'low' | 'medium' | 'high'; // コンテンツ品質
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
  riskLevel: 'low' | 'medium' | 'high';
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

// 機械学習予測関連の型定義
export interface MLPredictionRequest {
  currentFollowers: number;
  currentEngagementRate: number;
  avgPostsPerWeek: number;
  accountAge: number;
  niche: string;
  contentTypes: string[];
  postingTime: 'morning' | 'afternoon' | 'evening' | 'mixed';
  hashtagCount: number;
  storyFrequency: number;
  reelFrequency: number;
  followerGain: number;
  planPeriod: string;
  goalCategory: string;
  [key: string]: unknown; // インデックスシグネチャを追加
}

export interface MLPredictionResult {
  predictedGrowth: {
    month1: number;
    month3: number;
    month6: number;
    month12: number;
  };
  confidence: number; // 予測の信頼度（0-1）
  keyFactors: {
    factor: string;
    impact: number; // 影響度（-1 to 1）
    recommendation: string;
  }[];
  seasonalAdjustments: {
    month: string;
    adjustment: number; // 季節調整係数
    reason: string;
  }[];
  growthPattern: {
    phase: string;
    description: string;
    expectedGrowth: number;
  }[];
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    mitigation: string[];
  };
  // PDCA学習統合用の追加プロパティ
  learningBoost?: number;
  message?: string;
}

// PDCA学習システム関連の型定義
export interface PDCARecord {
  id: string;
  userId: string;
  planId: string;
  phase: 'plan' | 'do' | 'check' | 'act';
  startDate: string;
  endDate: string;
  targetMetrics: {
    followerGain: number;
    engagementRate: number;
    reach: number;
  };
  actualMetrics: {
    followerGain: number;
    engagementRate: number;
    reach: number;
    posts: number;
    stories: number;
    reels: number;
  };
  strategies: string[];
  contentTypes: string[];
  insights: string[];
  lessons: string[];
  nextActions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TrendAnalysis {
  period: string;
  averageGrowth: number;
  growthTrend: 'increasing' | 'stable' | 'decreasing';
  bestStrategies: string[];
  worstStrategies: string[];
  seasonalPatterns: {
    month: string;
    performance: number;
  }[];
  contentPerformance: {
    type: string;
    avgEngagement: number;
    avgReach: number;
  }[];
  recommendations: string[];
}

export interface LearningModel {
  accuracy: number;
  lastUpdated: string;
  dataPoints: number;
  predictions: {
    followerGrowth: number;
    engagementRate: number;
    reach: number;
  };
  confidence: number;
  improvements: string[];
}
