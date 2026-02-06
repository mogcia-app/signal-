/**
 * ホームページ関連の型定義
 */

// AIPlanSuggestion型をインポート（循環参照を避けるため型のみ）
import type { AIPlanSuggestion } from "../app/instagram/plan/types/plan";

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
  theme: string;
  actions: string[];
  tasks: WeeklyScheduleTask[];
  startDate?: string;
  endDate?: string;
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

