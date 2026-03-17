"use client";

import Image from "next/image";
import { Target, TrendingUp, X } from "lucide-react";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import type { DashboardData } from "@/types/home";
import type {
  AiDirectionData,
  HomeUnanalyzedPost,
  MonthlyResult,
  TomorrowPreparationItem,
} from "../types";

interface OverviewSectionProps {
  monthlyAlgorithmTheme: string;
  aiDirection: AiDirectionData | null;
  monthlyKPIsAvailable: boolean;
  isLoadingMonthlyKPIs: boolean;
  monthlyResults: MonthlyResult[];
  showPlanCreatedBanner: boolean;
  onClosePlanCreatedBanner: () => void;
  currentPlan: DashboardData["currentPlan"] | null | undefined;
  isLoadingHomeUnanalyzedPosts: boolean;
  homeUnanalyzedPosts: HomeUnanalyzedPost[];
  isLoadingTomorrowPreparations: boolean;
  visibleTomorrowPreparations: TomorrowPreparationItem[];
  removeMarkdown: (text: string) => string;
  getTimelineTypeBadgeClass: (type: string) => string;
  onOpenMonthlyReport: () => void;
  onOpenAnalysis: (params: { postId: string; type: "feed" | "reel" | "story" }) => void;
  onApplyPreparationToGenerator: (params: {
    type: string;
    prompt: string;
    useTomorrowDate?: boolean;
  }) => void;
}

