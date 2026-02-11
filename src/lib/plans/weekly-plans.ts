/**
 * weeklyPlans導出ユーティリティ
 * plan.formData + simulationResultからweeklyPlansを導出する
 */

import * as admin from "firebase-admin";

interface WeeklyPlan {
  week: number;
  startDate: string;
  endDate: string;
  tasks: Array<{
    day: string; // "月", "火", etc.
    type: "feed" | "reel" | "story";
    description: string;
    time: string;
  }>;
}

// 計画ページ参照: 削除した型定義の代替として内部定義
// 元の型定義は src/app/instagram/plan/types/plan.ts にあったが、計画ページ削除により削除
interface PlanFormData {
  startDate: string;
  periodMonths: number;
  weeklyFeedPosts: number;
  weeklyReelPosts: number;
  weeklyStoryPosts: number;
  [key: string]: unknown;
}

// 計画ページ参照: 削除した型定義の代替として内部定義
// 元の型定義は src/app/instagram/plan/types/plan.ts にあったが、計画ページ削除により削除
interface SimulationResult {
  [key: string]: unknown;
}

/**
 * plan.formData + simulationResultからweeklyPlansを導出
 */
export function deriveWeeklyPlans(
  formData: PlanFormData,
  simulationResult: SimulationResult | null
): WeeklyPlan[] {
  // formDataから投稿頻度を取得
  const weeklyFeedPosts = formData.weeklyFeedPosts || 0;
  const weeklyReelPosts = formData.weeklyReelPosts || 0;
  const weeklyStoryPosts = formData.weeklyStoryPosts || 0;
  
  // 計画開始日から各週の日付範囲を計算
  const startDate = new Date(formData.startDate);
  const periodMonths = formData.periodMonths || 1;
  const totalWeeks = periodMonths * 4;
  
  const weeklyPlans: WeeklyPlan[] = [];
  for (let week = 1; week <= totalWeeks; week++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() + (week - 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    // 投稿を週内に分散配置
    const tasks = distributePostsToWeek(
      week,
      weeklyFeedPosts,
      weeklyReelPosts,
      weeklyStoryPosts,
      weekStart
    );
    
    weeklyPlans.push({
      week,
      startDate: formatDate(weekStart),
      endDate: formatDate(weekEnd),
      tasks
    });
  }
  
  return weeklyPlans;
}

/**
 * 投稿を週内に分散配置
 */
function distributePostsToWeek(
  week: number,
  weeklyFeedPosts: number,
  weeklyReelPosts: number,
  weeklyStoryPosts: number,
  weekStart: Date
): Array<{
  day: string;
  type: "feed" | "reel" | "story";
  description: string;
  time: string;
}> {
  const tasks: Array<{
    day: string;
    type: "feed" | "reel" | "story";
    description: string;
    time: string;
  }> = [];
  
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
  
  // Feed投稿を分散
  for (let i = 0; i < weeklyFeedPosts; i++) {
    const dayIndex = Math.floor((i * 7) / weeklyFeedPosts) % 7;
    const day = dayNames[dayIndex];
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + dayIndex);
    
    tasks.push({
      day,
      type: "feed",
      description: "フィード投稿",
      time: "12:00"
    });
  }
  
  // Reel投稿を分散
  for (let i = 0; i < weeklyReelPosts; i++) {
    const dayIndex = Math.floor((i * 7) / weeklyReelPosts) % 7;
    const day = dayNames[dayIndex];
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + dayIndex);
    
    tasks.push({
      day,
      type: "reel",
      description: "リール投稿",
      time: "18:00"
    });
  }
  
  // Story投稿を分散
  for (let i = 0; i < weeklyStoryPosts; i++) {
    const dayIndex = Math.floor((i * 7) / weeklyStoryPosts) % 7;
    const day = dayNames[dayIndex];
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + dayIndex);
    
    tasks.push({
      day,
      type: "story",
      description: "ストーリー投稿",
      time: "20:00"
    });
  }
  
  // 日付順にソート
  tasks.sort((a, b) => {
    const dayOrder = ["日", "月", "火", "水", "木", "金", "土"];
    return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
  });
  
  return tasks;
}

/**
 * 日付をYYYY-MM-DD形式にフォーマット
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 週番号の判定（plan.startDate基準）
 * weekIndex = floor((localDate - startDate) / 7日)
 */
export function getCurrentWeekIndex(
  startDate: Date | admin.firestore.Timestamp | string | { toDate?: () => Date },
  localDate: string,
  timezone: string
): number {
  // startDateをDateオブジェクトに変換
  let startDateObj: Date;
  if (startDate instanceof Date) {
    startDateObj = startDate;
  } else if (typeof startDate === "object" && startDate !== null && "toDate" in startDate && typeof startDate.toDate === "function") {
    startDateObj = startDate.toDate();
  } else if (typeof startDate === "string") {
    startDateObj = new Date(startDate);
  } else {
    startDateObj = new Date();
  }
  
  // localDateをDateオブジェクトに変換
  const [year, month, day] = localDate.split("-").map(Number);
  const localDateObj = new Date(year, month - 1, day);
  
  // 日数の差分を計算
  const diffTime = localDateObj.getTime() - startDateObj.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // 週番号を計算（0-indexed）
  const weekIndex = Math.floor(diffDays / 7);
  
  return Math.max(0, weekIndex); // 負の値は0に
}

/**
 * 今日のタスクを抽出
 * localDateの曜日を取得し、weeklyPlans.tasks.dayにマッピングして一致するタスクを抽出
 */
export function extractTodayTasks(
  weeklyPlans: WeeklyPlan[],
  localDate: string,
  weekIndex: number
): Array<{
  day: string;
  type: "feed" | "reel" | "story";
  description: string;
  time: string;
}> {
  // localDateから曜日を取得
  const [year, month, day] = localDate.split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayOfWeek = dateObj.getDay(); // 0=日, 1=月, ..., 6=土
  
  // 曜日を文字列に変換
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
  const todayDayName = dayNames[dayOfWeek];
  
  // 現在の週を取得
  const currentWeek = weeklyPlans[weekIndex];
  
  if (!currentWeek) {
    return []; // 週が存在しない場合は空配列
  }
  
  // 今日のタスクを抽出
  const todayTasks = currentWeek.tasks.filter(task => {
    // "月" "月曜" "月曜日" などに対応
    return task.day === todayDayName || 
           task.day.startsWith(todayDayName) || 
           task.day === `${todayDayName}曜`;
  });
  
  // 一致するタスクが0件の場合、空配列を返す（休養日）
  return todayTasks;
}

