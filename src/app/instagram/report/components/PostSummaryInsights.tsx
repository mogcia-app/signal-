"use client";

import React from "react";
import { FileText, TrendingUp, AlertCircle, Lightbulb } from "lucide-react";
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
  selectedMonth,
  reportData,
}) => {
  // reportDataから投稿サマリーを取得して集計（useMemoでメモ化）
  const postSummaries: PostSummaryData[] = React.useMemo(() => {
    return reportData?.postSummaries || [];
  }, [reportData?.postSummaries]);

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
    <div className="bg-white border border-gray-200 p-3 sm:p-4 mb-4">
      <div className="flex items-center mb-4">
        <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-[#FF8A15] mr-2 sm:mr-3" />
        <h2 className="text-base font-semibold text-gray-900">
          今月の投稿別強み・改善・施策まとめ
        </h2>
      </div>

      <div className="space-y-4">
        {/* 今月の強み */}
        {insights.topStrengths.length > 0 && (
          <div className="border-l-4 border-green-500 pl-3 sm:pl-4">
            <div className="flex items-center mb-2">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mr-2" />
              <h3 className="text-sm font-semibold text-gray-800">
                今月の強み
              </h3>
            </div>
            <ul className="space-y-1.5 text-xs text-gray-700">
              {insights.topStrengths.map((strength, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-green-600 mr-2">•</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
            {insights.highPerformanceStrengths.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-1.5">
                  高パフォーマンス投稿の共通点:
                </p>
                <ul className="space-y-1 text-xs text-gray-700">
                  {insights.highPerformanceStrengths.map((strength, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-600 mr-2">→</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 今月の施策まとめ */}
        {insights.topActions.length > 0 && (
          <div className="border-l-4 border-orange-500 pl-3 sm:pl-4">
            <div className="flex items-center mb-2">
              <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 mr-2" />
              <h3 className="text-sm font-semibold text-gray-800">
                今月の施策まとめ
              </h3>
            </div>
            <ul className="space-y-1.5 text-xs text-gray-700">
              {insights.topActions.map((action, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-orange-600 mr-2">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
          {insights.postCount}件の投稿から分析
        </div>
      </div>
    </div>
  );
};