export function OverviewSection({
  monthlyAlgorithmTheme,
  aiDirection,
  monthlyKPIsAvailable,
  isLoadingMonthlyKPIs,
  monthlyResults,
  showPlanCreatedBanner,
  onClosePlanCreatedBanner,
  currentPlan,
  isLoadingHomeUnanalyzedPosts,
  homeUnanalyzedPosts,
  isLoadingTomorrowPreparations,
  visibleTomorrowPreparations,
  removeMarkdown,
  getTimelineTypeBadgeClass,
  onOpenMonthlyReport,
  onOpenAnalysis,
  onApplyPreparationToGenerator,
}: OverviewSectionProps) {
  return (
    <div className="hidden md:block space-y-6">
      <div className="border border-orange-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-orange-200 bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-3">
          <h2 className="text-sm font-semibold tracking-[0.08em] text-white">今月の重点テーマ</h2>
        </div>
        <div className="px-5 py-4 space-y-2">
          <p className="text-sm text-gray-900">{monthlyAlgorithmTheme}</p>
        </div>
      </div>

      {aiDirection && aiDirection.lockedAt && aiDirection.mainTheme && (() => {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const isCurrentMonth = aiDirection.month === currentMonth;
        const monthLabel = isCurrentMonth ? "今月" : "来月";

        return (
          <div className="bg-white border-2 border-gray-200 p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-base font-bold text-gray-900">{monthLabel}の重点方針</h2>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 font-medium">
                    {aiDirection.month.split("-")[0]}年{parseInt(aiDirection.month.split("-")[1] || "0", 10)}月
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed mb-3">
                  {removeMarkdown(aiDirection.mainTheme)}
                </p>
                <button
                  onClick={onOpenMonthlyReport}
                  className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors underline"
                >
                  月次レポートを見る →
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {monthlyKPIsAvailable && (
        <div className="bg-white border border-gray-200 p-6">
          <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
            <span>📊</span>
            今月の成果
          </h2>
          {isLoadingMonthlyKPIs ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="border border-gray-200 p-4">
                  <SkeletonLoader height="1rem" width="40%" className="mb-2" />
                  <SkeletonLoader height="2rem" width="60%" className="mb-2" />
                  <SkeletonLoader height="0.75rem" width="50%" />
                </div>
              ))}
            </div>
          ) : monthlyResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {monthlyResults.map((result, index) => (
                <div key={index} className="border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-light text-gray-600">{result.metric}</div>
                    <span className="text-2xl">{result.icon}</span>
                  </div>
                  <div className="text-2xl font-light text-gray-900 mb-1">
                    {result.format === "percent" ? `${result.value.toFixed(1)}%` : result.value.toLocaleString()}
                  </div>
                  {result.change !== undefined && result.change !== 0 && (
                    <div className={`text-xs font-light flex items-center gap-1 ${result.change > 0 ? "text-green-600" : "text-red-600"}`}>
                      <TrendingUp className={`w-3 h-3 ${result.change < 0 ? "rotate-180" : ""}`} />
                      {result.change > 0 ? "+" : ""}
                      {result.change.toFixed(1)}%
                      <span className="text-gray-500">（前月比）</span>
                    </div>
                  )}
                  {result.change === undefined && (
                    <div className="text-xs font-light text-gray-400">前月データなし</div>
                  )}
                  {result.change === 0 && (
                    <div className="text-xs font-light text-gray-400">前月と変動なし</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">データがありません</p>
          )}
        </div>
      )}

      {showPlanCreatedBanner && (
        <div className="bg-gradient-to-r from-[#FF8A15] to-orange-500 border border-orange-300 p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-light mb-2">✨ 運用プランができました！</h2>
              <p className="text-sm font-light opacity-90 mb-4">
                これから{currentPlan?.planPeriod || "3ヶ月"}、このプランで一緒に頑張りましょう！🔥
              </p>
              <button
                onClick={onClosePlanCreatedBanner}
                className="text-sm font-light underline hover:no-underline"
                aria-label="ダッシュボードに戻る"
              >
                ダッシュボードに戻る
              </button>
            </div>
            <button
              onClick={onClosePlanCreatedBanner}
              className="text-white hover:opacity-70 transition-opacity"
              aria-label="バナーを閉じる"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {currentPlan && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 p-6">
            <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
              <span>📌</span>
              分析待ちの投稿
            </h2>
            {isLoadingHomeUnanalyzedPosts ? (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                <SkeletonLoader height="1rem" width="100%" className="mb-1" />
                <SkeletonLoader height="1rem" width="90%" className="mb-1" />
                <SkeletonLoader height="1rem" width="80%" />
              </div>
            ) : homeUnanalyzedPosts.length > 0 ? (
              <div className="space-y-3">
                {homeUnanalyzedPosts.map((post) => {
                  const postTypeLabel = post.type === "feed" ? "フィード" : post.type === "reel" ? "リール" : "ストーリー";
                  const postTypeBadgeClass = getTimelineTypeBadgeClass(post.type);
                  return (
                    <div key={post.id} className="border border-gray-200 bg-gray-50 p-3">
                      <div className="flex gap-3">
                        <div className="w-14 h-14 bg-gray-100 flex-shrink-0 relative overflow-hidden">
                          {post.imageUrl ? (
                            <Image
                              src={post.imageUrl}
                              alt={post.title || "投稿画像"}
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">画像なし</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
                              {post.title || "タイトル未設定"}
                            </h3>
                            <span className={`text-[11px] border px-2 py-0.5 whitespace-nowrap ${postTypeBadgeClass}`}>
                              {postTypeLabel}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            作成日: {post.createdAt || "未設定"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-end">
                        <button
                          onClick={() => onOpenAnalysis({ postId: post.id, type: post.type })}
                          className="text-xs px-3 py-1.5 bg-gradient-to-r from-[#FF8A15] to-orange-500 text-white font-semibold hover:opacity-90 transition-opacity"
                        >
                          {post.type === "story" ? "投稿一覧で確認" : "今すぐ分析"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-4">分析待ちの投稿はありません</p>
            )}
          </div>

          <div className="bg-white border border-gray-200 p-6">
            <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
              <span>🔮</span>
              明日の準備
            </h2>
            {isLoadingTomorrowPreparations ? (
              <div className="space-y-3">
                <SkeletonLoader height="1rem" width="100%" className="mb-1" />
                <SkeletonLoader height="1rem" width="90%" className="mb-1" />
              </div>
            ) : visibleTomorrowPreparations.length > 0 ? (
              <div className="space-y-3">
                {visibleTomorrowPreparations.map((prep, index) => (
                  <div key={index} className="border-l-2 border-gray-300 pl-4 py-2">
                    <div className="flex items-start justify-between mb-1">
                      <span className={`text-[11px] border px-2 py-0.5 whitespace-nowrap ${getTimelineTypeBadgeClass(prep.type)}`}>
                        {prep.type === "feed" ? "フィード投稿" : prep.type === "reel" ? "リール投稿" : "ストーリーズ投稿"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2 font-medium">{prep.description}</p>
                    <p className="text-xs text-gray-500">{prep.preparation}</p>
                    {(prep.type === "feed" || prep.type === "reel" || prep.type === "story") && (
                      <button
                        onClick={() =>
                          onApplyPreparationToGenerator({
                            type: prep.type,
                            prompt: prep.description || prep.preparation || "",
                            useTomorrowDate: true,
                          })
                        }
                        className="mt-2 inline-flex items-center px-2.5 py-1 text-xs border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        投稿生成に反映
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-4">今週の予定から次の投稿を確認できます</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
