/**
 * ExecutionState（実行状態）
 * 
 * 責務: 「今ユーザーが何をすべきか」
 * 使用箇所: Home画面（表示）
 */

import { WeeklySchedule } from "@/types/home"
import { AIDirection } from "@/types/ai"

export interface ExecutionState {
  strategyPlanId: string
  userId: string
  currentWeek: number
  currentDate: Date
  
  // 今日のタスク
  todayTasks: Array<{
    type: "feed" | "reel" | "story"
    description: string
    time: string
    day: string
  }>
  
  // 明日の準備
  tomorrowPreparation: Array<{
    type: "feed" | "reel" | "story"
    description: string
    time: string
    day: string
  }>
  
  // 今週の予定（null許可）
  weeklySchedule: WeeklySchedule | null
  
  // 今月の目標
  monthlyGoals: Array<{
    metric: string
    target: string
  }>
  
  // AI方向性（オプション、後で追加される）
  aiDirection?: AIDirection | null
  
  lastUpdated: Date
}

