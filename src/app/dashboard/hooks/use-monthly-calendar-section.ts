"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { authFetch } from "@/utils/authFetch";
import type { Dispatch, SetStateAction } from "react";
import type { EditableTimelineItem, MonthlyCalendarPlanItem, WeekDay } from "../types";
import { WEEK_DAYS } from "../types";
import { buildMonthlyCalendarPlan } from "../lib/monthly-calendar-generator";

interface UseMonthlyCalendarSectionParams {
  currentPlanId?: string;
  quickPlanStartDate: string;
  quickPlanPurpose: string;
  currentPlanOperationPurpose?: string;
  quickPlanFeedDays: WeekDay[];
  quickPlanReelDays: WeekDay[];
  quickPlanStoryDays: WeekDay[];
  setQuickPlanStartDate: Dispatch<SetStateAction<string>>;
  setQuickPlanFeedDays: Dispatch<SetStateAction<WeekDay[]>>;
  setQuickPlanReelDays: Dispatch<SetStateAction<WeekDay[]>>;
  setQuickPlanStoryDays: Dispatch<SetStateAction<WeekDay[]>>;
}

const toLocalISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeTimeToHHmm = (value?: string): string => {
  const raw = String(value || "").trim();
  if (!raw || raw === "--:--") {return "--:--";}

  const hhmm = raw.match(/(\d{1,2}):(\d{2})/);
  if (hhmm) {
    return `${hhmm[1].padStart(2, "0")}:${hhmm[2]}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return raw;
};

const getTimeSortValue = (time: string): number => {
  const normalized = normalizeTimeToHHmm(time);
  if (normalized === "--:--") {return Number.MAX_SAFE_INTEGER;}
  const [hourStr, minuteStr] = normalized.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {return Number.MAX_SAFE_INTEGER;}
  return hour * 60 + minute;
};

const formatIsoToDateLabel = (iso: string): string => {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {return "--/--";}
  return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
};

export function useMonthlyCalendarSection({
  currentPlanId,
  quickPlanStartDate,
  quickPlanPurpose,
  currentPlanOperationPurpose,
  quickPlanFeedDays,
  quickPlanReelDays,
  quickPlanStoryDays,
  setQuickPlanStartDate,
  setQuickPlanFeedDays,
  setQuickPlanReelDays,
  setQuickPlanStoryDays,
}: UseMonthlyCalendarSectionParams) {
  const today = new Date();
  const [calendarViewYear, setCalendarViewYear] = useState<number>(today.getFullYear());
  const [calendarViewMonth, setCalendarViewMonth] = useState<number>(today.getMonth());
  const [isWeeklyPlanMarkedOnCalendar, setIsWeeklyPlanMarkedOnCalendar] = useState(false);
  const [isGeneratingMonthlyCalendarPlan, setIsGeneratingMonthlyCalendarPlan] = useState(false);
  const [monthlyCalendarPlan, setMonthlyCalendarPlan] = useState<MonthlyCalendarPlanItem[]>([]);
  const [, setSelectedCalendarDateIso] = useState<string | null>(null);
  const [editableTimelineItems, setEditableTimelineItems] = useState<EditableTimelineItem[]>([]);
  const [editingTimelineKey, setEditingTimelineKey] = useState<string | null>(null);
  const [timelineEditDraft, setTimelineEditDraft] = useState<{
    dateIso: string;
    type: "feed" | "reel" | "story";
  }>({
    dateIso: "",
    type: "feed",
  });

  const focusCalendarDate = useCallback((date: Date) => {
    if (Number.isNaN(date.getTime())) {return;}
    setCalendarViewYear(date.getFullYear());
    setCalendarViewMonth(date.getMonth());
  }, []);

  const resetCalendarToToday = useCallback(() => {
    const nextToday = new Date();
    focusCalendarDate(nextToday);
  }, [focusCalendarDate]);

  const saveMonthlyCalendarPlanToFirestore = useCallback(async (
    planId: string,
    params: {
      startDate: string;
      endDate: string;
      items: MonthlyCalendarPlanItem[];
    }
  ) => {
    const response = await authFetch("/api/home/monthly-calendar-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId,
        startDate: params.startDate,
        endDate: params.endDate,
        items: params.items,
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error || "月間予定の保存に失敗しました");
    }
  }, []);

  const fetchMonthlyCalendarPlanFromFirestore = useCallback(async (planId: string) => {
    const response = await authFetch(`/api/home/monthly-calendar-plan?planId=${encodeURIComponent(planId)}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error || "月間予定の取得に失敗しました");
    }
    const result = await response.json();
    if (!result?.success || !result?.data) {
      setMonthlyCalendarPlan([]);
      setSelectedCalendarDateIso(null);
      setIsWeeklyPlanMarkedOnCalendar(false);
      return;
    }

    const items: MonthlyCalendarPlanItem[] = Array.isArray(result.data.items)
      ? result.data.items.filter(
          (item: unknown): item is MonthlyCalendarPlanItem =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as { dateIso?: unknown }).dateIso === "string" &&
            WEEK_DAYS.includes((item as { dayLabel?: unknown }).dayLabel as WeekDay) &&
            ((item as { postType?: unknown }).postType === "feed" ||
              (item as { postType?: unknown }).postType === "reel" ||
              (item as { postType?: unknown }).postType === "story") &&
            typeof (item as { suggestedTime?: unknown }).suggestedTime === "string" &&
            typeof (item as { title?: unknown }).title === "string" &&
            ((item as { direction?: unknown }).direction === undefined ||
              typeof (item as { direction?: unknown }).direction === "string") &&
            ((item as { hook?: unknown }).hook === undefined ||
              typeof (item as { hook?: unknown }).hook === "string")
        )
      : [];

    setMonthlyCalendarPlan(items);
    setSelectedCalendarDateIso(items[0]?.dateIso || null);
    setIsWeeklyPlanMarkedOnCalendar(items.length > 0);

    if (typeof result.data.startDate === "string") {
      setQuickPlanStartDate(result.data.startDate);
      const parsedStartDate = new Date(result.data.startDate);
      if (!Number.isNaN(parsedStartDate.getTime())) {
        const todayDate = new Date();
        const todayOnly = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
        const startOnly = new Date(
          parsedStartDate.getFullYear(),
          parsedStartDate.getMonth(),
          parsedStartDate.getDate()
        );

        const focusDate = todayOnly < startOnly ? parsedStartDate : todayDate;
        focusCalendarDate(focusDate);
      }
    }

    const feed = new Set<WeekDay>();
    const reel = new Set<WeekDay>();
    const story = new Set<WeekDay>();
    items.forEach((item) => {
      if (item.postType === "feed") {feed.add(item.dayLabel);}
      if (item.postType === "reel") {reel.add(item.dayLabel);}
      if (item.postType === "story") {story.add(item.dayLabel);}
    });
    setQuickPlanFeedDays(Array.from(feed));
    setQuickPlanReelDays(Array.from(reel));
    setQuickPlanStoryDays(Array.from(story));
  }, [
    focusCalendarDate,
    setQuickPlanFeedDays,
    setQuickPlanReelDays,
    setQuickPlanStartDate,
    setQuickPlanStoryDays,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {return;}

    let currentCalendar = {
      year: calendarViewYear,
      month: calendarViewMonth,
    };
    let lastSystemMonth = {
      year: new Date().getFullYear(),
      month: new Date().getMonth(),
    };

    const syncCalendarMonthIfNeeded = () => {
      const now = new Date();
      const nextSystemMonth = {
        year: now.getFullYear(),
        month: now.getMonth(),
      };

      if (
        nextSystemMonth.year === lastSystemMonth.year &&
        nextSystemMonth.month === lastSystemMonth.month
      ) {
        return;
      }

      const shouldFollowSystemMonth =
        currentCalendar.year === lastSystemMonth.year &&
        currentCalendar.month === lastSystemMonth.month;

      lastSystemMonth = nextSystemMonth;

      if (shouldFollowSystemMonth) {
        focusCalendarDate(now);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncCalendarMonthIfNeeded();
      }
    };

    const intervalId = window.setInterval(syncCalendarMonthIfNeeded, 60_000);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    currentCalendar = {
      year: calendarViewYear,
      month: calendarViewMonth,
    };

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [calendarViewMonth, calendarViewYear, focusCalendarDate]);

  useEffect(() => {
    if (!currentPlanId) {
      setMonthlyCalendarPlan([]);
      setSelectedCalendarDateIso(null);
      setIsWeeklyPlanMarkedOnCalendar(false);
      setQuickPlanFeedDays([]);
      setQuickPlanReelDays([]);
      setQuickPlanStoryDays([]);
      return;
    }
    void fetchMonthlyCalendarPlanFromFirestore(currentPlanId).catch((error) => {
      console.error("月間予定取得エラー:", error);
    });
  }, [
    currentPlanId,
    fetchMonthlyCalendarPlanFromFirestore,
    setQuickPlanFeedDays,
    setQuickPlanReelDays,
    setQuickPlanStoryDays,
  ]);

  const timelineBaseItems: EditableTimelineItem[] = useMemo(
    () =>
      monthlyCalendarPlan.map((item) => ({
        key: `${item.dateIso}|${item.postType}|${item.suggestedTime}|${item.direction || item.title}|${item.hook || ""}`,
        dayLabel: item.dayLabel,
        dateLabel: formatIsoToDateLabel(item.dateIso),
        dateIso: item.dateIso,
        time: normalizeTimeToHHmm(item.suggestedTime),
        label: item.direction || item.title,
        type: item.postType,
        direction: item.direction || item.title,
        hook: item.hook,
      })),
    [monthlyCalendarPlan]
  );

  const timelineSourceSignature = monthlyCalendarPlan
    .map((item) => `${item.dateIso}|${item.postType}|${item.suggestedTime}|${item.direction || item.title}|${item.hook || ""}`)
    .join("||");

  useEffect(() => {
    setEditableTimelineItems(timelineBaseItems);
    setEditingTimelineKey(null);
  }, [timelineBaseItems, timelineSourceSignature]);

  const toMonthlyPlanItemsFromEditable = (items: EditableTimelineItem[]): MonthlyCalendarPlanItem[] => {
    const typeOrder: Record<EditableTimelineItem["type"], number> = {
      feed: 0,
      reel: 1,
      story: 2,
    };
    return [...items]
      .map((item) => ({
        dateIso: item.dateIso,
        dayLabel: item.dayLabel,
        postType: item.type,
        suggestedTime: normalizeTimeToHHmm(item.time),
        title: item.direction || item.label,
        direction: item.direction || item.label,
        hook: item.hook,
      }))
      .sort((a, b) => {
        const dateDiff = new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime();
        if (dateDiff !== 0) {return dateDiff;}
        const timeDiff = getTimeSortValue(a.suggestedTime) - getTimeSortValue(b.suggestedTime);
        if (timeDiff !== 0) {return timeDiff;}
        return (typeOrder[a.postType] || 0) - (typeOrder[b.postType] || 0);
      });
  };

  const persistEditableTimelineItems = useCallback(async (items: EditableTimelineItem[]) => {
    setEditableTimelineItems(items);
    const monthlyItems = toMonthlyPlanItemsFromEditable(items);
    setMonthlyCalendarPlan(monthlyItems);
    setSelectedCalendarDateIso((prev) => {
      if (prev && monthlyItems.some((row) => row.dateIso === prev)) {return prev;}
      return monthlyItems[0]?.dateIso || null;
    });
    setIsWeeklyPlanMarkedOnCalendar(monthlyItems.length > 0);

    if (!currentPlanId) {return;}

    const parsedStartDate = new Date(quickPlanStartDate);
    if (Number.isNaN(parsedStartDate.getTime())) {return;}
    const startDateOnly = new Date(
      parsedStartDate.getFullYear(),
      parsedStartDate.getMonth(),
      parsedStartDate.getDate()
    );
    const endDateOnly = new Date(
      startDateOnly.getFullYear(),
      startDateOnly.getMonth() + 1,
      startDateOnly.getDate() - 1
    );

    await saveMonthlyCalendarPlanToFirestore(currentPlanId, {
      startDate: toLocalISODate(startDateOnly),
      endDate: toLocalISODate(endDateOnly),
      items: monthlyItems,
    });
  }, [currentPlanId, quickPlanStartDate, saveMonthlyCalendarPlanToFirestore]);

  const handleStartEditTimeline = (item: EditableTimelineItem) => {
    setEditingTimelineKey(item.key);
    setTimelineEditDraft({
      dateIso: item.dateIso || toLocalISODate(new Date()),
      type: item.type,
    });
  };

  const handleApplyTimelineEdit = async (itemKey: string) => {
    if (!timelineEditDraft.dateIso) {
      toast.error("投稿日を選択してください");
      return;
    }
    const parsed = new Date(timelineEditDraft.dateIso);
    if (Number.isNaN(parsed.getTime())) {
      toast.error("投稿日が不正です");
      return;
    }
    const parsedDateOnly = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    const parsedStartDate = new Date(quickPlanStartDate);
    const planStartDateOnly = !Number.isNaN(parsedStartDate.getTime())
      ? new Date(parsedStartDate.getFullYear(), parsedStartDate.getMonth(), parsedStartDate.getDate())
      : null;
    const planEndDateOnly = planStartDateOnly
      ? new Date(planStartDateOnly.getFullYear(), planStartDateOnly.getMonth() + 1, planStartDateOnly.getDate() - 1)
      : null;

    if (planStartDateOnly && parsedDateOnly < planStartDateOnly) {
      toast.error("計画開始日より前には変更できません");
      return;
    }
    if (planEndDateOnly && parsedDateOnly > planEndDateOnly) {
      toast.error("計画期間を超える日付には変更できません");
      return;
    }

    const nextDayLabel = WEEK_DAYS[parsed.getDay()];
    const nextItems = editableTimelineItems.map((item) =>
      item.key === itemKey
        ? {
            ...item,
            dateIso: timelineEditDraft.dateIso,
            dateLabel: formatIsoToDateLabel(timelineEditDraft.dateIso),
            dayLabel: nextDayLabel,
            type: timelineEditDraft.type,
          }
        : item
    );

    try {
      await persistEditableTimelineItems(nextItems);
      setEditingTimelineKey(null);
      toast.success("予定を更新しました");
    } catch (error) {
      console.error("タイムライン更新保存エラー:", error);
      toast.error(error instanceof Error ? error.message : "予定の保存に失敗しました");
    }
  };

  const handleCalendarDayClick = (day: number | null) => {
    if (!day) {return;}
    const clickedDate = new Date(calendarViewYear, calendarViewMonth, day);
    if (Number.isNaN(clickedDate.getTime())) {return;}
    const dateIso = toLocalISODate(clickedDate);
    const hasPlan = monthlyCalendarPlan.some((item) => item.dateIso === dateIso);
    if (!hasPlan) {return;}
    setSelectedCalendarDateIso(dateIso);
  };

  const clearMonthlyCalendarState = useCallback(() => {
    setMonthlyCalendarPlan([]);
    setSelectedCalendarDateIso(null);
    setEditableTimelineItems([]);
    setEditingTimelineKey(null);
    setTimelineEditDraft({ dateIso: "", type: "feed" });
    setIsWeeklyPlanMarkedOnCalendar(false);
    setIsGeneratingMonthlyCalendarPlan(false);
  }, []);

  const generateMonthlyPlanFromAI = useCallback(async (params: { planId: string; startDate: string }) => {
    const activePurpose = String(currentPlanOperationPurpose || "").trim() || quickPlanPurpose;
    const generated = buildMonthlyCalendarPlan({
      startDate: params.startDate,
      purpose: activePurpose,
      quickPlanFeedDays,
      quickPlanReelDays,
      quickPlanStoryDays,
    });

    if (generated.items.length === 0) {
      setMonthlyCalendarPlan([]);
      setSelectedCalendarDateIso(null);
      return;
    }

    setIsGeneratingMonthlyCalendarPlan(true);
    try {
      setMonthlyCalendarPlan(generated.items);
      setSelectedCalendarDateIso(generated.items[0]?.dateIso || null);
      setIsWeeklyPlanMarkedOnCalendar(true);
      await saveMonthlyCalendarPlanToFirestore(params.planId, {
        startDate: params.startDate,
        endDate: generated.endDate,
        items: generated.items,
      });
      toast.success("1ヶ月分の投稿予定を生成しました");
    } catch (error) {
      console.error("月間カレンダー予定生成エラー:", error);
      toast.error(error instanceof Error ? error.message : "投稿予定の生成に失敗しました");
    } finally {
      setIsGeneratingMonthlyCalendarPlan(false);
    }
  }, [
    currentPlanOperationPurpose,
    quickPlanPurpose,
    quickPlanFeedDays,
    quickPlanReelDays,
    quickPlanStoryDays,
    saveMonthlyCalendarPlanToFirestore,
  ]);

  const handleCalendarPrevMonth = useCallback(() => {
    if (calendarViewMonth === 0) {
      setCalendarViewYear((prev) => prev - 1);
      setCalendarViewMonth(11);
      return;
    }
    setCalendarViewMonth((prev) => prev - 1);
  }, [calendarViewMonth]);

  const handleCalendarNextMonth = useCallback(() => {
    if (calendarViewMonth === 11) {
      setCalendarViewYear((prev) => prev + 1);
      setCalendarViewMonth(0);
      return;
    }
    setCalendarViewMonth((prev) => prev + 1);
  }, [calendarViewMonth]);

  const firstDayOfMonth = new Date(calendarViewYear, calendarViewMonth, 1).getDay();
  const daysInMonth = new Date(calendarViewYear, calendarViewMonth + 1, 0).getDate();
  const calendarCells: Array<number | null> = [
    ...Array.from({ length: firstDayOfMonth }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return {
    calendarViewYear,
    calendarViewMonth,
    calendarCells,
    focusCalendarDate,
    resetCalendarToToday,
    isWeeklyPlanMarkedOnCalendar,
    setIsWeeklyPlanMarkedOnCalendar,
    isGeneratingMonthlyCalendarPlan,
    setIsGeneratingMonthlyCalendarPlan,
    monthlyCalendarPlan,
    setMonthlyCalendarPlan,
    setSelectedCalendarDateIso,
    editableTimelineItems,
    setEditableTimelineItems,
    editingTimelineKey,
    setEditingTimelineKey,
    timelineEditDraft,
    setTimelineEditDraft,
    saveMonthlyCalendarPlanToFirestore,
    persistEditableTimelineItems,
    handleStartEditTimeline,
    handleApplyTimelineEdit,
    handleCalendarPrevMonth,
    handleCalendarNextMonth,
    handleCalendarDayClick,
    clearMonthlyCalendarState,
    generateMonthlyPlanFromAI,
  };
}
