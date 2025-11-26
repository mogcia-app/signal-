"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { MessageCircle, Smile, Frown, Meh, ExternalLink, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "../../../../contexts/auth-context";
import { authFetch } from "../../../../utils/authFetch";
import { getLabEditorHref, getAnalyticsHref } from "../../../../utils/links";

interface FeedbackSentimentProps {
  selectedMonth: string;
}

type SentimentType = "positive" | "negative" | "neutral";

interface FeedbackSentimentComment {
  postId: string;
  title: string;
  comment: string;
  sentiment: SentimentType;
  createdAt?: string;
  postType?: "feed" | "reel" | "story";
}

interface FeedbackPostSentimentEntry {
  postId: string;
  title: string;
  postType?: "feed" | "reel" | "story";
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  score: number;
  lastComment?: string;
  lastCommentAt?: string;
  lastSentiment?: SentimentType;
  status?: "gold" | "negative" | "normal";
}

interface FeedbackSentimentSummary {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  positiveRate: number;
  withCommentCount: number;
  commentHighlights?: {
    positive: FeedbackSentimentComment[];
    negative: FeedbackSentimentComment[];
  };
  posts?: FeedbackPostSentimentEntry[];
}

const sentimentMeta: Record<
  SentimentType,
  { label: string; icon: React.ReactNode; barClass: string; accent: string }
> = {
  positive: {
    label: "ポジティブ",
    icon: <Smile className="w-3.5 h-3.5 text-emerald-500" />,
    barClass: "bg-emerald-500",
    accent: "text-emerald-600",
  },
  negative: {
    label: "ネガティブ",
    icon: <Frown className="w-3.5 h-3.5 text-rose-500" />,
    barClass: "bg-rose-500",
    accent: "text-rose-600",
  },
  neutral: {
    label: "ニュートラル",
    icon: <Meh className="w-3.5 h-3.5 text-slate-500" />,
    barClass: "bg-slate-400",
    accent: "text-slate-600",
  },
};

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return `${Math.round(value * 100)}%`;
}

