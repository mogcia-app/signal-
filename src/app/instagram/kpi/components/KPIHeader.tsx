import React from "react";
import { Calendar, BarChart3 } from "lucide-react";

interface KPIHeaderProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  periodLabel: string;
}

export const KPIHeader: React.FC<KPIHeaderProps> = ({
  selectedMonth,
  onMonthChange,
  periodLabel,
}) => {
  const [selectedYearRaw, selectedMonthRaw] = selectedMonth.split("-");
  const selectedYear = Number.parseInt(selectedYearRaw || "", 10);
  const selectedMonthNumber = Number.parseInt(selectedMonthRaw || "", 10);
  const now = new Date();
  const fallbackYear = now.getFullYear();
  const yearValue = Number.isFinite(selectedYear) ? selectedYear : fallbackYear;
  const monthValue = Number.isFinite(selectedMonthNumber) ? selectedMonthNumber : now.getMonth() + 1;
  const yearStart = yearValue - 2;
  const yearOptions = Array.from({ length: 5 }, (_, index) => yearStart + index);

  const handleYearChange = (nextYearText: string) => {
    const nextYear = Number.parseInt(nextYearText, 10);
    if (!Number.isFinite(nextYear)) {
      return;
    }
    onMonthChange(`${nextYear}-${String(monthValue).padStart(2, "0")}`);
  };

  const handleMonthChange = (nextMonthText: string) => {
    const nextMonth = Number.parseInt(nextMonthText, 10);
    if (!Number.isFinite(nextMonth) || nextMonth < 1 || nextMonth > 12) {
      return;
    }
    onMonthChange(`${yearValue}-${String(nextMonth).padStart(2, "0")}`);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 sm:gap-3">
        {/* 左側: タイトルと説明 */}
        <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-[#ff8a15] flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-gray-900 truncate">
              KPIコンソール
            </h1>
            <p className="text-sm text-gray-700 mt-0.5 flex items-center flex-wrap">
              <Calendar className="w-4 h-4 mr-1.5 text-gray-700 flex-shrink-0" />
              <span className="break-words">
                対象期間: {periodLabel}
              </span>
            </p>
          </div>
        </div>

        {/* 右側: 月選択 */}
        <div className="bg-white border border-gray-200 p-3 w-full md:w-auto md:flex-shrink-0">
          <label className="flex items-center text-sm font-medium text-gray-700 mb-1.5">
            <Calendar className="w-4 h-4 mr-1 text-gray-700 flex-shrink-0" />
            対象サイクル
          </label>
          <div className="flex items-center gap-2">
            <select
              value={String(yearValue)}
              onChange={(e) => handleYearChange(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] transition-colors"
              aria-label="KPI分析の対象サイクル年を選択"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}年
                </option>
              ))}
            </select>
            <select
              value={String(monthValue)}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] transition-colors"
              aria-label="KPI分析の対象サイクル月を選択"
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                <option key={month} value={month}>
                  {month}月
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
