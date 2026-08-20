"use client";

import { useCallback, useState } from "react";
import { getCurrentMonth } from "@/utils/date-utils";

const getDaysInMonth = (year: number, month: number): number => new Date(year, month, 0).getDate();

const formatCalendarPeriodLabel = (monthKey: string): string => {
  const match = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return monthKey;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return monthKey;
  }

  return `${month}/1〜${month}/${getDaysInMonth(year, month)}`;
};

export function useCalendarMonth(_enabled: boolean) {
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  const setSelectedCalendarMonth = useCallback((value: string) => {
    setHasUserInteracted(true);
    setSelectedMonth(value);
  }, []);

  return {
    selectedMonth,
    setSelectedMonth: setSelectedCalendarMonth,
    currentCalendarMonth: getCurrentMonth(),
    selectedPeriodLabel: formatCalendarPeriodLabel(selectedMonth),
    isCalendarResolved: true,
    refreshCalendar: useCallback(() => undefined, []),
    hasUserInteracted,
  };
}
