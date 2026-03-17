import { authFetch } from "@/utils/authFetch";
import type { WeekDay } from "../types";

interface SaveQuickPlanParams {
  quickPlanPurpose: string;
  quickPlanTargetFollowers: number | "";
  quickPlanFeedDays: WeekDay[];
  quickPlanReelDays: WeekDay[];
  quickPlanStoryDays: WeekDay[];
  quickPlanStartDate: string;
  quickPlanTargetAudience: string;
  quickPlanPostingTime: string;
  quickPlanRegionRestriction: "none" | "restricted";
  quickPlanRegionName: string;
}

const mapDaysToFrequency = (days: WeekDay[]): "none" | "weekly-1-2" | "weekly-3-4" | "daily" => {
  const count = days.length;
  if (count <= 0) {return "none";}
  if (count <= 2) {return "weekly-1-2";}
  if (count <= 4) {return "weekly-3-4";}
  return "daily";
};

export async function saveQuickPlan(params: SaveQuickPlanParams): Promise<{
  planId: string;
  currentFollowers: number;
  targetFollowers: number;
  targetFollowerIncrease: number;
}> {
  const initialResponse = await authFetch("/api/home/plan-initial-data");
  if (!initialResponse.ok) {
    throw new Error("初期データの取得に失敗しました");
  }

  const initialData = (await initialResponse.json()) as { currentFollowers?: number | string | null };
  const currentFollowersRaw =
    typeof initialData.currentFollowers === "string"
      ? initialData.currentFollowers.replace(/,/g, "").trim()
      : initialData.currentFollowers;
  const currentFollowers = Number(currentFollowersRaw ?? 0);
  if (!Number.isFinite(currentFollowers) || currentFollowers < 0) {
    throw new Error("現在のフォロワー数を取得できませんでした");
  }

  const requestedIncrease = params.quickPlanTargetFollowers === "" ? NaN : Number(params.quickPlanTargetFollowers);
  const hasCustomTarget = Number.isFinite(requestedIncrease);
  if (!hasCustomTarget || requestedIncrease <= 0) {
    throw new Error("増加目標は1以上の値を設定してください");
  }

  const targetFollowers = currentFollowers + requestedIncrease;
  const weeklyPosts = mapDaysToFrequency(params.quickPlanFeedDays);
  const reelCapability = mapDaysToFrequency(params.quickPlanReelDays);
  const storyFrequency = mapDaysToFrequency(params.quickPlanStoryDays);

  const saveResponse = await authFetch("/api/home/plan-save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startDate: params.quickPlanStartDate,
      currentFollowers,
      targetFollowerIncrease: requestedIncrease,
      targetFollowers,
      targetFollowerOption: "custom",
      customTargetFollowers: String(requestedIncrease),
      operationPurpose: params.quickPlanPurpose,
      weeklyPosts,
      reelCapability,
      storyFrequency,
      feedDays: params.quickPlanFeedDays,
      reelDays: params.quickPlanReelDays,
      storyDays: params.quickPlanStoryDays,
      targetAudience: params.quickPlanTargetAudience.trim(),
      postingTime: params.quickPlanPostingTime,
      regionRestriction: params.quickPlanRegionRestriction,
      regionName: params.quickPlanRegionRestriction === "restricted" ? params.quickPlanRegionName : undefined,
      simulationResult: null,
    }),
  });

  if (!saveResponse.ok) {
    const err = await saveResponse.json().catch(() => ({}));
    throw new Error(err.error || "計画の保存に失敗しました");
  }

  const saveResult = await saveResponse.json().catch(() => ({}));
  const planId = typeof saveResult?.planId === "string" ? saveResult.planId : "";
  if (!planId) {
    throw new Error("計画IDの取得に失敗しました");
  }

  return {
    planId,
    currentFollowers,
    targetFollowers,
    targetFollowerIncrease: requestedIncrease,
  };
}

export async function deleteQuickPlan(planId: string): Promise<void> {
  const response = await authFetch(`/api/home/plan-delete?planId=${encodeURIComponent(planId)}`, {
    method: "DELETE",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error || "計画のリセットに失敗しました");
  }
}
