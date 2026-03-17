"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

interface MonthlyCalendarSectionProps {
  calendarViewYear: number;
  calendarViewMonth: number;
  handleCalendarPrevMonth: () => void;
  handleCalendarNextMonth: () => void;
  showCalendarGateLoader: boolean;
  calendarGateProgress: number;
  renderGateLoader: (params: {
    message: string;
    subMessage: string;
    progress: number;
  }) => ReactNode;
  calendarCells: Array<number | null>;
  today: Date;
  markedDays: Set<number>;
  handleCalendarDayClick: (day: number | null) => void;
  isGeneratingMonthlyCalendarPlan: boolean;
  isWeeklyPlanMarkedOnCalendar: boolean;
  planStartDateOnly: Date | null;
  planEndDateOnly: Date | null;
}

export function MonthlyCalendarSection({
  calendarViewYear,
  calendarViewMonth,
  handleCalendarPrevMonth,
  handleCalendarNextMonth,
  showCalendarGateLoader,
  calendarGateProgress,
  renderGateLoader,
  calendarCells,
  today,
  markedDays,
  handleCalendarDayClick,
  isGeneratingMonthlyCalendarPlan,
  isWeeklyPlanMarkedOnCalendar,
  planStartDateOnly,
  planEndDateOnly,
}: MonthlyCalendarSectionProps) {
  return (
    <div className="bg-white border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-light text-gray-900 flex items-center gap-2">
          <span>📅</span>
          {calendarViewYear}年{calendarViewMonth + 1}月
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCalendarPrevMonth}
            className="p-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50"
            aria-label="先月へ移動"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleCalendarNextMonth}
            className="p-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50"
            aria-label="来月へ移動"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      {showCalendarGateLoader ? (
        renderGateLoader({
          message: "カレンダーを生成中です。",
          subMessage: "1ヶ月分の内容を作成しています。",
          progress: calendarGateProgress,
        })
      ) : (
        <>
          <div className="grid grid-cols-7 gap-2 text-center text-sm mb-3 text-gray-600 font-medium">
            {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2 text-base">
            {calendarCells.map((day, idx) => {
              const isEmpty = day === null;
              const isToday =
                day !== null &&
                calendarViewYear === today.getFullYear() &&
                calendarViewMonth === today.getMonth() &&
                day === today.getDate();
              const isMarked = day !== null && markedDays.has(day);

              return (
                <button
                  type="button"
                  onClick={() => handleCalendarDayClick(day)}
                  disabled={!day || !isMarked}
                  key={`cal-${idx}`}
                  aria-current={isToday ? "date" : undefined}
                  className={`relative h-11 flex items-center justify-center border font-medium transition-colors ${
                    isEmpty
                      ? "border-transparent bg-transparent cursor-default"
                      : isToday && isMarked
                        ? "border-[#FF8A15] bg-orange-50 text-[#FF8A15] ring-1 ring-orange-300"
                        : isToday
                          ? "border-[#FF8A15] bg-orange-50 text-[#FF8A15]"
                          : isMarked
                            ? "border-orange-300 bg-white text-gray-900 hover:bg-orange-50 cursor-pointer"
                            : "border-gray-100 text-gray-400 cursor-default"
                  }`}
                >
                  <span>{day ?? ""}</span>
                  {isMarked && (
                    <span
                      className={`absolute bottom-1 h-1.5 w-1.5 ${isToday ? "bg-[#FF8A15]" : "bg-orange-400"}`}
                    />
                  )}
                </button>
              );
            })}
          </div>
          {isGeneratingMonthlyCalendarPlan && (
            <div className="mt-3 border border-orange-200 bg-orange-50 px-3 py-2">
              <p className="text-xs text-orange-700">1ヶ月分の予定をAIが生成中...</p>
            </div>
          )}
          {isWeeklyPlanMarkedOnCalendar && planStartDateOnly && planEndDateOnly && (
            <p className="mt-3 text-[11px] text-gray-500">
              計画期間: {planStartDateOnly.getFullYear()}/{planStartDateOnly.getMonth() + 1}/{planStartDateOnly.getDate()} 〜 {planEndDateOnly.getFullYear()}/{planEndDateOnly.getMonth() + 1}/{planEndDateOnly.getDate()}
            </p>
          )}
        </>
      )}
    </div>
  );
}
