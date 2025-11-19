"use client";

import React from "react";
import Link from "next/link";
import { BarChart3, ChevronRight, ExternalLink } from "lucide-react";
import { getLabEditorHref, getAnalyticsHref } from "@/utils/links";

type KPISegment = {
  label: string;
  value: number;
  delta?: number;
};

type KPITopPost = {
  postId: string;
  title: string;
  value: number;
  postType?: "feed" | "reel" | "story";
  status?: "gold" | "negative" | "normal";
};

export type KPIBreakdown = {
  key: "reach" | "saves" | "followers" | "engagement";
  label: string;
  value: number;
  unit?: "count" | "percent";
  changePct?: number;
  segments?: KPISegment[];
  topPosts?: KPITopPost[];
  insight?: string;
};

interface KPIDrilldownSectionProps {
  breakdowns?: KPIBreakdown[] | null;
}

const statusStyles: Record<
  Required<KPITopPost>["status"],
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

export function KPIDrilldownSection({ breakdowns }: KPIDrilldownSectionProps) {
  if (!breakdowns || breakdowns.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-none p-6 shadow-sm mb-6">
      <div className="flex items-start sm:items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-slate-600" />
            <h2 className="text-lg font-semibold text-black">KPI 分解とドリルダウン</h2>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            主要 KPI を要素ごとに分解し、何が伸びたか／落ちたかを素早く把握できます。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {breakdowns.map((item) => {
          const changeMeta = formatChange(item.changePct);
          const segmentTotal =
            item.segments?.reduce((sum, segment) => sum + Math.max(segment.value, 0), 0) || 0;

          return (
            <div key={item.key} className="border border-slate-200 rounded-none p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p
                    className="text-xs font-semibold text-slate-500 uppercase tracking-wide"
                    dangerouslySetInnerHTML={{
                      __html: String(item.label || ""),
                    }}
                  />
                  <p className="text-2xl font-semibold text-slate-900 mt-1">
                    {formatValue(item.value, item.unit)}
                  </p>
                  {item.key === "engagement" && (
                    <p className="mt-1 text-[10px] text-slate-500">
                      Signalでは「いいね + コメント + シェア + 保存」を独自に合算した値です
                    </p>
                  )}
                </div>
                {changeMeta && (
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full border ${changeMeta.className}`}
                    dangerouslySetInnerHTML={{
                      __html: String(changeMeta.formatted || ""),
                    }}
                  />
                )}
              </div>

              {item.insight && (
                <div
                  className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-none p-3"
                  dangerouslySetInnerHTML={{
                    __html: String(item.insight || ""),
                  }}
                />
              )}

              {item.segments && item.segments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-slate-500">内訳</p>
                  {item.segments.map((segment) => {
                    const share =
                      segmentTotal > 0 ? Math.min(100, (segment.value / segmentTotal) * 100) : 0;
                    return (
                      <div key={`${item.key}-${segment.label}`}>
                        <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                          <span
                            dangerouslySetInnerHTML={{
                              __html: String(segment.label || ""),
                            }}
                          />
                          <span>{segment.value.toLocaleString()}件</span>
                        </div>
                        <div className="h-2 bg-[#ff8a15] rounded-full overflow-hidden">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${share}%`,
                              background:
                                "linear-gradient(90deg, #ffb347 0%, #ff8a15 50%, #ff6b15 100%)",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold text-slate-500">貢献度が高い投稿</p>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
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
                          className="border border-slate-200 rounded-none p-3 bg-slate-50"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p
                                className="text-sm font-semibold text-slate-900"
                                dangerouslySetInnerHTML={{
                                  __html: String(post.title || "無題の投稿"),
                                }}
                              />
                              <p className="text-[11px] text-slate-500">
                                {post.value.toLocaleString()}件
                              </p>
                            </div>
                            {post.status && (
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusMeta.className}`}
                              >
                                {statusMeta.label}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            {labHref && (
                              <Link
                                href={labHref}
                                className="text-[11px] font-semibold text-slate-700 border border-slate-300 bg-white px-2.5 py-1 rounded-none hover:bg-slate-100 transition-colors inline-flex items-center gap-1"
                              >
                                Labで開く
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            )}
                            {analyticsHref && (
                              <Link
                                href={analyticsHref}
                                className="text-[11px] font-semibold text-slate-700 border border-slate-300 bg-white px-2.5 py-1 rounded-none hover:bg-slate-100 transition-colors inline-flex items-center gap-1"
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
                  <p className="text-xs text-slate-400">該当データがありません</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

