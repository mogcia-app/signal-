"use client";

import React from "react";
import { FileText, TrendingUp, Lightbulb } from "lucide-react";
import type { ReportData } from "../../../../types/report";

interface PostSummaryInsightsProps {
  selectedMonth: string;
  reportData?: ReportData | null;
}

interface PostSummaryData {
  postId: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendedActions: string[];
  reach: number;
}

interface AggregatedInsights {
  topStrengths: string[];
  highPerformanceStrengths: string[];
  topActions: string[];
  postCount: number;
}

export const PostSummaryInsights: React.FC<PostSummaryInsightsProps> = ({
  selectedMonth: _selectedMonth,
  reportData,
}) => {
  // reportDataから投稿サマリーを取得して集計（useMemoでメモ化）
  const postSummaries: PostSummaryData[] = React.useMemo(() => {
    return reportData?.postSummaries || [];
  }, [reportData?.postSummaries]);

  // 実際の分析済み投稿数を取得（postSummariesの数ではなく、performanceScore.metrics.analyzedCountを使用）
  const actualAnalyzedCount = React.useMemo(() => {
    return reportData?.performanceScore?.metrics?.analyzedCount || postSummaries.length;
  }, [reportData?.performanceScore?.metrics?.analyzedCount, postSummaries.length]);

  const insights: AggregatedInsights | null = React.useMemo(() => {
    if (postSummaries.length === 0) {
      return null;
    }

    try {
      // AIサマリーを集計
      const allStrengths: string[] = [];
      const allRecommendedActions: string[] = [];
      const highPerformanceStrengths: string[] = [];

      postSummaries.forEach((summary) => {
        allStrengths.push(...(summary.strengths || []));
        allRecommendedActions.push(...(summary.recommendedActions || []));

        // 高パフォーマンス投稿の強みを抽出（上位30%）
        const sortedByReach = [...postSummaries].sort((a, b) => b.reach - a.reach);
        const top30Percent = Math.ceil(sortedByReach.length * 0.3);
        const isHighPerformance = sortedByReach
          .slice(0, top30Percent)
          .some((p) => p.postId === summary.postId);

        if (isHighPerformance) {
          highPerformanceStrengths.push(...(summary.strengths || []));
        }
      });

      // 頻出する強み・推奨アクションを抽出（出現回数でソート）
      const strengthFrequency = new Map<string, number>();
      allStrengths.forEach((strength) => {
        strengthFrequency.set(strength, (strengthFrequency.get(strength) || 0) + 1);
      });
      const topStrengths = Array.from(strengthFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([strength]) => strength);

      const actionFrequency = new Map<string, number>();
      allRecommendedActions.forEach((action) => {
        actionFrequency.set(action, (actionFrequency.get(action) || 0) + 1);
      });
      const topActions = Array.from(actionFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([action]) => action);

      const highPerformanceStrengthFrequency = new Map<string, number>();
      highPerformanceStrengths.forEach((strength) => {
        highPerformanceStrengthFrequency.set(strength, (highPerformanceStrengthFrequency.get(strength) || 0) + 1);
      });
      const topHighPerformanceStrengths = Array.from(highPerformanceStrengthFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([strength]) => strength);

      return {
        topStrengths,
        highPerformanceStrengths: topHighPerformanceStrengths,
        topActions,
        postCount: postSummaries.length,
      };
    } catch (err) {
      console.error("投稿サマリー集計エラー:", err);
      return null;
    }
  }, [postSummaries]);

  if (!insights || insights.postCount === 0) {
  return (
    <div className="bg-white border border-gray-200 p-3 sm:p-4 mb-4">
      <div className="flex items-center mb-4">
        <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-[#FF8A15] mr-2 sm:mr-3" />
        <h2 className="text-base font-semibold text-gray-900">
          今月の投稿別強み・改善・施策まとめ
        </h2>
      </div>
      <div className="bg-white border border-gray-200 p-3 sm:p-4 text-center">
        <p className="text-sm text-gray-600">
          投稿ごとのAI分析結果が生成されると、ここに表示されます。
        </p>
        <p className="text-xs text-gray-500 mt-2">
          投稿詳細ページでAIサマリーを生成すると、このセクションに集計結果が表示されます。
        </p>
      </div>
    </div>
  );
  }

  return (
    <div className="bg-white border-2 border-gray-200 p-4 sm:p-6 mb-4 shadow-sm">
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#ff8a15] flex items-center justify-center mr-3 flex-shrink-0">
          <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            今月の投稿別強み・改善・施策まとめ
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {actualAnalyzedCount}件の投稿から分析
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 今月の強み */}
        {insights.topStrengths.length > 0 && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 p-5 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-green-500 flex items-center justify-center mr-3 flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-bold text-green-900">
                今月の強み
              </h3>
            </div>
            <ul className="space-y-3">
              {insights.topStrengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                    {index + 1}
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed flex-1">
                    {strength}
                  </p>
                </li>
              ))}
            </ul>
            {insights.highPerformanceStrengths.length > 0 && (
              <div className="mt-5 pt-4 border-t-2 border-green-300">
                <div className="flex items-center mb-3">
                  <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center mr-2">
                    <span className="text-white text-xs font-bold">★</span>
                  </div>
                  <p className="text-sm font-bold text-green-900">
                    高パフォーマンス投稿の共通点
                  </p>
                </div>
                <ul className="space-y-2">
                  {insights.highPerformanceStrengths.map((strength, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-green-600 text-lg mt-0.5">→</span>
                      <p className="text-sm text-gray-800 leading-relaxed">{strength}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 今月の施策まとめ */}
        {insights.topActions.length > 0 && (
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 p-5 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-[#ff8a15] flex items-center justify-center mr-3 flex-shrink-0">
                <Lightbulb className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-bold text-orange-900">
                今月の施策まとめ
              </h3>
            </div>
            <ul className="space-y-3">
              {insights.topActions.map((action, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-[#ff8a15] text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                    {index + 1}
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed flex-1">
                    {action}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
