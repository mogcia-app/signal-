/**
 * ホームページ関連の型定義
 */

// AIPlanSuggestion型定義（プランページ削除のため直接定義）
export interface AIPlanSuggestion {
  weeklyTasks?: Array<{
    day: string;
    type: "feed" | "reel" | "story";
    description: string;
    time?: string;
  }>;
  monthlyStrategy?: Array<{
    week: number;
    theme: string;
    actions: string[];
  }>;
  weeklyPlans?: Array<{
    week: number;
    startDate: string;
    endDate: string;
    tasks: Array<{
      day: string;
      type: "feed" | "reel" | "story" | "feed+reel";
      description: string;
      time: string;
    }>;
  }>;
  monthlyGoals: Array<{
    metric: string;
    target: string;
  }>;
  recommendedPostingTimes?: Array<{
    type: "feed" | "reel" | "story";
    times: string[];
  }>;
  strategyUrl?: string;
}

export interface TodayTask {
  time: string;
  type: string;
  description: string;
  tip?: string;
  generatedContent?: string;
  generatedHashtags?: string[];
  reason?: string; // 方針との関連性（なぜこれか）
}

export interface TomorrowPreparation {
  time: string;
  type: string;
  description: string;
  preparation: string;
}

export interface MonthlyGoal {
  metric: string;
  target: string;
  progress?: number;
}

export interface WeeklyScheduleTask {
  day: string;
  date?: string;
  time: string;
  type: string;
  description: string;
}

export interface WeeklySchedule {
  week: number;
  theme: string | null;
  actions?: string[];
  tasks: WeeklyScheduleTask[];
  startDate?: string;
  endDate?: string;
  targetFollowers?: number;
  increase?: number;
  storyContent?: string | string[];
}

export interface AISections {
  todayTasks: TodayTask[];
  tomorrowPreparation: TomorrowPreparation[];
  monthlyGoals: MonthlyGoal[];
  weeklySchedule: WeeklySchedule | null;
  aiDirection?: {
    mainTheme: string;
    priorityKPI: string;
    avoidFocus: string[];
    postingRules: string[];
    lockedAt?: string | null; // 確定状態を表示するために追加
  } | null;
}

export interface WeeklyKPIs {
  thisWeek: {
    likes: number;
    comments: number;
    followers: number;
  };
  lastWeek?: {
    likes: number;
    comments: number;
    followers: number;
  };
  changes?: {
    likes: number;
    comments: number;
    followers: number;
  };
}

export interface CurrentPlan {
  id?: string;
  planPeriod?: string;
  userId?: string;
  snsType?: string;
  status?: string;
  title?: string;
  targetFollowers?: number;
  currentFollowers?: number;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  createdAt?: string | Date | null;
  // その他の動的なプロパティ（拡張性のため）
  [key: string]: unknown;
}

export interface CurrentWeekTask {
  day: string;
  task: string;
}

export interface MonthlyProgress {
  strategy?: string;
  progress?: number;
  totalDays?: number;
  completedDays?: number;
  // その他の動的なプロパティ（拡張性のため）
  [key: string]: unknown;
}

export interface DashboardData {
  currentPlan?: CurrentPlan | null;
  weeklyKPIs?: WeeklyKPIs;
  weeklySchedule?: WeeklySchedule;
  monthlyProgress?: MonthlyProgress | null;
  currentWeekTasks?: CurrentWeekTask[];
  currentMonthGoals?: MonthlyGoal[];
  aiSuggestion?: AIPlanSuggestion | null;
  todayTasks?: TodayTask[];
  simulationResult?: {
    requiredKPIs?: {
      monthlyReach: number;
      profileViews: number;
      engagementRate: string;
      saves: number;
      newFollowers: number;
    };
    [key: string]: unknown;
  } | null;
}

export interface DashboardResponse {
  success: boolean;
  data?: DashboardData;
  error?: string;
}

export interface AISectionsResponse {
  success: boolean;
  data?: AISections;
  error?: string;
}

