/**
 * 週次KPIセクションコンポーネント
 */

import React from "react";
import { TrendingUp, Loader2 } from "lucide-react";
import { useHomeStore } from "@/stores/home-store";

interface WeeklyResult {
  metric: string;
  value: number;
  change: number;
  icon: string;
}

interface WeeklyKPISectionProps {
  weeklyResults: WeeklyResult[];
}

export function WeeklyKPISection({ weeklyResults }: WeeklyKPISectionProps) {
  const isLoadingDashboard = useHomeStore((state) => state.isLoadingDashboard);
  const dashboardData = useHomeStore((state) => state.dashboardData);

  if (!dashboardData?.weeklyKPIs && !isLoadingDashboard) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
        <span>📊</span>
        今週の成果
      </h2>
      {isLoadingDashboard ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-[#FF8A15] mr-2" />
          <span className="text-sm text-gray-500">読み込み中...</span>
        </div>
      ) : weeklyResults.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {weeklyResults.map((result, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-light text-gray-600">{result.metric}</div>
                <span className="text-2xl">{result.icon}</span>
              </div>
              <div className="text-2xl font-light text-gray-900 mb-1">
                {result.value.toLocaleString()}
              </div>
              {result.change !== 0 && (
                <div
                  className={`text-xs font-light flex items-center gap-1 ${
                    result.change > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  <TrendingUp className={`w-3 h-3 ${result.change < 0 ? "rotate-180" : ""}`} />
                  {result.change > 0 ? "+" : ""}
                  {result.change.toLocaleString()}
                  <span className="text-gray-500">（先週比）</span>
                </div>
              )}
              {result.change === 0 && (
                <div className="text-xs font-light text-gray-400">先週と変動なし</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-4">データがありません</p>
      )}
    </div>
  );
}

