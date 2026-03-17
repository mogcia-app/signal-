"use client";

import toast from "react-hot-toast";
import { deleteQuickPlan, saveQuickPlan } from "./quick-plan-actions";
import type { WeekDay } from "../types";

interface CreateQuickPlanFlowParams {
  userId?: string;
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
  onStart: (runId: string, flowStart: number) => void;
  onPlanSaved: (planId: string) => void;
  onPlanGenerated: (planId: string) => Promise<void>;
  onError: (error: unknown) => void;
  onFinally: () => void;
}

interface ResetQuickPlanFlowParams {
  planId: string;
  clearPendingAiGenerationNotice: () => void;
  clearMonthlyCalendarState: () => void;
  resetQuickPlanForm: () => void;
  resetCalendarToToday: () => void;
  resetHomePostGenerator: () => void;
  clearWeeklyPlans: () => void;
  clearOverviewLists: () => void;
  fetchDashboard: () => Promise<void>;
  setShowHomePlanForm: (value: boolean) => void;
  onError: (error: unknown) => void;
  onFinally: () => void;
}

export async function createQuickPlanFlow({
  userId,
  quickPlanPurpose,
  quickPlanTargetFollowers,
  quickPlanFeedDays,
  quickPlanReelDays,
  quickPlanStoryDays,
  quickPlanStartDate,
  quickPlanTargetAudience,
  quickPlanPostingTime,
  quickPlanRegionRestriction,
  quickPlanRegionName,
  onStart,
  onPlanSaved,
  onPlanGenerated,
  onError,
  onFinally,
}: CreateQuickPlanFlowParams): Promise<void> {
  if (!userId) {
    toast.error("ログインが必要です");
    return;
  }
  if (!String(quickPlanPurpose || "").trim()) {
    toast.error("投稿の目的を設定してください");
    return;
  }
  if (!String(quickPlanStartDate || "").trim() || Number.isNaN(new Date(quickPlanStartDate).getTime())) {
    toast.error("計画開始日を設定してください");
    return;
  }
  if (quickPlanFeedDays.length === 0 || quickPlanReelDays.length === 0 || quickPlanStoryDays.length === 0) {
    toast.error("フィード・リール・ストーリーズの投稿曜日をすべて設定してください");
    return;
  }

  const runId = `home-plan-${Date.now()}`;
  const flowStart = Date.now();
  onStart(runId, flowStart);

  try {
    const { planId } = await saveQuickPlan({
      quickPlanPurpose,
      quickPlanTargetFollowers,
      quickPlanFeedDays,
      quickPlanReelDays,
      quickPlanStoryDays,
      quickPlanStartDate,
      quickPlanTargetAudience,
      quickPlanPostingTime,
      quickPlanRegionRestriction,
      quickPlanRegionName,
    });

    onPlanSaved(planId);
    toast.success("ホームから計画を保存しました");
    await onPlanGenerated(planId);
  } catch (error) {
    onError(error);
    toast.error(error instanceof Error ? error.message : "計画保存に失敗しました");
  } finally {
    onFinally();
  }
}

export async function resetQuickPlanFlow({
  planId,
  clearPendingAiGenerationNotice,
  clearMonthlyCalendarState,
  resetQuickPlanForm,
  resetCalendarToToday,
  resetHomePostGenerator,
  clearWeeklyPlans,
  clearOverviewLists,
  fetchDashboard,
  setShowHomePlanForm,
  onError,
  onFinally,
}: ResetQuickPlanFlowParams): Promise<void> {
  try {
    await deleteQuickPlan(planId);

    setShowHomePlanForm(false);
    clearPendingAiGenerationNotice();
    clearMonthlyCalendarState();
    resetQuickPlanForm();
    resetCalendarToToday();
    resetHomePostGenerator();
    clearWeeklyPlans();
    clearOverviewLists();
    await fetchDashboard();
    toast.success("計画を完全リセットしました");
  } catch (error) {
    onError(error);
    toast.error(error instanceof Error ? error.message : "計画のリセットに失敗しました");
  } finally {
    onFinally();
  }
}
