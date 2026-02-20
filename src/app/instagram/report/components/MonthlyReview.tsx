"use client";

import React from "react";
import { Brain } from "lucide-react";
import type { ReportData } from "../../../../types/report";
import { BotStatusCard } from "../../../../components/bot-status-card";

interface MonthlyReviewProps {
  selectedMonth: string;
  kpis?: {
    totalLikes: number;
    totalReach: number;
    totalSaves: number;
    totalComments: number;
    totalFollowerIncrease: number;
  } | null;
  reportData?: ReportData | null;
  onGenerate?: () => void;
  usageLabel?: string;
  onRefreshUsage?: () => void;
  isGenerating?: boolean;
}

interface MonthlyReviewData {
  review: string; // AI生成の振り返りテキスト
  hasPlan: boolean;
  analyzedCount: number;
  generationState: "locked" | "ready" | "generated";
  requiredCount: number;
  remainingCount: number;
}

export const MonthlyReview: React.FC<MonthlyReviewProps> = ({
  selectedMonth: _selectedMonth,
  kpis: _kpis,
  reportData,
  onGenerate,
  usageLabel,
  onRefreshUsage,
  isGenerating = false,
}) => {
  const reviewData: MonthlyReviewData | null = React.useMemo(() => {
    const monthlyReview = reportData?.monthlyReview as {
      review?: string;
      hasPlan?: boolean;
      analyzedCount?: number;
      generationState?: "locked" | "ready" | "generated";
      requiredCount?: number;
      remainingCount?: number;
    } | undefined;

    return monthlyReview
      ? {
          review: monthlyReview.review || "",
          hasPlan: monthlyReview.hasPlan || false,
          analyzedCount: monthlyReview.analyzedCount || 0,
          generationState: monthlyReview.generationState || "locked",
          requiredCount: monthlyReview.requiredCount || 10,
          remainingCount: monthlyReview.remainingCount ?? Math.max(0, 10 - (monthlyReview.analyzedCount || 0)),
        }
      : null;
  }, [reportData?.monthlyReview]);

  return (
    <div className="bg-white border border-gray-200 p-3 sm:p-4 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#ff8a15] flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
            <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">今月の振り返り</h2>
            <p className="text-xs text-gray-600 mt-0.5">
              AIが生成した月次の総合的な振り返り
            </p>
          </div>
        </div>
      </div>

      {reviewData && (
        <div className="mt-4 pt-4 border-t border-gray-200 animate-in fade-in duration-300">
          <div className="space-y-4">
            {isGenerating && (
              <div role="status" aria-live="polite" className="mb-1">
                <BotStatusCard
                  title="生成中..."
                  subtitle="今月の振り返りを生成しています"
                  progress={72}
                  compact
                />
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-600">分析データ進捗</p>
                <p className="text-xs font-semibold text-gray-700">
                  {Math.min(reviewData.analyzedCount, reviewData.requiredCount)}/{reviewData.requiredCount}
                </p>
              </div>
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: reviewData.requiredCount }).map((_, index) => {
                  const isFilled = index < Math.min(reviewData.analyzedCount, reviewData.requiredCount);
                  return (
                    <div
                      key={`progress-step-${index}`}
                      className={`h-2 border border-gray-200 rounded-none ${isFilled ? "bg-[#ff8a15]" : "bg-gray-100"}`}
                    />
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-gray-600">
                {reviewData.generationState === "locked"
                  ? `あと${reviewData.remainingCount}件で分析レポート利用可能です。`
                  : reviewData.generationState === "ready"
                    ? "10件達成しました。ボタンを押すと今月の振り返りを生成します。"
                    : "生成済みの今月の振り返りを表示しています。"}
              </p>
            </div>

            {reviewData.review && (
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-100">
                <div
                  className="monthly-review-content text-sm text-gray-800 whitespace-pre-line"
                  style={{
                    whiteSpace: "pre-line",
                    lineHeight: "1.7",
                  }}
                  dangerouslySetInnerHTML={{
                    __html: reviewData.review.replace(/\*\*/g, "").replace(/\n/g, "<br />"),
                  }}
                />
              </div>
            )}

            {!reviewData.review && (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">
                  {reviewData.generationState === "locked"
                    ? "分析データが10件に達すると生成できます"
                    : "生成ボタンを押すと今月の振り返りが表示されます"}
                </p>
              </div>
            )}

            <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
              {usageLabel && (
                <div className="mr-auto flex items-center gap-2 text-[11px] text-gray-600">
                  <span>{usageLabel}</span>
                  {onRefreshUsage && (
                    <button
                      type="button"
                      onClick={onRefreshUsage}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      更新
                    </button>
                  )}
                </div>
              )}
              {reviewData.generationState !== "generated" && (
                <button
                  type="button"
                  onClick={onGenerate}
                  disabled={reviewData.generationState !== "ready" || isGenerating}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                  style={{ backgroundColor: reviewData.generationState === "ready" && !isGenerating ? "#ff8a15" : "#d1d5db" }}
                >
                  <span>{isGenerating ? "生成中..." : "今月の振り返りを生成"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
