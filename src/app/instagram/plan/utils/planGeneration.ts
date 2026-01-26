/**
 * 計画生成処理のユーティリティ関数
 */

import { PlanFormData, SimulationRequest, SimulationResult } from "../types/plan";

/**
 * フォロワー数のバリデーション
 */
export function validateFollowerInputs(
  current: number,
  target: number
): { isValid: boolean; error?: string } {
  if (current <= 0) {
    return { isValid: false, error: "現在のフォロワー数は1以上である必要があります" };
  }
  if (target <= current) {
    return { isValid: false, error: "目標フォロワー数は現在のフォロワー数より大きい必要があります" };
  }
  return { isValid: true };
}

/**
 * アカウント開設日から月数を計算
 */
export function calculateAccountAge(accountCreationDate: string | undefined): number | undefined {
  if (!accountCreationDate) return undefined;
  
  const creationDate = new Date(accountCreationDate);
  const now = new Date();
  const monthsDiff = (now.getFullYear() - creationDate.getFullYear()) * 12 + 
                     (now.getMonth() - creationDate.getMonth());
  return Math.max(0, monthsDiff);
}

/**
 * エンゲージメント率を数値に変換
 */
export function parseEngagementRate(engagementRate: string | undefined): number | undefined {
  if (!engagementRate) return undefined;
  const parsed = parseFloat(engagementRate);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * フォームデータからシミュレーションリクエストデータを準備
 */
export function prepareSimulationRequest(
  formData: PlanFormData,
  postContentTypes: string[]
): {
  requestData: SimulationRequest;
  current: number;
  target: number;
  gain: number;
  mappedFormData: PlanFormData;
} {
  const current = parseInt(formData.currentFollowers || "0", 10);
  const target = parseInt(formData.targetFollowers || "0", 10);
  const gain = target - current;

  // 旧形式のフィールドにマッピング（後方互換性）
  const mappedFormData: PlanFormData = {
    ...formData,
    followerGain: gain.toString(),
    goalCategory: formData.mainGoal || formData.goalCategory || "",
  };

  const accountAge = calculateAccountAge(formData.accountCreationDate);
  const engagementRate = parseEngagementRate(formData.currentEngagementRate);

  const requestData: SimulationRequest = {
    followerGain: gain,
    currentFollowers: current,
    planPeriod: formData.planPeriod,
    goalCategory: formData.mainGoal || "",
    strategyValues: postContentTypes,
    postCategories: postContentTypes,
    hashtagStrategy: "",
    referenceAccounts: "",
    availableTime: formData.availableTime,
    reelCapability: formData.reelCapability,
    storyFrequency: formData.storyFrequency,
    postingTimePreference: formData.postingTimePreference,
    accountAge: accountAge,
    currentEngagementRate: engagementRate,
  };

  return {
    requestData,
    current,
    target,
    gain,
    mappedFormData,
  };
}

