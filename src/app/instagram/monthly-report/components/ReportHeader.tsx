import React from "react";
import { Calendar, BarChart3 } from "lucide-react";

interface ReportHeaderProps {
  selectedMonth: string;
  activeView: "ai" | "metrics";
  onViewChange: (view: "ai" | "metrics") => void;
  onMonthChange: (month: string) => void;
  getMonthDisplayName: (monthStr: string) => string;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  selectedMonth,
  activeView,
  onViewChange,
  onMonthChange,
  getMonthDisplayName,
}) => {
  return (
    <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-none p-6 mb-8 border border-orange-200">
      <div className="flex items-center justify-between">
        {/* 左側: タイトルと説明 */}
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-none flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              月次レポート
              <span className="ml-3 text-lg font-normal text-orange-600">📊</span>
            </h1>
            <p className="text-gray-600 mt-2 flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-orange-500" />
              {getMonthDisplayName(selectedMonth)}
              の分析結果
            </p>
          </div>
        </div>

        {/* 右側: コントロール */}
        <div className="flex items-center space-x-4">
          <div className="flex bg-white rounded-none p-1 shadow-sm border border-orange-200">
            {[
              { value: "ai", label: "AIインサイト" },
                { value: "metrics", label: "KPIコンソール" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => onViewChange(tab.value as "ai" | "metrics")}
                className={`px-4 py-2 text-sm font-medium rounded-none transition-all duration-200 ${
                  activeView === tab.value
                    ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md"
                    : "text-gray-600 hover:text-orange-600 hover:bg-orange-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-none p-3 shadow-sm border border-orange-200">
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 mr-1 text-orange-500" />
              対象月
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
