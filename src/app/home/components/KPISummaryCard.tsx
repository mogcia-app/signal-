"use client";

import React from "react";
import Link from "next/link";
import { BarChart3, TrendingUp, TrendingDown, ArrowRight, Loader2 } from "lucide-react";

interface KPISummaryCardProps {
  breakdowns: Array<{
    key: string;
    label: string;
    value: number;
    changePct?: number;
    unit?: "count" | "percent";
    segments?: Array<{
      label: string;
      value: number;
      delta?: number;
    }>;
  }>;
  isLoading?: boolean;
}

function formatValue(value: number, unit?: "count" | "percent") {
  if (unit === "percent") {
    return `${value.toFixed(1)}%`;
  }
  return Number.isFinite(value) ? value.toLocaleString() : "-";
}

export const KPISummaryCard: React.FC<KPISummaryCardProps> = ({
  breakdowns,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-[#FF8A15] mr-2" />
          <span className="text-sm text-gray-700">読み込み中...</span>
        </div>
      </div>
    );
  }

  if (!breakdowns || breakdowns.length === 0) {
    return (
      <div className="bg-white border border-gray-200 p-6 mb-6">
        <div className="text-center py-12 text-gray-700">
          <p className="text-sm">KPIデータがありません</p>
        </div>
      </div>
    );
  }

  // カードの背景色をKPIごとに設定（すべて白背景に統一）
  const getCardColor = (key: string) => {
    return { bg: "bg-white", border: "border-gray-200" };
  };

  return (
    <div className="bg-white border border-gray-200 p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white border-2 border-gray-200 flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF8A15]" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900">今月のKPIサマリー</h2>
            <p className="text-xs text-gray-500 mt-0.5">KPIドリルダウンの各指標の数値</p>
          </div>
        </div>
        <Link
          href="/instagram/kpi"
          className="text-xs text-gray-700 hover:text-[#FF8A15] font-medium flex items-center gap-1 transition-colors self-start sm:self-auto"
        >
          詳細を見る
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {breakdowns.map((kpi) => {
          const colors = getCardColor(kpi.key);
          return (
            <div
              key={kpi.key}
              className={`${colors.bg} ${colors.border} border p-2.5 sm:p-3 md:p-4`}
            >
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <span className="text-[10px] sm:text-xs font-medium text-gray-500 truncate">{kpi.label}</span>
                {kpi.changePct !== undefined && !Number.isNaN(kpi.changePct) && (
                  <div
                    className={`flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-semibold flex-shrink-0 ml-1 ${
                      kpi.changePct >= 0 ? "text-[#FF8A15]" : "text-red-500"
                    }`}
                  >
                    {kpi.changePct >= 0 ? (
                      <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    ) : (
                      <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    )}
                    <span className="whitespace-nowrap">
                      {kpi.changePct > 0 ? "+" : ""}
                      {kpi.changePct.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 break-all">
                {formatValue(kpi.value, kpi.unit)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

