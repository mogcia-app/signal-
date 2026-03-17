import type { MonthlyCalendarPlanItem, WeekDay } from "../types";

export const buildMarkedDays = (params: {
  weeklyFeedPosts: Array<{ date?: string | null }>;
  calendarViewYear: number;
  calendarViewMonth: number;
  planStartDateOnly: Date | null;
  planEndDateOnly: Date | null;
  weekDays: readonly WeekDay[];
  quickPlanFeedDays: WeekDay[];
  quickPlanReelDays: WeekDay[];
  quickPlanStoryDays: WeekDay[];
  isWeeklyPlanMarkedOnCalendar: boolean;
  monthlyCalendarPlan: MonthlyCalendarPlanItem[];
}): Set<number> => {
  const scheduledDays = new Set<number>(
    params.weeklyFeedPosts
      .map((post) => {
        const raw = String(post.date || "").trim();
        if (!raw) {return null;}
        const dateObj = /^\d{4}-\d{2}-\d{2}$/.test(raw)
          ? new Date(raw)
          : raw.includes("/")
            ? new Date(`${params.calendarViewYear}/${raw}`)
            : null;
        if (!dateObj || Number.isNaN(dateObj.getTime())) {return null;}

        const normalizedDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
        if (
          normalizedDate.getFullYear() !== params.calendarViewYear ||
          normalizedDate.getMonth() !== params.calendarViewMonth
        ) {
          return null;
        }
        if (params.planStartDateOnly && normalizedDate < params.planStartDateOnly) {
          return null;
        }
        if (params.planEndDateOnly && normalizedDate > params.planEndDateOnly) {
          return null;
        }
        return normalizedDate.getDate();
      })
      .filter((day): day is number => typeof day === "number")
  );

  const selectedWeekDays = new Set<WeekDay>([
    ...params.quickPlanFeedDays,
    ...params.quickPlanReelDays,
    ...params.quickPlanStoryDays,
  ]);

  const daysInMonth = new Date(params.calendarViewYear, params.calendarViewMonth + 1, 0).getDate();
  const selectedWeekPatternDays = new Set<number>(
    params.isWeeklyPlanMarkedOnCalendar
      ? Array.from({ length: daysInMonth }, (_, idx) => idx + 1).filter((day) => {
          const targetDate = new Date(params.calendarViewYear, params.calendarViewMonth, day);
          const targetDateOnly = new Date(
            targetDate.getFullYear(),
            targetDate.getMonth(),
            targetDate.getDate()
          );
          if (params.planStartDateOnly && targetDateOnly < params.planStartDateOnly) {
            return false;
          }
          if (params.planEndDateOnly && targetDateOnly > params.planEndDateOnly) {
            return false;
          }
          const dayLabel = params.weekDays[targetDate.getDay()];
          return selectedWeekDays.has(dayLabel);
        })
      : []
  );

  const generatedPlanDays = new Set<number>(
    params.monthlyCalendarPlan
      .map((item) => new Date(item.dateIso))
      .filter((date) => !Number.isNaN(date.getTime()))
      .filter(
        (date) =>
          date.getFullYear() === params.calendarViewYear &&
          date.getMonth() === params.calendarViewMonth
      )
      .map((date) => date.getDate())
  );

  return params.monthlyCalendarPlan.length > 0
    ? generatedPlanDays
    : new Set<number>([...scheduledDays, ...selectedWeekPatternDays]);
};
