"use client";

import { useEffect, useState } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { DashboardData } from "@/types/home";
import type { WeekDay } from "../types";
import { WEEK_DAYS } from "../types";

const toLocalISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

interface UseQuickPlanSectionParams {
  today: Date;
  currentPlan: DashboardData["currentPlan"] | null | undefined;
  planCardRef: RefObject<HTMLDivElement | null>;
  setIsPlanCardHighlighted: Dispatch<SetStateAction<boolean>>;
}

export function useQuickPlanSection({
  today,
  currentPlan,
  planCardRef,
  setIsPlanCardHighlighted,
}: UseQuickPlanSectionParams) {
  const [quickPlanPurpose, setQuickPlanPurpose] = useState<string>("認知拡大");
  const [quickPlanTargetFollowers, setQuickPlanTargetFollowers] = useState<number | "">("");
  const [quickPlanFeedDays, setQuickPlanFeedDays] = useState<WeekDay[]>([]);
  const [quickPlanReelDays, setQuickPlanReelDays] = useState<WeekDay[]>([]);
  const [quickPlanStoryDays, setQuickPlanStoryDays] = useState<WeekDay[]>([]);
  const [quickPlanStartDate, setQuickPlanStartDate] = useState<string>(toLocalISODate(today));
  const [quickPlanDetailOpen, setQuickPlanDetailOpen] = useState(false);
  const [quickPlanTargetAudience, setQuickPlanTargetAudience] = useState<string>("");
  const [quickPlanPostingTime, setQuickPlanPostingTime] = useState<string>("");
  const [quickPlanRegionRestriction, setQuickPlanRegionRestriction] = useState<"none" | "restricted">("none");
  const [quickPlanRegionName, setQuickPlanRegionName] = useState<string>("");
  const [isCreatingQuickPlan, setIsCreatingQuickPlan] = useState(false);
  const [isResettingPlan, setIsResettingPlan] = useState(false);
  const [isResetConfirming, setIsResetConfirming] = useState(false);
  const [showHomePlanForm, setShowHomePlanForm] = useState(false);

  const getPostingTimeLabel = (value: unknown): string => {
    if (value === "morning") {return "午前中（9:00〜12:00）";}
    if (value === "noon") {return "昼（12:00〜15:00）";}
    if (value === "evening") {return "夕方（15:00〜18:00）";}
    if (value === "night") {return "夜（18:00〜21:00）";}
    if (value === "late-night") {return "深夜（21:00〜24:00）";}
    if (!String(value || "").trim()) {return "AIに任せる";}
    return String(value);
  };

  const parseSavedWeekDays = (value: unknown): WeekDay[] => {
    if (!Array.isArray(value)) {return [];}
    return value.filter((day): day is WeekDay => WEEK_DAYS.includes(day as WeekDay));
  };

  const focusHomePlanCard = () => {
    planCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setIsPlanCardHighlighted(true);
    window.setTimeout(() => setIsPlanCardHighlighted(false), 1200);
  };

  const openHomePlanForm = () => {
    setShowHomePlanForm(true);
    focusHomePlanCard();
  };

  const handleEditCurrentPlan = (editingPlan: DashboardData["currentPlan"]) => {
    if (!editingPlan) {return;}

    setQuickPlanPurpose(String(editingPlan.operationPurpose || "認知拡大"));
    const savedTargetFollowers = Number(editingPlan.targetFollowers || 0);
    const savedCurrentFollowers = Number(editingPlan.currentFollowers || 0);
    const savedIncrease = Number(editingPlan.targetFollowerIncrease || 0);
    const restoredIncrease = savedIncrease > 0 ? savedIncrease : Math.max(0, savedTargetFollowers - savedCurrentFollowers);
    setQuickPlanTargetFollowers(restoredIncrease > 0 ? restoredIncrease : "");
    setQuickPlanStartDate(
      typeof editingPlan.startDate === "string"
        ? editingPlan.startDate.split("T")[0]
        : editingPlan.startDate instanceof Date
          ? toLocalISODate(editingPlan.startDate)
          : quickPlanStartDate
    );
    setQuickPlanPostingTime(String(editingPlan.postingTime || ""));
    setQuickPlanRegionRestriction(editingPlan.regionRestriction === "restricted" ? "restricted" : "none");
    setQuickPlanRegionName(String(editingPlan.regionName || ""));
    setQuickPlanTargetAudience(String(editingPlan.targetAudience || ""));
    setQuickPlanFeedDays(parseSavedWeekDays(editingPlan.feedDays));
    setQuickPlanReelDays(parseSavedWeekDays(editingPlan.reelDays));
    setQuickPlanStoryDays(parseSavedWeekDays(editingPlan.storyDays));
    setShowHomePlanForm(true);
    focusHomePlanCard();
  };

  useEffect(() => {
    if (currentPlan) {
      setShowHomePlanForm(false);
    }
  }, [currentPlan]);

  const toggleDaySelection = (
    value: WeekDay,
    setter: Dispatch<SetStateAction<WeekDay[]>>
  ) => {
    setter((prev) => (prev.includes(value) ? prev.filter((day) => day !== value) : [...prev, value]));
  };

  const toggleFeedDay = (day: WeekDay) => toggleDaySelection(day, setQuickPlanFeedDays);
  const toggleReelDay = (day: WeekDay) => toggleDaySelection(day, setQuickPlanReelDays);
  const toggleStoryDay = (day: WeekDay) => toggleDaySelection(day, setQuickPlanStoryDays);

  const resetQuickPlanForm = (nextDate: Date = new Date()) => {
    setQuickPlanTargetFollowers("");
    setQuickPlanFeedDays([]);
    setQuickPlanReelDays([]);
    setQuickPlanStoryDays([]);
    setQuickPlanStartDate(toLocalISODate(nextDate));
    setQuickPlanTargetAudience("");
    setQuickPlanPostingTime("");
    setQuickPlanRegionRestriction("none");
    setQuickPlanRegionName("");
  };

  return {
    quickPlanPurpose,
    setQuickPlanPurpose,
    quickPlanTargetFollowers,
    setQuickPlanTargetFollowers,
    quickPlanFeedDays,
    setQuickPlanFeedDays,
    quickPlanReelDays,
    setQuickPlanReelDays,
    quickPlanStoryDays,
    setQuickPlanStoryDays,
    quickPlanStartDate,
    setQuickPlanStartDate,
    quickPlanDetailOpen,
    setQuickPlanDetailOpen,
    quickPlanTargetAudience,
    setQuickPlanTargetAudience,
    quickPlanPostingTime,
    setQuickPlanPostingTime,
    quickPlanRegionRestriction,
    setQuickPlanRegionRestriction,
    quickPlanRegionName,
    setQuickPlanRegionName,
    isCreatingQuickPlan,
    setIsCreatingQuickPlan,
    isResettingPlan,
    setIsResettingPlan,
    isResetConfirming,
    setIsResetConfirming,
    showHomePlanForm,
    setShowHomePlanForm,
    parseSavedWeekDays,
    getPostingTimeLabel,
    toggleFeedDay,
    toggleReelDay,
    toggleStoryDay,
    openHomePlanForm,
    handleEditCurrentPlan,
    resetQuickPlanForm,
  };
}
