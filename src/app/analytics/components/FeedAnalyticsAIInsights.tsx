"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCcw, Sparkles } from "lucide-react";

import { useAuth } from "../../../contexts/auth-context";
import type { AnalyticsData, CommentThread } from "../../instagram/components/types";
import { authFetch } from "../../../utils/authFetch";

interface FeedAnalyticsAIInsightsProps {
  analyticsData: AnalyticsData[];
  isLoading: boolean;
  targetCategory?: string;
  title?: string;
  description?: string;
  emptyMessage?: string;
}

interface AiInsightResult {
  summary: string;
  insights: string[];
  recommendedActions: string[];
}

interface MasterContextSummary {
  learningPhase?: string | null;
  ragHitRate?: number | null;
  totalInteractions?: number | null;
  feedbackStats?: Record<string, unknown> | null;
  actionStats?: Record<string, unknown> | null;
  pdcaMetrics?: Record<string, unknown> | null;
  personalizedInsights?: Array<Record<string, unknown>> | null;
  recommendations?: Array<Record<string, unknown>> | null;
  postPatterns?: {
    summaries: Record<string, unknown>;
    topHashtags: Record<string, number>;
    signals: Array<{
      postId: string;
      title: string;
      tag?: string;
      kpiScore?: number;
      sentimentLabel?: string;
      sentimentScore?: number;
      engagementRate?: number;
      reach?: number;
      followerIncrease?: number;
      hashtags?: string[];
    }>;
  } | null;
  timeline?: Array<Record<string, unknown>> | null;
  weeklyTimeline?: Array<Record<string, unknown>> | null;
  achievements?: Array<Record<string, unknown>> | null;
}

interface AggregatedMetrics {
  totals: Record<string, number>;
  averages: {
    engagementRate: number;
    reachFollowerPercent: number;
    interactionFollowerPercent: number;
  };
  commentThreads: Array<CommentThread & { relatedPostTitle?: string }>;
  recentPosts: Array<{
    postId?: string;
    title: string;
    content: string;
    hashtags: string[];
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    reach: number;
    engagementRate: number;
    publishedAt: string;
    publishedTime: string;
    weekday: string;
  }>;
  feedbackEntries: Array<{
    sentiment: "satisfied" | "dissatisfied";
    sentimentLabel: string;
    memo: string;
    relatedPostTitle: string;
    publishedAt: string;
    publishedTime: string;
    weekday: string;
  }>;
  feedbackStats: {
    total: number;
    satisfied: number;
    dissatisfied: number;
  };
  postCount: number;
  masterContext: MasterContextSummary | null;
  targetCategory: string;
}

const transformMasterContext = (data: Record<string, unknown> | null | undefined): MasterContextSummary | null => {
  if (!data) {
    return null;
  }

  const postPatterns = (data.postPatterns as Record<string, unknown> | undefined) ?? null;
  const signalsRaw = (postPatterns?.signals as Array<Record<string, unknown>> | undefined) ?? [];
  const signals = Array.isArray(signalsRaw)
    ? signalsRaw.slice(0, 12).map((signal) => ({
        postId: typeof signal.postId === "string" ? signal.postId : "",
        title: typeof signal.title === "string" ? signal.title : "",
        tag: typeof signal.tag === "string" ? signal.tag : undefined,
        kpiScore:
          typeof signal.kpiScore === "number"
            ? signal.kpiScore
            : Number.isFinite(Number(signal.kpiScore))
              ? Number(signal.kpiScore)
              : undefined,
        sentimentLabel: typeof signal.sentimentLabel === "string" ? signal.sentimentLabel : undefined,
        sentimentScore:
          typeof signal.sentimentScore === "number"
            ? signal.sentimentScore
            : Number.isFinite(Number(signal.sentimentScore))
              ? Number(signal.sentimentScore)
              : undefined,
        engagementRate:
          typeof signal.engagementRate === "number"
            ? signal.engagementRate
            : Number.isFinite(Number(signal.engagementRate))
              ? Number(signal.engagementRate)
              : undefined,
        reach:
          typeof signal.reach === "number"
            ? signal.reach
            : Number.isFinite(Number(signal.reach))
              ? Number(signal.reach)
              : undefined,
        followerIncrease:
          typeof signal.followerIncrease === "number"
            ? signal.followerIncrease
            : Number.isFinite(Number(signal.followerIncrease))
              ? Number(signal.followerIncrease)
              : undefined,
        hashtags: Array.isArray(signal.hashtags) ? (signal.hashtags as string[]) : [],
      }))
    : [];

  return {
    learningPhase: (data.learningPhase as string) ?? null,
    ragHitRate:
      typeof data.ragHitRate === "number"
        ? data.ragHitRate
        : Number.isFinite(Number(data.ragHitRate))
          ? Number(data.ragHitRate)
          : null,
    totalInteractions:
      typeof data.totalInteractions === "number"
        ? data.totalInteractions
        : Number.isFinite(Number(data.totalInteractions))
          ? Number(data.totalInteractions)
          : null,
    feedbackStats: (data.feedbackStats as Record<string, unknown>) ?? null,
    actionStats: (data.actionStats as Record<string, unknown>) ?? null,
    pdcaMetrics: (data.pdcaMetrics as Record<string, unknown>) ?? null,
    personalizedInsights: (data.personalizedInsights as Array<Record<string, unknown>>) ?? null,
    recommendations: (data.recommendations as Array<Record<string, unknown>>) ?? null,
    postPatterns: postPatterns
      ? {
          summaries: (postPatterns.summaries as Record<string, unknown>) ?? {},
          topHashtags: (postPatterns.topHashtags as Record<string, number>) ?? {},
          signals,
        }
      : null,
    timeline: Array.isArray(data.timeline)
      ? (data.timeline as Array<Record<string, unknown>>).slice(0, 12)
      : null,
    weeklyTimeline: Array.isArray(data.weeklyTimeline)
      ? (data.weeklyTimeline as Array<Record<string, unknown>>).slice(0, 12)
      : null,
    achievements: Array.isArray(data.achievements)
      ? (data.achievements as Array<Record<string, unknown>>)
      : null,
  };
};

