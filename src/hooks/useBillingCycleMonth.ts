"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/utils/authFetch";
import { getCurrentMonth } from "@/utils/date-utils";

interface BillingCycleResponse {
  success?: boolean;
  data?: {
    currentKey?: string;
    anchorDay?: number;
  };
}

const getDaysInMonth = (year: number, month: number): number => new Date(year, month, 0).getDate();

const formatCyclePeriodLabel = (monthKey: string, anchorDay: number): string => {
  const match = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return monthKey;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return monthKey;
  }

  const safeAnchorDay = Math.min(Math.max(anchorDay, 1), 31);
  const startDay = Math.min(safeAnchorDay, getDaysInMonth(year, month));
  const nextDate = new Date(year, month, 1);
  const nextYear = nextDate.getFullYear();
  const nextMonth = nextDate.getMonth() + 1;
  const nextAnchorDay = Math.min(safeAnchorDay, getDaysInMonth(nextYear, nextMonth));
  const endDate = new Date(nextYear, nextMonth - 1, nextAnchorDay - 1);

  return `${month}/${startDay}〜${endDate.getMonth() + 1}/${endDate.getDate()}`;
};

export function useBillingCycleMonth(enabled: boolean) {
  const [currentCycleMonth, setCurrentCycleMonth] = useState<string>(getCurrentMonth());
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [anchorDay, setAnchorDay] = useState<number>(1);
  const [isCycleResolved, setIsCycleResolved] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  const refreshCycle = useCallback(async () => {
    if (!enabled) {
      setIsCycleResolved(false);
      return;
    }

    try {
      const response = await authFetch("/api/user/billing-cycle");
      const result = (await response.json().catch(() => ({}))) as BillingCycleResponse;
      const nextKey = String(result?.data?.currentKey || "").trim();
      if (!response.ok || !result?.success || !/^\d{4}-\d{2}$/.test(nextKey)) {
        setIsCycleResolved(true);
        return;
      }
      const nextAnchorDay = Number(result?.data?.anchorDay || 1);
      setCurrentCycleMonth(nextKey);
      setAnchorDay(Number.isFinite(nextAnchorDay) ? nextAnchorDay : 1);
      setIsCycleResolved(true);
    } catch {
      setIsCycleResolved(true);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void refreshCycle();

    const onFocus = () => {
      void refreshCycle();
    };
    const onVisibilityChange = () => {
      if (!document.hidden) {
        void refreshCycle();
      }
    };
    const intervalId = setInterval(() => {
      void refreshCycle();
    }, 5 * 60 * 1000);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearInterval(intervalId);
    };
  }, [enabled, refreshCycle]);

  useEffect(() => {
    if (!enabled || !isCycleResolved || hasUserInteracted) {
      return;
    }
    setSelectedMonth(currentCycleMonth);
  }, [enabled, isCycleResolved, hasUserInteracted, currentCycleMonth]);

  const setSelectedCycleMonth = useCallback(
    (value: string) => {
      setHasUserInteracted(true);
      setSelectedMonth(value);
    },
    [setHasUserInteracted, setSelectedMonth],
  );

  return {
    selectedMonth,
    setSelectedMonth: setSelectedCycleMonth,
    currentCycleMonth,
    selectedPeriodLabel: formatCyclePeriodLabel(selectedMonth, anchorDay),
    isCycleResolved,
    refreshCycle,
  };
}
