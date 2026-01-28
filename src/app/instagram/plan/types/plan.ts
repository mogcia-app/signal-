// 計画フォームデータの型定義
export interface PlanFormData {
  // 必須項目
  currentFollowers: number;
  targetFollowers: number;
  periodMonths: number; // 1固定（1ヶ月）
  startDate: string; // 開始日（YYYY-MM-DD形式）
  weeklyFeedPosts: number; // 0-7
  weeklyReelPosts: number; // 0-7
  weeklyStoryPosts: number; // 0-7
  mainGoal: string;
  preferredPostingTimes: string[]; // 投稿時間の希望（複数選択可）
  targetAudience: string; // どんな人に投稿を見てもらいたいか
  regionRestriction: {
    enabled: boolean;
    prefecture?: string;
    city?: string;
  };
  contentTypes: string[]; // どんな内容を投稿したいか（複数選択可）
  contentTypeOther?: string; // その他の内容
}

// シミュレーション結果の型定義
export interface SimulationResult {
  requiredMonthlyGrowthRate: number; // 必要月間成長率（%）
  difficultyScore: number; // 達成難易度スコア（%）
  difficultyLevel: "realistic" | "challenging" | "very-challenging" | "unrealistic";
  difficultyMessage: string;
  difficultyColor: "green" | "yellow" | "orange" | "red";
  weeklyPredictions: number[]; // 各週の予測フォロワー数
  estimatedWeeklyMinutes: number; // 週あたりの推定所要時間（分）
  timeBreakdown: {
    feed: number;
    reel: number;
    story: number;
    comments: number;
  };
  requiredActions: string[]; // 必要な取り組み
  alternativePlans?: AlternativePlan[]; // 代替案（非現実的な場合）
}

// 代替案の型定義
export interface AlternativePlan {
  id: string;
  name: string;
  targetFollowers: number;
  periodMonths: number;
  weeklyFeedPosts: number;
  weeklyReelPosts: number;
  weeklyStoryPosts: number;
  description: string;
}

// 業界平均成長率の型定義
export interface IndustryAverage {
  min: number;
  max: number;
  average: number;
}

// 保存用の計画データ
export interface SavedPlan {
  id: string;
  userId: string;
  formData: PlanFormData;
  simulationResult: SimulationResult;
  createdAt: Date;
  updatedAt: Date;
  status: "active" | "completed" | "archived";
}

// A/Bテスト用の型定義
export interface SimulationRequest {
  followerGain: number;
  currentFollowers: number;
  planPeriod: string;
  goalCategory?: "follower" | "engagement" | "reach";
  budget?: number;
  teamSize?: number;
  strategyValues?: string[];
  postCategories?: string[];
  hashtagStrategy?: string;
}

export interface ABTestScenario {
  id: string;
  name: string;
  description: string;
  strategy: {
    postsPerWeek: { reel: number; feed: number; story: number };
    contentMix: Record<string, number>;
    postingSchedule: string[];
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
    timePerWeek: number;
    budget: number;
    teamSize: number;
  };
  score?: number;
}

export interface ABTestComparison {
  scenarios: ABTestScenario[];
  winner: string;
  confidence: number;
  recommendation: string;
  timeline: Array<{
    phase: string;
    duration: string;
    expectedResult: string;
  }>;
}

// AI提案の型定義
export interface AIPlanSuggestion {
  weeklyTasks?: Array<{
    day: string;
    type: "feed" | "reel" | "story";
    description: string;
    time?: string; // 投稿時間（AIに任せる場合に提案される）
  }>;
  monthlyStrategy?: Array<{
    week: number; // 第1週、第2週など
    theme: string; // テーマ（例: "認知度を上げる"）
    actions: string[]; // アクションリスト
  }>;
  weeklyPlans?: Array<{
    week: number; // 第1週、第2週など
    startDate: string; // 開始日（例: "1/27"）
    endDate: string; // 終了日（例: "2/2"）
    tasks: Array<{
      day: string; // 月曜、火曜など
      type: "feed" | "reel" | "story" | "feed+reel";
      description: string;
      time: string; // 投稿時間
    }>;
  }>;
  monthlyGoals: Array<{
    metric: string;
    target: string;
  }>;
  recommendedPostingTimes?: Array<{
    type: "feed" | "reel" | "story";
    times: string[]; // 例: ["9:00", "18:00"]
  }>;
  strategyUrl?: string;
}