function CommentList({
  title,
  comments,
}: {
  title: string;
  comments: FeedbackSentimentComment[];
}) {
  if (!comments || comments.length === 0) {
    return null;
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
      <p className="text-xs font-semibold text-gray-600">{title}</p>
      {comments.map((comment) => {
        const labHref = getLabEditorHref(comment.postType || "feed", comment.postId);
        return (
          <div key={`${title}-${comment.postId}-${comment.comment.slice(0, 10)}`}>
            <p className="text-sm font-semibold text-gray-900">{comment.title || "投稿"}</p>
            <p className="text-xs text-gray-600 mt-1 line-clamp-3 whitespace-pre-wrap">
              &quot;{comment.comment || ""}&quot;
            </p>
            <div className="flex items-center gap-2 mt-2">
              {labHref && (
                <Link
                  href={labHref}
                  className="text-xs font-semibold text-gray-700 border border-gray-300 bg-white px-2.5 py-1 rounded hover:bg-gray-100 transition-colors inline-flex items-center gap-1"
                >
                  Labで開く
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
              {comment.createdAt && (
                <span className="text-xs text-gray-400">
                  {new Date(comment.createdAt).toLocaleDateString("ja-JP", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const FeedbackSentiment: React.FC<FeedbackSentimentProps> = ({ selectedMonth }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<FeedbackSentimentSummary | null>(null);

  const fetchFeedbackSentiment = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await authFetch(`/api/analytics/feedback-sentiment?date=${selectedMonth}`);

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSummary(result.data);
        } else {
          setError("データの取得に失敗しました");
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || "データの取得に失敗しました");
      }
    } catch (err) {
      console.error("フィードバック感情トラッキング取得エラー:", err);
      setError("データの取得中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedMonth]);

  // ページ読み込み時に自動的にデータを取得
  useEffect(() => {
    if (user && selectedMonth) {
      fetchFeedbackSentiment();
    }
  }, [user, selectedMonth, fetchFeedbackSentiment]);

  // データがない場合は非表示
  if (!isLoading && !error && (!summary || summary.total === 0)) {
    return null;
  }

  if (!summary) {
    return null;
  }

  const sentimentTotals = [
    { type: "positive" as const, value: summary.positive },
    { type: "negative" as const, value: summary.negative },
    { type: "neutral" as const, value: summary.neutral },
  ].filter((item) => item.value > 0); // 0の場合は表示しない

  const posts = summary.posts ?? [];
  const positiveLeaders = posts.filter((post) => post.score >= 0).slice(0, 3);
  const attentionPosts = posts.filter((post) => post.score < 0).slice(0, 3);

  const renderPostRow = (post: FeedbackPostSentimentEntry) => {
    const labHref = getLabEditorHref(post.postType || "feed", post.postId);
    const analyticsHref = getAnalyticsHref(post.postType || "feed", post.postId);

    return (
      <div
        key={post.postId}
        className="border border-gray-200 rounded-lg p-3 bg-white flex flex-col gap-2"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-gray-900">{post.title || "投稿"}</p>
            <p className="text-xs text-gray-500">
              {post.positive}件ポジ / {post.negative}件ネガ
            </p>
          </div>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
              post.score >= 0
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {post.score >= 0 ? "好感" : "要改善"}
          </span>
        </div>
        {post.lastComment && (
          <p className="text-xs text-gray-600 line-clamp-2 whitespace-pre-wrap">
            &quot;{post.lastComment || ""}&quot;
          </p>
        )}
        <div className="flex items-center gap-2">
          {labHref && (
            <Link
              href={labHref}
              className="text-xs font-semibold text-gray-700 border border-gray-300 bg-white px-2.5 py-1 rounded hover:bg-gray-100 transition-colors inline-flex items-center gap-1"
            >
              Lab
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
          {analyticsHref && (
            <Link
              href={analyticsHref}
              className="text-xs font-semibold text-gray-700 border border-gray-300 bg-white px-2.5 py-1 rounded hover:bg-gray-100 transition-colors inline-flex items-center gap-1"
            >
              分析
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    );
  };

  const commentCoverage = summary.total > 0 ? summary.withCommentCount / summary.total : 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4">
      {/* ヘッダー */}
      <div className="flex items-center mb-4">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0 shadow-sm">
          <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-gray-900">フィードバック感情トラッキング</h2>
          <p className="text-xs text-gray-600 mt-0.5">
            ユーザーの声から好評・不満の傾向を把握し、次の改善テーマにつなげます
          </p>
        </div>
      </div>

      {/* コンテンツ */}
      <div>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600 mr-2" />
            <span className="text-sm text-gray-700">データを読み込み中...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-start">
              <div className="w-4 h-4 text-red-600 mr-2 mt-0.5 flex-shrink-0">⚠️</div>
              <div className="flex-1">
                <p className="text-xs font-medium text-red-800 mb-1.5">{error}</p>
                <button
                  onClick={fetchFeedbackSentiment}
                  className="text-xs text-red-600 hover:text-red-800 underline font-medium"
                >
                  再試行
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 統計サマリー */}
            <div className="grid grid-cols-3 gap-3 text-center mb-4">
              <div>
                <p className="text-xs text-gray-500">フィードバック総数</p>
                <p className="text-base font-semibold text-gray-900">{summary.total.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">ポジティブ比率</p>
                <p className="text-base font-semibold text-emerald-700">
                  {formatPercent(summary.positiveRate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">コメント付き</p>
                <p className="text-base font-semibold text-gray-900">
                  {summary.withCommentCount.toLocaleString()}
                  <span className="text-xs text-gray-500 ml-1">
                    ({formatPercent(commentCoverage)})
                  </span>
                </p>
              </div>
            </div>

            {/* 感情内訳 */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>感情内訳</span>
                <span>100%</span>
              </div>
              <div className="h-3 rounded-full bg-gray-100 overflow-hidden flex">
                {sentimentTotals.map((item) => {
                  const width = summary.total > 0 ? (item.value / summary.total) * 100 : 0;
                  return (
                    <div
                      key={item.type}
                      className={`${sentimentMeta[item.type].barClass} h-full`}
                      style={{ width: `${width}%` }}
                    />
                  );
                })}
              </div>
              <div className={`grid gap-3 ${sentimentTotals.length === 3 ? "grid-cols-3" : sentimentTotals.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
                {sentimentTotals.map((item) => (
                  <div key={`legend-${item.type}`} className="flex items-center gap-2 text-xs">
                    {sentimentMeta[item.type].icon}
                    <span className="font-semibold text-gray-700">{sentimentMeta[item.type].label}</span>
                    <span className={`${sentimentMeta[item.type].accent} font-semibold`}>
                      {formatPercent(summary.total > 0 ? item.value / summary.total : 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* コメントハイライト */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
              <CommentList
                title="好評コメント"
                comments={summary.commentHighlights?.positive ?? []}
              />
              <CommentList
                title="改善リクエスト"
                comments={summary.commentHighlights?.negative ?? []}
              />
            </div>

            {/* 投稿別フィードバック */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Smile className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm font-semibold text-gray-900">好評だった投稿</p>
                </div>
                {positiveLeaders.length === 0 ? (
                  <p className="text-xs text-gray-400 border border-gray-200 rounded-lg p-3">
                    ポジティブなフィードバックはまだありません。
                  </p>
                ) : (
                  <div className="space-y-3">{positiveLeaders.map(renderPostRow)}</div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <p className="text-sm font-semibold text-gray-900">改善が必要な投稿</p>
                </div>
                {attentionPosts.length === 0 ? (
                  <p className="text-xs text-gray-400 border border-gray-200 rounded-lg p-3">
                    改善が必要なフィードバックはまだありません。
                  </p>
                ) : (
                  <div className="space-y-3">{attentionPosts.map(renderPostRow)}</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

