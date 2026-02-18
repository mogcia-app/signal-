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
  targetFollowerOption?: "conservative" | "standard" | "ambitious" | "custom" | "ai"
  customTargetFollowers?: string
  operationPurpose: string
  weeklyPosts: "none" | "weekly-1-2" | "weekly-3-4" | "daily"
  reelCapability: "none" | "weekly-1-2" | "weekly-3-4" | "daily"
  storyFrequency: "none" | "weekly-1-2" | "weekly-3-4" | "daily"
  feedDays?: string[]
  reelDays?: string[]
  storyDays?: string[]
  targetAudience?: string
  postingTime?: string
  regionRestriction?: string
  regionName?: string
  startDate: string
  simulationResult?: Record<string, unknown> | null
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





