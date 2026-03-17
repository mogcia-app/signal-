"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { authFetch } from "@/utils/authFetch";

export interface WeeklyPlansData {
  currentWeek: number;
  currentWeekPlan: {
    week: number;
    targetFollowers: number;
    increase: number;
    theme: string;
    feedPosts: Array<{
      day: string;
      content: string;
      type?: string;
      title?: string;
      displayText?: string;
      date?: string;
      dayName?: string;
      time?: string;
    }>;
    storyContent: string[];
  } | null;
  allWeeklyPlans: Array<{
    week: number;
    targetFollowers: number;
    increase: number;
    theme: string;
    feedPosts: Array<{
      day: string;
      content: string;
      type?: string;
      title?: string;
      displayText?: string;
      date?: string;
      dayName?: string;
      time?: string;
    }>;
    storyContent: string[];
  }>;
  schedule: {
    weeklyFrequency: string;
    postingDays: Array<{ day: string; time: string; type?: string }>;
    storyDays: Array<{ day: string; time: string }>;
  };
}

interface UseWeeklyPlansSectionParams {
  userId?: string;
  currentPlanId?: string | null;
  currentPlanAiGenerationStatus?: string | null;
}

export function useWeeklyPlansSection({
  userId,
  currentPlanId,
  currentPlanAiGenerationStatus,
}: UseWeeklyPlansSectionParams) {
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlansData | null>(null);
  const [isLoadingWeeklyPlans, setIsLoadingWeeklyPlans] = useState(false);
  const [pendingAiGenerationNoticePlanId, setPendingAiGenerationNoticePlanId] = useState<string | null>(null);

  const refreshWeeklyPlans = useCallback(async () => {
    if (!userId) {
      setWeeklyPlans(null);
      setIsLoadingWeeklyPlans(false);
      return;
    }

    try {
      setIsLoadingWeeklyPlans(true);
      const response = await authFetch("/api/home/weekly-plans");
      if (!response.ok) {return;}
      const data = await response.json().catch(() => ({}));
      if (data.success && data.data) {
        setWeeklyPlans(data.data as WeeklyPlansData);
      }
    } catch (error) {
      console.error("週次計画取得エラー:", error);
    } finally {
      setIsLoadingWeeklyPlans(false);
    }
  }, [userId]);

  useEffect(() => {
    void refreshWeeklyPlans();
  }, [refreshWeeklyPlans]);

  useEffect(() => {
    if (!currentPlanId || !pendingAiGenerationNoticePlanId) {return;}
    if (currentPlanId !== pendingAiGenerationNoticePlanId) {return;}
    if (currentPlanAiGenerationStatus !== "completed") {return;}
    toast.success("AIが計画を生成しました");
    setPendingAiGenerationNoticePlanId(null);
  }, [currentPlanAiGenerationStatus, currentPlanId, pendingAiGenerationNoticePlanId]);

  return {
    weeklyPlans,
    isLoadingWeeklyPlans,
    pendingAiGenerationNoticePlanId,
    setPendingAiGenerationNoticePlanId,
    clearPendingAiGenerationNotice: () => setPendingAiGenerationNoticePlanId(null),
    clearWeeklyPlans: () => setWeeklyPlans(null),
    refreshWeeklyPlans,
  };
}
