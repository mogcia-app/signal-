"use client";

import React, { useState, useEffect } from "react";
import { FileText, TrendingUp, AlertCircle, Lightbulb, Loader2 } from "lucide-react";
import { useAuth } from "../../../../contexts/auth-context";
import { authFetch } from "../../../../utils/authFetch";

interface PostSummaryInsightsProps {
  selectedMonth: string;
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
}) => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<AggregatedInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      if (!user?.uid) return;

      setLoading(true);
      setError(null);

      try {
        // 月の範囲を計算
        const [yearStr, monthStr] = selectedMonth.split("-").map(Number);
        const start = new Date(yearStr, monthStr - 1, 1);
        const end = new Date(yearStr, monthStr, 0, 23, 59, 59);

        // 投稿一覧を取得
        const postsResponse = await authFetch(
          `/api/posts?userId=${user.uid}`
        );
        if (!postsResponse.ok) {
          throw new Error("投稿データの取得に失敗しました");
        }
        const postsResult = await postsResponse.json();
        const posts = postsResult.posts || [];

        // 選択された月の投稿IDを抽出（scheduledDateまたはcreatedAtで判定）
        const postIdsInMonth = new Set<string>();
        posts.forEach((post: any) => {
          let dateToCheck: Date | null = null;
          
          // scheduledDateがある場合はそれを使用
          if (post.scheduledDate) {
            dateToCheck = new Date(post.scheduledDate);
          } 
          // createdAtがある場合はそれを使用
          else if (post.createdAt) {
            dateToCheck = post.createdAt instanceof Date
              ? post.createdAt
              : new Date(post.createdAt);
          }
          
          if (dateToCheck && dateToCheck >= start && dateToCheck <= end) {
            postIdsInMonth.add(post.id);
          }
        });

        console.log("選択月の投稿ID:", Array.from(postIdsInMonth));
        console.log("投稿ID数:", postIdsInMonth.size);

        if (postIdsInMonth.size === 0) {
          setInsights(null);
          setLoading(false);
          return;
        }

        // analyticsデータも取得（リーチ数の取得用）
        const analyticsResponse = await authFetch(
          `/api/analytics?userId=${user.uid}`
        );
        const analytics = analyticsResponse.ok
          ? (await analyticsResponse.json()).analytics || (await analyticsResponse.json()).data || []
          : [];

        // 各投稿のAIサマリーを取得
        const summaryPromises = Array.from(postIdsInMonth).map(async (postId) => {
          try {
            const response = await authFetch(
              `/api/ai/post-summaries?userId=${user.uid}&postId=${postId}`
            );
            if (!response.ok) {
              console.log(`AIサマリー取得失敗 (postId: ${postId}):`, response.status);
              return null;
            }
            const result = await response.json();
            if (!result.success || !result.data) {
              console.log(`AIサマリーデータなし (postId: ${postId}):`, result);
              return null;
            }

            const summaryData = result.data;
            const analyticsItem = Array.isArray(analytics) 
              ? analytics.find((a: any) => a.postId === postId)
              : undefined;
            console.log(`AIサマリー取得成功 (postId: ${postId}):`, {
              hasSummary: !!summaryData.summary,
              strengthsCount: Array.isArray(summaryData.insights) ? summaryData.insights.length : 0,
              actionsCount: Array.isArray(summaryData.recommendedActions) ? summaryData.recommendedActions.length : 0,
            });
            
            return {
              postId,
              summary: summaryData.summary || "",
              strengths: Array.isArray(summaryData.insights) ? summaryData.insights : [],
              improvements: [],
              recommendedActions: Array.isArray(summaryData.recommendedActions)
                ? summaryData.recommendedActions
                : [],
              reach: analyticsItem?.reach || 0,
            } as PostSummaryData;
          } catch (err) {
            console.error(`Post summary fetch error for ${postId}:`, err);
            return null;
          }
        });

        const summaries = (await Promise.all(summaryPromises)).filter(
          (s): s is PostSummaryData => s !== null
        );

        console.log("取得できたAIサマリー数:", summaries.length);

        if (summaries.length === 0) {
          setInsights(null);
          setLoading(false);
          return;
        }

        // 集計処理
        const allStrengths: string[] = [];
        const allRecommendedActions: string[] = [];
        const highPerformanceStrengths: string[] = [];

        // リーチ数でソートして、上位30%を高パフォーマンス投稿として判定
        const sortedByReach = [...summaries].sort((a, b) => b.reach - a.reach);
        const top30Percent = Math.ceil(sortedByReach.length * 0.3);

        summaries.forEach((summary) => {
          allStrengths.push(...summary.strengths);
          allRecommendedActions.push(...summary.recommendedActions);

          const isHighPerformance = sortedByReach
            .slice(0, top30Percent)
            .some((p) => p.postId === summary.postId);
          if (isHighPerformance) {
            highPerformanceStrengths.push(...summary.strengths);
          }
        });

        // 頻出する強み・推奨アクションを抽出
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
          highPerformanceStrengthFrequency.set(
            strength,
            (highPerformanceStrengthFrequency.get(strength) || 0) + 1
          );
        });
        const topHighPerformanceStrengths = Array.from(
          highPerformanceStrengthFrequency.entries()
        )
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([strength]) => strength);

        setInsights({
          topStrengths,
          highPerformanceStrengths: topHighPerformanceStrengths,
          topActions,
          postCount: summaries.length,
        });
      } catch (err) {
        console.error("投稿サマリー集計エラー:", err);
        setError(err instanceof Error ? err.message : "データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [user?.uid, selectedMonth]);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-2" />
          <span className="text-sm text-gray-500">投稿分析結果を読み込み中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
        <div className="flex items-center text-red-600">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!insights || insights.postCount === 0) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm mb-4">
      <div className="flex items-center mb-4">
        <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-[#FF8A15] mr-2 sm:mr-3" />
        <h2 className="text-base font-semibold text-gray-900">
          今月の投稿別強み・改善・施策まとめ
        </h2>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 text-center">
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
    <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm mb-4">
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

