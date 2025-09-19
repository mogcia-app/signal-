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
