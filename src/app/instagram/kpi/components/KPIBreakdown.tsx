"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ChevronRight, ExternalLink, Loader2, PieChart, AlertCircle } from "lucide-react";
import { getLabEditorHref, getAnalyticsHref } from "@/utils/links";
import type { KPIBreakdown } from "@/app/api/analytics/kpi-breakdown/route";

interface KPIBreakdownProps {
  breakdowns: KPIBreakdown[];
  isLoading?: boolean;
  error?: string | null;
}

const statusStyles: Record<
  "gold" | "negative" | "normal",
  { label: string; className: string }
> = {
  gold: {
    label: "ゴールド",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  negative: {
    label: "ネガティブ",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  normal: {
    label: "通常",
    className: "border-slate-200 bg-slate-50 text-slate-600",
  },
};

function formatValue(value: number, unit: KPIBreakdown["unit"]) {
  if (unit === "percent") {
    return `${value.toFixed(1)}%`;
  }
  return Number.isFinite(value) ? value.toLocaleString() : "-";
}

function formatChange(change?: number) {
  if (change === undefined || Number.isNaN(change)) {
    return null;
  }
  const formatted = `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;
  const className =
    change > 0
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : change < 0
        ? "text-rose-700 bg-rose-50 border-rose-200"
        : "text-slate-700 bg-slate-50 border-slate-200";
  return { formatted, className };
}

export const KPIBreakdownComponent: React.FC<KPIBreakdownProps> = ({
  breakdowns,
  isLoading,
  error,
}) => {
  // 最も値が低いKPI項目を特定（来月強化すべきもの）
  const lowestKPIKey = useMemo(() => {
    if (!breakdowns || breakdowns.length === 0) return null;
    
    // 比較可能なKPI項目のみを対象（単位が同じもの同士で比較）
    const comparableKPIs = breakdowns.filter(
      (item) => item.value !== undefined && item.value !== null && Number.isFinite(item.value)
    );
    
    if (comparableKPIs.length === 0) return null;
    
    // 値が最も低いKPI項目を特定
    const lowest = comparableKPIs.reduce((min, current) => {
      // パーセンテージの場合はそのまま、カウントの場合は正規化が必要かもしれないが、
      // とりあえず生の値で比較（必要に応じて調整可能）
      return current.value < min.value ? current : min;
    });
    
    return lowest.key;
  }, [breakdowns]);

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#FF8A15] mr-3" />
          <span className="text-sm text-gray-700">KPIデータを読み込み中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 p-6">
        <div className="bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!breakdowns || breakdowns.length === 0) {
    return (
      <div className="bg-white border border-gray-200 p-6">
        <div className="text-center py-12 text-gray-500">
          <p className="text-sm">KPIデータがありません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 p-6 mb-6">
      <div className="mb-4 pb-3 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-[#ff8a15] flex items-center justify-center mr-3 flex-shrink-0">
            <PieChart className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">KPI 分解とドリルダウン</h2>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {breakdowns.map((item) => {
          const changeMeta = formatChange(item.changePct);
          const segmentTotal =
            item.segments?.reduce((sum, segment) => sum + Math.max(segment.value, 0), 0) || 0;
          
          // このKPI項目が最も低い値かどうか
          const isLowestKPI = item.key === lowestKPIKey;

          return (
            <div 
              key={item.key} 
              className={`border p-4 space-y-4 ${
                isLowestKPI 
                  ? "border-red-300 bg-red-50/40" 
                  : "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {item.label}
                    </p>
                    {isLowestKPI && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300">
                        <AlertCircle className="w-3 h-3" />
                        来月強化
                      </span>
                    )}
                  </div>
                  <p className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mt-1 break-all">
                    {formatValue(item.value, item.unit)}
                  </p>
                  {item.key === "engagement" && (
                    <p className="mt-1 text-[10px] text-gray-500">
                      Signalでは「いいね + コメント + シェア + 保存」を独自に合算した値です
                    </p>
                  )}
                  {item.key === "total_interaction" && (
                    <p className="mt-1 text-[10px] text-gray-500">
                      フィード・リール合わせた総合インタラクション数（いいね + 保存 + コメント + シェアの合計）です
                    </p>
                  )}
                </div>
                {changeMeta && (
                  <span
                    className={`text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border flex-shrink-0 ${changeMeta.className}`}
                  >
                    {changeMeta.formatted}
                  </span>
                )}
              </div>

              {item.insight && (
                <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 p-3">
                  {item.insight}
                </div>
              )}

              {item.segments && item.segments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-gray-500">内訳</p>
                  {item.segments.map((segment) => {
                    const share =
                      segmentTotal > 0 ? Math.min(100, (segment.value / segmentTotal) * 100) : 0;
                    return (
                      <div key={`${item.key}-${segment.label}`}>
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>{segment.label}</span>
                          <span>
                            {item.key === "current_followers"
                              ? segment.value > 0
                                ? `+${segment.value.toLocaleString()}人`
                                : `${segment.value.toLocaleString()}人`
                              : `${segment.value.toLocaleString()}件`}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 overflow-hidden">
                          <div
                            className="h-2 bg-[#ff8a15]"
                            style={{ width: `${share}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold text-gray-500">貢献度が高い投稿</p>
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    投稿を開いて詳細を見る <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
                {item.topPosts && item.topPosts.length > 0 ? (
                  <div className="space-y-2">
                    {item.topPosts.map((post) => {
                      const labHref = getLabEditorHref(post.postType || "feed", post.postId);
                      const analyticsHref = getAnalyticsHref(post.postType || "feed", post.postId);
                      const statusMeta = statusStyles[post.status || "normal"];

                      return (
                        <div
                          key={`${item.key}-${post.postId}`}
                          className="border border-gray-200 p-3 bg-gray-50"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                                {post.title || "無題の投稿"}
                              </p>
                              <p className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5">
                                {post.value.toLocaleString()}件
                              </p>
                            </div>
                            {post.status && (
                              <span
                                className={`text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full border ${statusMeta.className} flex-shrink-0`}
                              >
                                {statusMeta.label}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2 mt-2 flex-wrap">
                            {labHref && (
                              <Link
                                href={labHref}
                                className="text-xs font-medium text-gray-700 border border-gray-300 bg-white px-2 py-1 hover:bg-gray-100 transition-colors inline-flex items-center gap-1"
                              >
                                Labで開く
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            )}
                            {analyticsHref && (
                              <Link
                                href={analyticsHref}
                                className="text-xs font-medium text-gray-700 border border-gray-300 bg-white px-2 py-1 hover:bg-gray-100 transition-colors inline-flex items-center gap-1"
                              >
                                分析
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">該当データがありません</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

