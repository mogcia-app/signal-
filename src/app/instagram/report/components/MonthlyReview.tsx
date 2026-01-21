"use client";

import React, { useState, useEffect } from "react";
import { Brain, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

interface MonthlyReviewProps {
  selectedMonth: string;
  kpis?: {
    totalLikes: number;
    totalReach: number;
    totalSaves: number;
    totalComments: number;
    totalFollowerIncrease: number;
  } | null;
  reportData?: Record<string, unknown> | null;
  onRegenerate?: () => void;
}

interface MonthlyReviewData {
  review: string; // AI生成の振り返りテキスト
  hasPlan: boolean;
  postCount: number;
  analyzedCount: number;
}

export const MonthlyReview: React.FC<MonthlyReviewProps> = ({ selectedMonth, kpis, reportData, onRegenerate }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // reportDataから月次レビューデータを取得（useMemoでメモ化）
  const reviewData: MonthlyReviewData | null = React.useMemo(() => {
    const monthlyReview = reportData?.monthlyReview as { review?: string; hasPlan?: boolean; analyzedCount?: number } | undefined;
    return monthlyReview
      ? {
          review: monthlyReview.review || "",
          hasPlan: monthlyReview.hasPlan || false,
          postCount: 0,
          analyzedCount: monthlyReview.analyzedCount || 0,
        }
      : null;
  }, [reportData?.monthlyReview]);

  // データがある場合は自動的に展開
  useEffect(() => {
    if (reviewData?.review) {
      setIsExpanded(true);
    }
  }, [reviewData]);

  const handleToggle = () => {
      setIsExpanded(!isExpanded);
  };

  const handleRegenerate = () => {
    if (onRegenerate) {
      onRegenerate();
    }
  };

  return (
    <div className="bg-white border border-gray-200 p-3 sm:p-4 mb-4">
      {/* ヘッダー */}
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

        {reviewData && (
        <button
          onClick={handleToggle}
            className="flex items-center justify-center space-x-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all border border-gray-300"
        >
            {isExpanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs">閉じる</span>
            </>
          ) : (
            <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs">開く</span>
            </>
          )}
        </button>
        )}
      </div>

      {/* コンテンツ */}
      {isExpanded && reviewData && (
        <div className="mt-4 pt-4 border-t border-gray-200 animate-in fade-in duration-300">
          <div className="space-y-4">
            {/* 振り返りテキスト */}
            {reviewData.review && (
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-100">
                <div
                  className="monthly-review-content text-sm text-gray-800 whitespace-pre-line"
                  style={{
                    whiteSpace: "pre-line",
                    lineHeight: "1.7",
                  }}
                  dangerouslySetInnerHTML={{
                    __html: reviewData.review.replace(/\n/g, "<br />"),
                  }}
                />
              </div>
            )}

            {!reviewData.review && (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">振り返りデータがありません</p>
              </div>
            )}

            {/* 再提案するボタン */}
            {reviewData.review && (
              <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={handleRegenerate}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors border border-gray-300"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>再提案する</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

