"use client";

import React, { useState, useCallback } from "react";
import { Brain, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../../../../contexts/auth-context";
import { authFetch } from "../../../../utils/authFetch";

interface MonthlyReviewProps {
  selectedMonth: string;
  kpis?: {
    totalLikes: number;
    totalReach: number;
    totalSaves: number;
    totalComments: number;
    totalFollowerIncrease: number;
  } | null;
}

interface MonthlyReviewData {
  review: string; // AI生成の振り返りテキスト
  hasPlan: boolean;
  postCount: number;
  analyzedCount: number;
}

export const MonthlyReview: React.FC<MonthlyReviewProps> = ({ selectedMonth, kpis }) => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<MonthlyReviewData | null>(null);

  const fetchReview = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // KPIデータをクエリパラメータとして渡す
      const params = new URLSearchParams({ date: selectedMonth });
      if (kpis) {
        params.append("totalLikes", kpis.totalLikes.toString());
        params.append("totalReach", kpis.totalReach.toString());
        params.append("totalSaves", kpis.totalSaves.toString());
        params.append("totalComments", kpis.totalComments.toString());
        params.append("totalFollowerIncrease", kpis.totalFollowerIncrease.toString());
      }
      
      const response = await authFetch(
        `/api/analytics/monthly-review-simple?${params.toString()}`
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setReviewData(result.data);
          setIsExpanded(true);
        } else {
          setError("データの取得に失敗しました");
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || "データの取得に失敗しました");
      }
    } catch (err) {
      console.error("月次振り返り取得エラー:", err);
      setError("データの取得中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedMonth, kpis]);

  const handleToggle = () => {
    if (!isExpanded && !reviewData) {
      fetchReview();
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0 shadow-sm">
            <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">今月の振り返り</h2>
            <p className="text-xs text-gray-600 mt-0.5">
              AIが生成した月次の総合的な振り返り
            </p>
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={isLoading}
          className="flex items-center justify-center space-x-1.5 px-3 py-1.5 text-sm bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline text-xs">分析中...</span>
            </>
          ) : isExpanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs">閉じる</span>
            </>
          ) : (
            <>
              <Brain className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs">振り返りを見る</span>
            </>
          )}
        </button>
      </div>

      {/* コンテンツ */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 animate-in fade-in duration-300">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-orange-600 mr-2" />
              <span className="text-sm text-gray-700">AI分析を実行中...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
              <div className="flex items-start">
                <div className="w-4 h-4 text-red-600 mr-2 mt-0.5 flex-shrink-0">⚠️</div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-red-800 mb-1.5">{error}</p>
                  <button
                    onClick={fetchReview}
                    className="text-xs text-red-600 hover:text-red-800 underline font-medium"
                  >
                    再試行
                  </button>
                </div>
              </div>
            </div>
          ) : reviewData ? (
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
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

