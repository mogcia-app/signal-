/**
 * 計画データの型ガード関数
 */

import type { PlanFormData, SimulationResult as SimulationResultType } from "../types/plan";

/**
 * PlanFormData型ガード
 */
export function isPlanFormData(data: unknown): data is PlanFormData {
  if (!data || typeof data !== "object") {
    return false;
  }

  const formData = data as Record<string, unknown>;

  return (
    typeof formData.currentFollowers === "number" &&
    typeof formData.targetFollowers === "number" &&
    typeof formData.periodMonths === "number" &&
    typeof formData.startDate === "string" &&
    typeof formData.weeklyFeedPosts === "number" &&
    typeof formData.weeklyReelPosts === "number" &&
    typeof formData.weeklyStoryPosts === "number" &&
    typeof formData.mainGoal === "string" &&
    Array.isArray(formData.preferredPostingTimes) &&
    typeof formData.targetAudience === "string" &&
    Array.isArray(formData.contentTypes)
  );
}

/**
 * SimulationResult型ガード
 */
export function isSimulationResult(data: unknown): data is SimulationResultType {
  if (!data || typeof data !== "object") {
    return false;
  }

  const result = data as Record<string, unknown>;

  return (
    typeof result.requiredMonthlyGrowthRate === "number" &&
    typeof result.difficultyScore === "number" &&
    typeof result.difficultyLevel === "string" &&
    typeof result.difficultyMessage === "string" &&
    typeof result.difficultyColor === "string" &&
    Array.isArray(result.weeklyPredictions) &&
    typeof result.estimatedWeeklyMinutes === "number" &&
    typeof result.timeBreakdown === "object" &&
    Array.isArray(result.requiredActions)
  );
}

/**
 * 計画データの完全性チェック
 */
export function isValidPlanData(plan: {
  formData?: unknown;
  simulationResult?: unknown;
}): plan is {
  formData: PlanFormData;
  simulationResult: SimulationResultType;
} {
  return isPlanFormData(plan.formData) && isSimulationResult(plan.simulationResult);
}

