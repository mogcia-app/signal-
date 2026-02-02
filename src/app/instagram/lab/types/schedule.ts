// スケジュール関連の型定義

// スケジュール内の投稿アイテム
export interface SchedulePost {
  title: string;
  description: string;
  emoji: string;
  category: string;
}

// スケジュール内の1日のデータ
export interface ScheduleDay {
  day: string;
  dayName: string;
  posts: SchedulePost[];
}

// スケジュール全体（7日間）
export type GeneratedSchedule = ScheduleDay[];

// スケジュール生成APIのレスポンス
export interface ScheduleGenerationResponse {
  success: boolean;
  schedule: GeneratedSchedule;
  timestamp?: string;
  isIPadOptimized?: boolean;
  error?: string;
  details?: string;
}

// スケジュール保存APIのリクエスト
export interface ScheduleSaveRequest {
  scheduleType: "feed" | "reel" | "story";
  scheduleData: GeneratedSchedule;
  monthlyPosts: number;
  dailyPosts: number;
  businessInfo?: unknown;
}

// スケジュール保存APIのレスポンス
export interface ScheduleSaveResponse {
  success: boolean;
  schedule?: {
    schedule: GeneratedSchedule;
    monthlyPosts: number;
    dailyPosts: number;
  };
  error?: string;
}

