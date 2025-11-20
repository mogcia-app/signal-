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
    <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-3 sm:p-4 mb-4 border border-orange-200/50">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* 左側: タイトルと説明 */}
        <div className="flex items-center space-x-2 sm:space-x-3 flex-1">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center flex-wrap">
              KPIコンソール
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5 flex items-center flex-wrap">
              <Calendar className="w-3 h-3 mr-1.5 text-orange-500 flex-shrink-0" />
              <span className="break-words">
                {getMonthDisplayName(selectedMonth)}
                の分析結果
              </span>
            </p>
          </div>
        </div>

        {/* 右側: 月選択 */}
        <div className="bg-white rounded-lg p-2.5 shadow-sm border border-orange-200/50 w-full sm:w-auto lg:flex-shrink-0">
          <label className="flex items-center text-xs font-medium text-gray-700 mb-1.5">
            <Calendar className="w-3 h-3 mr-1 text-orange-500" />
            対象月
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="w-full sm:w-auto px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
          />
        </div>
      </div>
    </div>
  );
};

