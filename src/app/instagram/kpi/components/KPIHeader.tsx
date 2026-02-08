import React from "react";
import { Calendar, BarChart3 } from "lucide-react";

interface KPIHeaderProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  getMonthDisplayName: (monthStr: string) => string;
}

export const KPIHeader: React.FC<KPIHeaderProps> = ({
  selectedMonth,
  onMonthChange,
  getMonthDisplayName,
}) => {
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
                {getMonthDisplayName(selectedMonth)}
                の分析結果
              </span>
            </p>
          </div>
        </div>

        {/* 右側: 月選択 */}
        <div className="bg-white border border-gray-200 p-3 w-full md:w-auto md:flex-shrink-0">
          <label className="flex items-center text-sm font-medium text-gray-700 mb-1.5">
            <Calendar className="w-4 h-4 mr-1 text-gray-700 flex-shrink-0" />
            対象月
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="w-full md:w-auto px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] transition-colors"
            aria-label="KPI分析の対象月を選択"
          />
        </div>
      </div>
    </div>
  );
};

