/**
 * PlanInput（ユーザー意図）
 * 
 * 責務: ユーザーが「やりたいこと」を表現
 * 使用箇所: PlanForm（入力画面）
 */

export interface PlanInput {
  userId: string
  snsType: string
  currentFollowers: number
  targetFollowers: number
  operationPurpose: string
  weeklyPosts: "none" | "weekly-1-2" | "weekly-3-4" | "daily"
  reelCapability: "none" | "weekly-1-2" | "weekly-3-4" | "daily"
  storyFrequency: "none" | "weekly-1-2" | "weekly-3-4" | "daily"
  targetAudience?: string
  postingTime?: string
  regionRestriction?: string
  regionName?: string
  startDate: string
  // 任意項目
  [key: string]: unknown
}

/**
 * PlanInputのバリデーション
 */
export function validatePlanInput(input: Partial<PlanInput>): input is PlanInput {
  return !!(
    input.userId &&
    input.snsType &&
    typeof input.currentFollowers === "number" &&
    typeof input.targetFollowers === "number" &&
    input.targetFollowers > input.currentFollowers &&
    input.operationPurpose &&
    input.weeklyPosts &&
    input.reelCapability &&
    input.startDate
  )
}