const FeedAnalyticsAIInsights: React.FC<FeedAnalyticsAIInsightsProps> = ({
  analyticsData,
  isLoading,
  targetCategory = "feed",
  title = "AI分析（投稿まとめ）",
  description = "入力済みの分析データとコメントログをもとに、投稿の傾向と改善ポイントをAIが抽出します。",
  emptyMessage = "投稿の分析データがまだありません。データを保存するとAI分析が利用できます。",
}) => {
  const { user } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiInsightResult | null>(null);
  const [masterContext, setMasterContext] = useState<MasterContextSummary | null>(null);
  const [isContextLoading, setIsContextLoading] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setMasterContext(null);
      return;
    }

    let isCancelled = false;

    const fetchMasterContext = async () => {
      setIsContextLoading(true);
      try {
        const response = await authFetch(`/api/ai/master-context?userId=${user.uid}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "マスターコンテキストの取得に失敗しました");
        }

        const data = await response.json();
        if (!isCancelled) {
          const contextSummary = transformMasterContext(data.data);
          setMasterContext(contextSummary);
        }
      } catch (contextError) {
        console.error("MasterContext fetch error:", contextError);
        if (!isCancelled) {
          setMasterContext(null);
        }
      } finally {
        if (!isCancelled) {
          setIsContextLoading(false);
        }
      }
    };

    fetchMasterContext();

    return () => {
      isCancelled = true;
    };
  }, [user?.uid]);

  const filteredData = useMemo(
    () =>
      analyticsData.filter((item) =>
        targetCategory ? (item.category ?? targetCategory) === targetCategory : true,
      ),
    [analyticsData, targetCategory],
  );

  const aggregatedMetrics = useMemo<AggregatedMetrics | null>(() => {
    if (filteredData.length === 0) {
      return null;
    }

    const total = (key: keyof AnalyticsData) =>
      filteredData.reduce((sum, item) => {
        const value = item[key];
        return sum + (typeof value === "number" ? value : 0);
      }, 0);

    const totals = {
      likes: total("likes"),
      comments: total("comments"),
      shares: total("shares"),
      saves: total("saves"),
      reach: total("reach"),
      followerIncrease: total("followerIncrease"),
      profileVisits: total("profileVisits"),
      profileFollows: total("profileFollows"),
    };

    const averages = {
      engagementRate: filteredData.length
        ? filteredData.reduce((sum, item) => sum + (item.engagementRate || 0), 0) /
          filteredData.length
        : 0,
      reachFollowerPercent: filteredData.length
        ? filteredData.reduce((sum, item) => sum + (item.reachFollowerPercent || 0), 0) /
          filteredData.length
        : 0,
      interactionFollowerPercent: filteredData.length
        ? filteredData.reduce((sum, item) => sum + (item.interactionFollowerPercent || 0), 0) /
          filteredData.length
        : 0,
    };

    const commentThreads: Array<CommentThread & { relatedPostTitle?: string }> = [];
    filteredData.forEach((post) => {
      (post.commentThreads ?? []).forEach((thread) => {
        commentThreads.push({
          comment: thread.comment,
          reply: thread.reply,
          relatedPostTitle: post.title ?? "",
        });
      });
    });

    const feedbackEntries = filteredData
      .filter((post) => post.sentiment && (post.sentimentMemo?.trim()?.length ?? 0) > 0)
      .map((post) => {
        const publishedDate =
          post.publishedAt instanceof Date ? post.publishedAt.toISOString().split("T")[0] : "";
        const weekday =
          post.publishedAt instanceof Date
            ? post.publishedAt.toLocaleDateString("ja-JP", { weekday: "long" })
            : "";
        return {
          sentiment: post.sentiment as "satisfied" | "dissatisfied",
          sentimentLabel: post.sentiment === "satisfied" ? "満足" : "改善したい",
          memo: post.sentimentMemo?.trim() ?? "",
          relatedPostTitle: post.title ?? "",
          publishedAt: publishedDate,
          publishedTime: post.publishedTime ?? "",
          weekday,
        };
      });

    const feedbackStats = {
      total: feedbackEntries.length,
      satisfied: feedbackEntries.filter((entry) => entry.sentiment === "satisfied").length,
      dissatisfied: feedbackEntries.filter((entry) => entry.sentiment === "dissatisfied").length,
    };

    const recentPosts = filteredData
      .slice()
      .sort((a, b) => {
        const aTime = a.publishedAt instanceof Date ? a.publishedAt.getTime() : 0;
        const bTime = b.publishedAt instanceof Date ? b.publishedAt.getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5)
      .map((item) => ({
        postId: item.postId ?? undefined,
        title: item.title ?? "無題の投稿",
        content: item.content ?? "",
        hashtags: item.hashtags ?? [],
        likes: item.likes,
        comments: item.comments,
        shares: item.shares,
        saves: item.saves,
        reach: item.reach,
        engagementRate: item.engagementRate,
        publishedAt:
          item.publishedAt instanceof Date ? item.publishedAt.toISOString().split("T")[0] : "不明",
        publishedTime: item.publishedTime ?? "",
        weekday:
          item.publishedAt instanceof Date
            ? item.publishedAt.toLocaleDateString("ja-JP", { weekday: "long" })
            : "不明",
      }));

    return {
      totals,
      averages,
      commentThreads,
      recentPosts,
      feedbackEntries,
      feedbackStats,
      postCount: filteredData.length,
      masterContext,
      targetCategory,
    };
  }, [filteredData, masterContext, targetCategory]);

  const handleRunAnalysis = async () => {
    if (!user?.uid || !aggregatedMetrics) {
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const { masterContext: contextSummary, targetCategory: category, ...metricsPayload } =
        aggregatedMetrics;

      const response = await fetch("/api/analytics/ai-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          metrics: metricsPayload,
          masterContext: contextSummary,
          targetCategory: category,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `AI分析に失敗しました (${response.status})`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "AI分析に失敗しました");
      }

      setResult(data.data);
    } catch (aiError) {
      console.error("AI分析エラー (feed analytics):", aiError);
      setError(aiError instanceof Error ? aiError.message : "AI分析に失敗しました");
      setResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-white shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#ff8a15]" />
          {title}
        </h3>
        <button
          type="button"
          onClick={handleRunAnalysis}
          disabled={isLoading || isAnalyzing || !aggregatedMetrics || isContextLoading}
          className={`inline-flex items-center px-3 py-2 text-sm font-semibold text-white rounded-none transition-colors ${
            isLoading || isAnalyzing || !aggregatedMetrics || isContextLoading
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-[#ff8a15] hover:bg-[#e67a0f]"
          }`}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              分析中...
            </>
          ) : (
            <>
              <RefreshCcw className="w-4 h-4 mr-2" />
              AI分析を実行
            </>
          )}
        </button>
      </div>
      <p className="text-xs text-gray-600 mb-4">{description}</p>

      {!aggregatedMetrics ? (
        <div className="border border-dashed border-gray-300 bg-gray-50 p-4 text-xs text-gray-600">
          {emptyMessage}
        </div>
      ) : error ? (
        <div className="border border-red-200 bg-red-50 p-4 text-xs text-red-600">{error}</div>
      ) : result ? (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">AIサマリー</h4>
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{result.summary}</p>
          </div>

          {result.insights.length ? (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">注目ポイント</h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {result.insights.map((insight, index) => (
                  <li key={`insight-${index}`}>{insight}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.recommendedActions.length ? (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">次のアクション提案</h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {result.recommendedActions.map((action, index) => (
                  <li key={`action-${index}`}>{action}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="border border-dashed border-gray-300 bg-gray-50 p-4 text-xs text-gray-600">
          AI分析結果はここに表示されます。右上の「AI分析を実行」を押して下さい。
        </div>
      )}
    </div>
  );
};

export default FeedAnalyticsAIInsights;

