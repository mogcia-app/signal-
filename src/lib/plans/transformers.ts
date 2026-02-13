/**
 * 計画データ変換ユーティリティ
 * すべてのデータ変換ロジックを1箇所に集約
 */

/**
 * 週間投稿頻度を数値に変換
 * @param value - "none" | "weekly-1-2" | "weekly-3-4" | "daily" | number
 * @returns 週間投稿回数（数値）
 */
export function convertWeeklyPostsToNumber(value: string | number | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;
  if (value === "none") return 0;
  if (value === "weekly-1-2") return 1.5;
  if (value === "weekly-3-4") return 3.5;
  if (value === "daily") return 7;
  return 0;
}

/**
 * ストーリーズ投稿頻度を数値に変換
 * @param value - "none" | "weekly-1-2" | "weekly-3-4" | "daily" | number
 * @returns 週間ストーリーズ投稿回数（数値）
 */
export function convertStoryFrequencyToNumber(value: string | number | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;
  if (!value || value === "none") return 0;
  if (value === "weekly-1-2") return 2;
  if (value === "weekly-3-4") return 4;
  if (value === "daily") return 7;
  return 0;
}

/**
 * フォームデータをderiveWeeklyPlansが期待する形式に変換
 */
export interface NormalizedFormData {
  startDate: string;
  periodMonths: number;
  weeklyFeedPosts: number;
  weeklyReelPosts: number;
  weeklyStoryPosts: number;
  [key: string]: unknown;
}

/**
 * 生のformDataを正規化されたformDataに変換
 */
export function normalizeFormData(
  rawFormData: Record<string, unknown>,
  planStartDate?: Date | { toDate?: () => Date } | string | null
): NormalizedFormData {
  // startDateを取得
  let startDate: string;
  try {
    if (rawFormData.startDate && typeof rawFormData.startDate === "string") {
      const testDate = new Date(rawFormData.startDate);
      if (!isNaN(testDate.getTime())) {
        startDate = rawFormData.startDate;
      } else {
        throw new Error("Invalid date format");
      }
    } else if (planStartDate) {
      let startDateObj: Date | null = null;
      if (planStartDate instanceof Date) {
        startDateObj = planStartDate;
      } else if (typeof planStartDate === "object" && planStartDate !== null && "toDate" in planStartDate && typeof planStartDate.toDate === "function") {
        startDateObj = planStartDate.toDate();
      } else if (typeof planStartDate === "string") {
        startDateObj = new Date(planStartDate);
      }
      
      if (startDateObj && !isNaN(startDateObj.getTime())) {
        startDate = startDateObj.toISOString().split("T")[0];
      } else {
        throw new Error("Invalid planStartDate");
      }
    } else {
      startDate = new Date().toISOString().split("T")[0];
    }
  } catch (dateError) {
    console.error("[PlanTransformer] startDate取得エラー:", dateError);
    startDate = new Date().toISOString().split("T")[0];
  }

  return {
    startDate,
    periodMonths: (rawFormData.periodMonths as number) || 1,
    weeklyFeedPosts: (rawFormData.weeklyFeedPosts as number) || convertWeeklyPostsToNumber(rawFormData.weeklyPosts as string),
    weeklyReelPosts: (rawFormData.weeklyReelPosts as number) || convertWeeklyPostsToNumber(rawFormData.reelCapability as string),
    weeklyStoryPosts: (rawFormData.weeklyStoryPosts as number) || convertStoryFrequencyToNumber(rawFormData.storyFrequency as string),
    ...rawFormData, // 元のデータも保持
  };
}




