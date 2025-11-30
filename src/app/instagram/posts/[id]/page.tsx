"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../../contexts/auth-context";
import SNSLayout from "../../../../components/sns-layout";
import { authFetch } from "../../../../utils/authFetch";
import {
  Calendar,
  Clock,
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Share,
  Eye as EyeIcon,
  ArrowLeft,
  Save,
  BarChart3,
  RefreshCw,
  TrendingUp,
  Users,
  Tag,
} from "lucide-react";

interface PostData {
  id: string;
  userId: string;
  title: string;
  content: string;
  postType: "feed" | "reel" | "story";
  scheduledDate: string;
  scheduledTime: string;
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
  hashtags?: string[];
  analytics?: {
    likes?: number;
    comments?: number;
    shares?: number;
    reach?: number;
    engagementRate?: number;
    publishedAt?: Date;
  };
}

interface PostInsight {
  summary: string;
  strengths: string[];
  improvements: string[];
  nextActions: string[];
}

interface CommentThread {
  comment: string;
  reply: string;
}

interface PostAnalyticsRecord {
  id: string;
  postId?: string;
  category?: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  followerIncrease?: number;
  publishedAt?: Date | null;
  publishedTime?: string;
  reachFollowerPercent?: number;
  interactionCount?: number;
  interactionFollowerPercent?: number;
  commentThreads?: CommentThread[];
  sentiment?: "satisfied" | "dissatisfied" | null;
  sentimentMemo?: string;
  createdAt?: Date | null;
}

interface SavedPostSummary {
  summary: string;
  insights: string[];
  recommendedActions: string[];
  category: string;
  generatedAt?: string;
  postTitle?: string;
}
interface PatternSignal {
  postId: string;
  title: string;
  category: string;
  hashtags: string[];
  metrics: {
    reach: number;
    saves: number;
    likes: number;
    comments: number;
    shares: number;
    savesRate: number;
    commentsRate: number;
    likesRate: number;
    reachToFollowerRatio: number;
    velocityScore: number;
    totalEngagement: number;
    earlyEngagement: number | null;
    watchTimeSeconds: number | null;
    linkClicks: number | null;
    impressions: number | null;
  };
  comparisons: {
    reachDiff: number;
    engagementRateDiff: number;
    savesRateDiff: number;
    commentsRateDiff: number;
    clusterPerformanceDiff: number;
  };
  significance: {
    reach: "higher" | "lower" | "neutral";
    engagement: "higher" | "lower" | "neutral";
    savesRate: "higher" | "lower" | "neutral";
    commentsRate: "higher" | "lower" | "neutral";
  };
  cluster: {
    id: string;
    label: string;
    centroidDistance: number;
    baselinePerformance: number;
    similarPosts: Array<{
      postId: string;
      title: string;
      performanceScore: number;
      publishedAt: string | null;
    }>;
  };
  engagementRate: number;
  reach: number;
  followerIncrease: number;
  kpiScore: number;
  sentimentScore: number;
  sentimentLabel: "positive" | "negative" | "neutral";
  tag: "gold" | "gray" | "red" | "neutral";
  feedbackCounts: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

const significanceColorMap: Record<"higher" | "lower" | "neutral", string> = {
  higher: "text-emerald-600",
  lower: "text-red-600",
  neutral: "text-slate-600",
};

const significanceLabelMap: Record<"higher" | "lower" | "neutral", string> = {
  higher: "高い",
  lower: "低い",
  neutral: "同程度",
};

export default function PostDetailPage() {
  const { id } = useParams();
  const postId =
    typeof id === "string" ? id : Array.isArray(id) ? id[0] : "";
  const router = useRouter();
  const { user } = useAuth();
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deepDiveSignal, setDeepDiveSignal] = useState<PatternSignal | null>(null);
  const [isDeepDiveLoading, setIsDeepDiveLoading] = useState(false);
  const [deepDiveError, setDeepDiveError] = useState<string | null>(null);
  const [postInsight, setPostInsight] = useState<PostInsight | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [savedSummary, setSavedSummary] = useState<SavedPostSummary | null>(null);
  const [savedSummaryError, setSavedSummaryError] = useState<string | null>(null);
  const [postAnalytics, setPostAnalytics] = useState<PostAnalyticsRecord | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [summaryTab, setSummaryTab] = useState<"saved" | "latest">("saved");
  const [resettingAnalytics, setResettingAnalytics] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [autoGenerateScheduled, setAutoGenerateScheduled] = useState(false);

  const handleGenerateInsight = useCallback(async () => {
    if (!user?.uid || !postId) {
      return;
    }
    setInsightError(null);
    setIsGeneratingInsight(true);
    try {
      const response = await authFetch("/api/ai/post-insight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
          postId: String(postId),
        }),
      });

      if (!response.ok) {
        throw new Error(`投稿AIサマリーAPIエラー: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "投稿AIサマリーの生成に失敗しました");
      }

      const insightData = result.data;
      setPostInsight(insightData);

      // 生成したサマリーを保存
      try {
        const saveResponse = await authFetch("/api/ai/post-summaries", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.uid,
            postId: String(postId),
            summary: insightData.summary,
            insights: insightData.strengths || [],
            recommendedActions: insightData.nextActions || [],
            category: post?.postType || "feed",
            postTitle: post?.title || "",
            postHashtags: post?.hashtags || [],
            postPublishedAt: postAnalytics?.publishedAt?.toISOString() || null,
          }),
        });

        if (saveResponse.ok) {
          const saveResult = await saveResponse.json();
          if (saveResult.success) {
            // 保存成功時はsavedSummaryも更新
            setSavedSummary({
              summary: insightData.summary,
              insights: insightData.strengths || [],
              recommendedActions: insightData.nextActions || [],
              category: post?.postType || "feed",
              generatedAt: new Date().toISOString(),
              postTitle: post?.title || "",
            });
          }
        }
      } catch (saveErr) {
        console.error("AIサマリー保存エラー:", saveErr);
        // 保存に失敗しても生成は成功しているので続行
      }
    } catch (err) {
      console.error("投稿AIサマリー生成エラー:", err);
      setInsightError(err instanceof Error ? err.message : "投稿AIサマリーの生成に失敗しました");
    } finally {
      setIsGeneratingInsight(false);
    }
  }, [user?.uid, postId, post, postAnalytics]);

  // 分析データ保存後、一定時間経過したら自動でAIサマリーを生成
  useEffect(() => {
    if (!user?.uid || !postId || !postAnalytics || postInsight || savedSummary || autoGenerateScheduled) {
      return;
    }

    // 分析データの作成日時を取得
    const analyticsCreatedAt = postAnalytics.createdAt;
    if (!analyticsCreatedAt) {
      return;
    }

    const createdAt = analyticsCreatedAt instanceof Date 
      ? analyticsCreatedAt 
      : new Date(analyticsCreatedAt);
    
    const now = new Date();
    const timeSinceCreation = now.getTime() - createdAt.getTime();
    const minutesSinceCreation = timeSinceCreation / (1000 * 60);

    // 分析データ保存後5分経過している場合、自動生成
    const AUTO_GENERATE_DELAY_MINUTES = 5;
    
    if (minutesSinceCreation >= AUTO_GENERATE_DELAY_MINUTES) {
      // すぐに生成
      setAutoGenerateScheduled(true);
      handleGenerateInsight();
    } else {
      // 残り時間を計算してタイマーを設定
      const remainingMinutes = AUTO_GENERATE_DELAY_MINUTES - minutesSinceCreation;
      const remainingMs = remainingMinutes * 60 * 1000;
      
      setAutoGenerateScheduled(true);
      const timer = setTimeout(() => {
        handleGenerateInsight();
      }, remainingMs);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [postAnalytics, postInsight, savedSummary, user?.uid, postId, autoGenerateScheduled, handleGenerateInsight]);

  useEffect(() => {
    const fetchPost = async () => {
      if (!user?.uid || !postId) {
        return;
      }

      try {
        const response = await fetch(`/api/posts?userId=${user.uid}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        const foundPost = result.posts.find((p: PostData) => p.id === postId);

        if (foundPost) {
          setPost(foundPost);
        } else {
          setError("投稿が見つかりません");
        }
      } catch (err) {
        console.error("投稿取得エラー:", err);
        setError("投稿の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [user?.uid, postId]);

  useEffect(() => {
    if (!user?.uid || !postId) {
      return;
    }

    let isCancelled = false;
    const fetchDeepDive = async () => {
      setIsDeepDiveLoading(true);
      setDeepDiveError(null);
      setInsightError(null);
      try {
        const params = new URLSearchParams({ userId: user.uid });
        const response = await authFetch(`/api/ai/master-context?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`Master context API error: ${response.status}`);
        }

        const json = await response.json();
        if (!json.success) {
          throw new Error(json.error || "マスターコンテキストの取得に失敗しました");
        }

        if (isCancelled) {
          return;
        }

        const signals: PatternSignal[] = json.data?.postPatterns?.signals ?? [];
        const matchedSignal = signals.find((signal) => signal.postId === postId) ?? null;
        setDeepDiveSignal(matchedSignal);
        setPostInsight(json.data?.postInsights?.[postId ?? ""] ?? null);

        if (!matchedSignal) {
          setDeepDiveError("この投稿の深掘りデータはまだ生成されていません。フィードバックや分析データが蓄積されると表示されます。");
        }
      } catch (err) {
        console.error("投稿ディープダイブ取得エラー:", err);
        if (!isCancelled) {
          setDeepDiveError(
            err instanceof Error ? err.message : "ディープダイブデータの取得に失敗しました"
          );
        }
      } finally {
        if (!isCancelled) {
          setIsDeepDiveLoading(false);
        }
      }
    };

    fetchDeepDive();
    return () => {
      isCancelled = true;
    };
  }, [user?.uid, postId]);

  useEffect(() => {
    const fetchSavedSummary = async () => {
      if (!user?.uid || !postId) {
        return;
      }

      setSavedSummaryError(null);
      try {
        const params = new URLSearchParams({
          userId: user.uid,
          postId: String(postId),
        });
        const response = await authFetch(`/api/ai/post-summaries?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`AIサマリー取得エラー: ${response.status}`);
        }
        const json = await response.json();
        if (json.success) {
          setSavedSummary(json.data ?? null);
        } else {
          throw new Error(json.error || "AIサマリーの取得に失敗しました");
        }
      } catch (fetchError) {
        console.error("保存済みAIサマリー取得エラー:", fetchError);
        setSavedSummaryError(
          fetchError instanceof Error ? fetchError.message : "AIサマリーの取得に失敗しました",
        );
      }
    };

        fetchSavedSummary();
  }, [user?.uid, postId]);

  useEffect(() => {
    if (savedSummary) {
      setSummaryTab("saved");
      // 保存されたサマリーがある場合、postInsightも設定（リロード時に復元）
      if (!postInsight) {
        setPostInsight({
          summary: savedSummary.summary,
          strengths: savedSummary.insights || [],
          improvements: [],
          nextActions: savedSummary.recommendedActions || [],
        });
      }
    } else if (postInsight) {
      setSummaryTab("latest");
    }
  }, [savedSummary, postInsight]);

  useEffect(() => {
    const fetchPostAnalytics = async () => {
      if (!user?.uid || !postId) {
        return;
      }
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      try {
        const response = await authFetch(`/api/analytics/simple?userId=${user.uid}`);
        if (!response.ok) {
          throw new Error(`Analytics fetch error: ${response.status}`);
        }
        const json = await response.json();
        if (!json.success || !Array.isArray(json.data)) {
          throw new Error("投稿分析データの取得に失敗しました");
        }
        const matched = json.data.find((item: { postId?: string }) => item.postId === postId);
        if (matched) {
          const record: PostAnalyticsRecord = {
            id: matched.id ?? "",
            postId: matched.postId ?? "",
            category: matched.category ?? undefined,
            likes: matched.likes ?? 0,
            comments: matched.comments ?? 0,
            shares: matched.shares ?? 0,
            saves: matched.saves ?? 0,
            reach: matched.reach ?? 0,
            followerIncrease: matched.followerIncrease ?? 0,
            publishedAt: matched.publishedAt ? new Date(matched.publishedAt) : null,
            publishedTime: matched.publishedTime ?? "",
            reachFollowerPercent: matched.reachFollowerPercent ?? undefined,
            interactionCount: matched.interactionCount ?? undefined,
            interactionFollowerPercent: matched.interactionFollowerPercent ?? undefined,
            commentThreads: Array.isArray(matched.commentThreads) ? matched.commentThreads : [],
            sentiment: matched.sentiment ?? null,
            sentimentMemo: matched.sentimentMemo ?? "",
            createdAt: matched.createdAt ? new Date(matched.createdAt) : null,
          };
          setPostAnalytics(record);
        } else {
          setPostAnalytics(null);
        }
      } catch (err) {
        console.error("投稿分析データ取得エラー:", err);
        setAnalyticsError(err instanceof Error ? err.message : "投稿分析データの取得に失敗しました");
        setPostAnalytics(null);
      } finally {
        setAnalyticsLoading(false);
      }
    };
    fetchPostAnalytics();
  }, [user?.uid, postId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  // 投稿文からハッシュタグを抽出する関数
  const extractHashtagsFromContent = (content: string): string[] => {
    const hashtagRegex = /#[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g;
    const matches = content.match(hashtagRegex);
    return matches ? matches.map((tag) => tag.substring(1)) : []; // #を除去
  };

  // 投稿文からハッシュタグを除去する関数
  const removeHashtagsFromContent = (content: string): string => {
    const hashtagRegex = /#[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g;
    return content.replace(hashtagRegex, "").trim();
  };

  const handleResetAnalytics = async () => {
    if (!user?.uid || !postId) {
      return;
    }

    if (
      !window.confirm(
        "この投稿に紐付く分析データをすべて削除します。よろしいですか？",
      )
    ) {
      return;
    }

    setResettingAnalytics(true);
    setResetError(null);

    try {
      const params = new URLSearchParams({ postId });
      const response = await authFetch(`/api/analytics/by-post?${params.toString()}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(errorText || `Analytics reset failed with status ${response.status}`);
      }

      await response.json();

      setPostAnalytics(null);
      setPostInsight(null);
      setSavedSummary(null);
      setSummaryTab("saved");
    } catch (error) {
      console.error("Analytics reset error:", error);
      setResetError(
        error instanceof Error
          ? error.message
          : "分析データのリセットに失敗しました。",
      );
    } finally {
      setResettingAnalytics(false);
    }
  };

  const renderSignificanceBadge = (
    label: string,
    value: number,
    significance: "higher" | "lower" | "neutral"
  ) => (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-600">{label}</span>
      <span className={`font-semibold ${significanceColorMap[significance]}`}>
        {value > 0 ? "+" : ""}
        {Math.round(value * 100)}%
        <span className="ml-1 text-[10px] font-normal">{significanceLabelMap[significance]}</span>
      </span>
    </div>
  );

  if (loading) {
    return (
      <SNSLayout customTitle="投稿詳細" customDescription="投稿の詳細情報を表示">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">読み込み中...</p>
          </div>
        </div>
      </SNSLayout>
    );
  }

  if (error || !post) {
    return (
      <SNSLayout customTitle="投稿詳細" customDescription="投稿の詳細情報を表示">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">エラー</h1>
            <p className="text-gray-600 mb-6">{error || "投稿が見つかりません"}</p>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              戻る
            </button>
          </div>
        </div>
      </SNSLayout>
    );
  }

  return (
    <SNSLayout customTitle="投稿詳細" customDescription="投稿の詳細情報を表示">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
              >
                <ArrowLeft size={20} className="mr-2" />
                投稿一覧に戻る
              </button>
              <h1 className="text-2xl font-bold text-gray-900">投稿詳細</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleResetAnalytics}
                disabled={resettingAnalytics}
                className="inline-flex items-center px-4 py-2 text-sm font-semibold border border-red-500 text-red-600 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${resettingAnalytics ? "animate-spin" : ""}`} />
                {resettingAnalytics ? "リセット中..." : "分析データをリセット"}
              </button>
            </div>
          </div>
          {resetError ? (
            <p className="mt-2 text-sm text-red-600">{resetError}</p>
          ) : null}
        </div>

        {/* 投稿カード */}
        <div className="bg-white shadow-sm border border-orange-200 overflow-hidden">
          {/* サムネ画像 */}
          {post.imageUrl ? (
            <div className="aspect-video bg-gray-100 relative overflow-hidden">
              <Image
                src={post.imageUrl}
                alt={post.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          ) : (
            <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 relative flex items-center justify-center">
              <div className="text-center">
                <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">画像なし</p>
              </div>
            </div>
          )}

          {/* コンテンツ */}
          <div className="p-6">
            {/* タイトル */}
            <h2 className="text-2xl font-bold text-gray-900 mb-4 break-words">
              {(() => {
                // タイトルから先頭・末尾の「##」「-」「空白」を削除
                return post.title
                  .replace(/^[\s#-]+|[\s#-]+$/g, "")
                  .replace(/^#+/g, "")
                  .trim();
              })()}
            </h2>

            {/* 投稿文全文 */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">投稿文</h3>
              <div className="bg-orange-50 p-4 border-l-4 border-orange-500">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {(() => {
                    const cleanedContent = removeHashtagsFromContent(post.content);
                    // 投稿文から先頭・末尾の「##」「-」「空白」を削除
                    return cleanedContent
                      .replace(/^[\s#-]+|[\s#-]+$/g, "")
                      .replace(/^#+/g, "")
                      .trim();
                  })()}
                </p>
              </div>
            </div>

            {/* 投稿タイプ */}
            <div className="mb-4">
              <span
                className={`inline-block px-3 py-1 text-sm font-medium ${
                  post.postType === "feed"
                    ? "bg-orange-100 text-orange-800"
                    : post.postType === "reel"
                      ? "bg-orange-200 text-orange-900"
                      : "bg-orange-300 text-orange-900"
                }`}
              >
                {post.postType === "feed"
                  ? "フィード"
                  : post.postType === "reel"
                    ? "リール"
                    : "ストーリー"}
              </span>
            </div>

            {/* ハッシュタグ */}
            {(() => {
              // 投稿文から抽出したハッシュタグと、既存のhashtagsフィールドをマージして重複を除去
              const contentHashtags = extractHashtagsFromContent(post.content);
              const existingHashtags = post.hashtags || [];

              // デバッグログ
              console.log("Content hashtags:", contentHashtags);
              console.log("Existing hashtags:", existingHashtags);

              // より確実な重複除去: 小文字に統一してから重複除去
              const normalizedContentHashtags = contentHashtags.map((tag) =>
                tag.toLowerCase().trim()
              );
              const normalizedExistingHashtags = existingHashtags.map((tag) =>
                tag.toLowerCase().trim()
              );

              // 重複を除去してユニークなハッシュタグのみ取得
              const uniqueHashtags = [
                ...new Set([...normalizedContentHashtags, ...normalizedExistingHashtags]),
              ];

              console.log("Unique hashtags:", uniqueHashtags);

              return (
                uniqueHashtags.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">ハッシュタグ</h3>
                    <div className="flex flex-wrap gap-2">
                      {uniqueHashtags.map((tag, index) => {
                        // ハッシュタグから先頭の#を全て削除してから表示時に#を追加
                        const cleanTag = tag.replace(/^#+/, "").trim();
                        return (
                          <span
                            key={index}
                            className="inline-block px-3 py-1 bg-orange-50 text-orange-700 text-sm font-medium hover:bg-orange-100 transition-colors"
                          >
                            #{cleanTag}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )
              );
            })()}

            {/* スケジュール情報 */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">スケジュール情報</h3>
              <div className="bg-orange-50 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center text-gray-700">
                    <Calendar size={18} className="mr-3 text-orange-500" />
                    <div>
                      <div className="text-sm text-gray-500">投稿予定日</div>
                      <div className="font-medium">{formatDate(post.scheduledDate)}</div>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Clock size={18} className="mr-3 text-orange-600" />
                    <div>
                      <div className="text-sm text-gray-500">投稿予定時刻</div>
                      <div className="font-medium">{formatTime(post.scheduledTime)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 分析データ */}
            {post.analytics && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">分析データ</h3>
                <div className="bg-orange-50 p-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {post.analytics.likes !== undefined && (
                      <div className="text-center p-3 bg-white border border-orange-200">
                        <Heart size={24} className="text-orange-500 mx-auto mb-2" />
                        <div className="text-sm text-gray-600 mb-1">いいね</div>
                        <div className="text-xl font-bold text-gray-900">
                          {post.analytics.likes.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {post.analytics.comments !== undefined && (
                      <div className="text-center p-3 bg-white border border-orange-200">
                        <MessageCircle size={24} className="text-orange-600 mx-auto mb-2" />
                        <div className="text-sm text-gray-600 mb-1">コメント</div>
                        <div className="text-xl font-bold text-gray-900">
                          {post.analytics.comments.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {post.analytics.shares !== undefined && (
                      <div className="text-center p-3 bg-white border border-orange-200">
                        <Share size={24} className="text-orange-700 mx-auto mb-2" />
                        <div className="text-sm text-gray-600 mb-1">シェア</div>
                        <div className="text-xl font-bold text-gray-900">
                          {post.analytics.shares.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {post.analytics.reach !== undefined && (
                      <div className="text-center p-3 bg-white border border-orange-200">
                        <EyeIcon size={24} className="text-orange-800 mx-auto mb-2" />
                        <div className="text-sm text-gray-600 mb-1">リーチ</div>
                        <div className="text-xl font-bold text-gray-900">
                          {post.analytics.reach.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {post.analytics.engagementRate !== undefined && (
                      <div className="text-center p-3 bg-white border border-orange-200">
                        <div className="w-6 h-6 bg-orange-500 mx-auto mb-2 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">%</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-1">エンゲージメント率</div>
                        <div className="text-xl font-bold text-gray-900">
                          {post.analytics.engagementRate.toFixed(1)}%
                        </div>
                      </div>
                    )}
                    {post.analytics.publishedAt && (
                      <div className="text-center p-3 bg-white border border-orange-200">
                        <Calendar size={24} className="text-orange-600 mx-auto mb-2" />
                        <div className="text-sm text-gray-600 mb-1">投稿日時</div>
                        <div className="text-sm font-bold text-gray-900">
                          {new Date(post.analytics.publishedAt).toLocaleDateString("ja-JP")}
                        </div>
                        <div className="text-xs text-gray-600">
                          {new Date(post.analytics.publishedAt).toLocaleTimeString("ja-JP", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        <div className="mt-8 space-y-6">
          <div className="border border-gray-200 bg-white shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#ff8a15]" />
              保存済み分析データ
            </h2>
            {analyticsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-[#ff8a15] rounded-full animate-spin" />
                <span>読み込み中です...</span>
              </div>
            ) : analyticsError ? (
              <p className="text-sm text-red-500">{analyticsError}</p>
            ) : postAnalytics ? (
              <div className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="border border-gray-200 bg-gray-50 p-3 rounded-none">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      いいね
                    </p>
                    <p className="text-lg font-semibold text-gray-800">
                      {postAnalytics.likes.toLocaleString()}
                    </p>
                  </div>
                  <div className="border border-gray-200 bg-gray-50 p-3 rounded-none">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      コメント
                    </p>
                    <p className="text-lg font-semibold text-gray-800">
                      {postAnalytics.comments.toLocaleString()}
                    </p>
                  </div>
                  <div className="border border-gray-200 bg-gray-50 p-3 rounded-none">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Share className="w-3 h-3" />
                      シェア
                    </p>
                    <p className="text-lg font-semibold text-gray-800">
                      {postAnalytics.shares.toLocaleString()}
                    </p>
                  </div>
                  <div className="border border-gray-200 bg-gray-50 p-3 rounded-none">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Save className="w-3 h-3" />
                      保存
                    </p>
                    <p className="text-lg font-semibold text-gray-800">
                      {postAnalytics.saves.toLocaleString()}
                    </p>
                  </div>
                  <div className="border border-gray-200 bg-gray-50 p-3 rounded-none">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <EyeIcon className="w-3 h-3" />
                      リーチ
                    </p>
                    <p className="text-lg font-semibold text-gray-800">
                      {postAnalytics.reach.toLocaleString()}
                    </p>
                  </div>
                  {postAnalytics.followerIncrease !== undefined && (
                    <div className="border border-gray-200 bg-gray-50 p-3 rounded-none">
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        フォロワー増加
                      </p>
                      <p className="text-lg font-semibold text-gray-800">
                        {postAnalytics.followerIncrease > 0 ? "+" : ""}
                        {postAnalytics.followerIncrease.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {postAnalytics.interactionCount !== undefined && (
                    <div className="border border-gray-200 bg-gray-50 p-3 rounded-none">
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        インタラクション
                      </p>
                      <p className="text-lg font-semibold text-gray-800">
                        {postAnalytics.interactionCount.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {postAnalytics.reachFollowerPercent !== undefined && (
                    <div className="border border-gray-200 bg-gray-50 p-3 rounded-none">
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        リーチ/フォロワー率
                      </p>
                      <p className="text-lg font-semibold text-gray-800">
                        {postAnalytics.reachFollowerPercent.toFixed(1)}%
                      </p>
                    </div>
                  )}
                  {postAnalytics.interactionFollowerPercent !== undefined && (
                    <div className="border border-gray-200 bg-gray-50 p-3 rounded-none">
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        インタラクション/フォロワー率
                      </p>
                      <p className="text-lg font-semibold text-gray-800">
                        {postAnalytics.interactionFollowerPercent.toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-600">
                  <div className="border border-dashed border-gray-200 bg-gray-50 p-3">
                    <p className="font-semibold text-gray-600 mb-2">満足度フィードバック</p>
                    {postAnalytics.sentiment ? (
                      <div className="space-y-2">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full ${
                            postAnalytics.sentiment === "satisfied"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {postAnalytics.sentiment === "satisfied" ? "満足" : "改善したい"}
                        </span>
                        <p className="text-gray-600 whitespace-pre-wrap">
                          {postAnalytics.sentimentMemo?.trim()
                            ? postAnalytics.sentimentMemo
                            : "メモは記録されていません。"}
                        </p>
                      </div>
                    ) : (
                      <p className="text-gray-500">この投稿には満足度フィードバックがまだありません。</p>
                    )}
                  </div>
                  {postAnalytics.category && (
                    <div className="border border-dashed border-gray-200 bg-gray-50 p-3">
                      <p className="font-semibold text-gray-600 mb-2 flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        カテゴリー
                      </p>
                      <p className="text-gray-700">{postAnalytics.category}</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    コメントと返信ログ
                  </p>
                  {postAnalytics.commentThreads && postAnalytics.commentThreads.length ? (
                    <ul className="space-y-3">
                      {postAnalytics.commentThreads.map((thread, idx) => (
                        <li
                          key={`thread-${idx}`}
                          className="border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 rounded-none"
                        >
                          <p className="font-semibold text-gray-600 mb-1">コメント</p>
                          <p className="mb-2 whitespace-pre-wrap">
                            {thread.comment?.trim() || "（未入力）"}
                          </p>
                          <p className="font-semibold text-gray-600 mb-1">返信・フォロー</p>
                          <p className="whitespace-pre-wrap">
                            {thread.reply?.trim() || "（未入力）"}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-gray-500">
                      コメントログはまだ登録されていません。分析ページで記録するとここに表示されます。
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                この投稿の分析データはまだ保存されていません。分析ページでデータを保存するとここに表示されます。
              </p>
            )}
          </div>
        </div>

        <section className="mt-8 border border-gray-200 bg-white rounded-none shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI投稿ディープダイブ</h2>
              <p className="text-sm text-gray-600 mt-1">
                この投稿の指標やクラスタ比較、AIが抽出した強み・改善点を確認できます。
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerateInsight}
              disabled={isGeneratingInsight || !deepDiveSignal}
              className="px-4 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGeneratingInsight
                ? "AIサマリー生成中..."
                : postInsight
                  ? "AIサマリーを再生成"
                  : "AIサマリーを生成"}
            </button>
          </div>

          {insightError ? (
            <div className="px-6 py-3 text-sm text-red-700 bg-red-50 border-b border-red-100">
              {insightError}
            </div>
          ) : null}

          <div className="px-6 py-6">
            {isDeepDiveLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-600 text-sm">
                <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mr-2" />
                <span>AIディープダイブを読み込んでいます...</span>
              </div>
            ) : deepDiveError ? (
              <div className="border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
                {deepDiveError}
              </div>
            ) : deepDiveSignal ? (
              (() => {
                const clusterInfo = deepDiveSignal.cluster ?? null;
                const similarPosts = clusterInfo?.similarPosts ?? [];
                return (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-700">
                    クラスタ: {clusterInfo?.label ?? "分析中"}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-700">
                    パフォーマンスタグ: {deepDiveSignal.tag.toUpperCase()}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-700">
                    KPIスコア: {deepDiveSignal.kpiScore.toFixed(2)}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-700">
                    エンゲージ率: {deepDiveSignal.engagementRate.toFixed(2)}%
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
                  <div className="border border-dashed border-gray-200 bg-gray-50 p-4">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">指標の差分と意味</h3>
                    {renderSignificanceBadge(
                      "リーチ差分",
                      deepDiveSignal.comparisons?.reachDiff ?? 0,
                      deepDiveSignal.significance?.reach ?? "neutral"
                    )}
                    {renderSignificanceBadge(
                      "エンゲージ差分",
                      deepDiveSignal.comparisons?.engagementRateDiff ?? 0,
                      deepDiveSignal.significance?.engagement ?? "neutral"
                    )}
                    {renderSignificanceBadge(
                      "保存率差分",
                      deepDiveSignal.comparisons?.savesRateDiff ?? 0,
                      deepDiveSignal.significance?.savesRate ?? "neutral"
                    )}
                    {renderSignificanceBadge(
                      "コメント率差分",
                      deepDiveSignal.comparisons?.commentsRateDiff ?? 0,
                      deepDiveSignal.significance?.commentsRate ?? "neutral"
                    )}
                  </div>

                  <div className="border border-dashed border-gray-200 bg-gray-50 p-4">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">クラスタ & 類似投稿</h3>
                    <p className="text-xs text-gray-600 mb-2">
                      クラスタ基準スコア:{" "}
                      {clusterInfo ? clusterInfo.baselinePerformance.toFixed(2) : "N/A"}
                    </p>
                    {similarPosts.length ? (
                      <ul className="space-y-1 text-xs text-gray-600">
                        {similarPosts.map((item) => (
                          <li key={`similar-${item.postId}`}>
                            {item.title} ({item.performanceScore.toFixed(2)})
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-500">同クラスタで比較できる投稿がまだありません。</p>
                    )}
                  </div>

                  <div className="border border-dashed border-gray-200 bg-gray-50 p-4">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">AIサマリー</h3>
                    {savedSummaryError && !savedSummary ? (
                      <p className="text-xs text-red-500 mb-3">{savedSummaryError}</p>
                    ) : null}
                    <div className="flex items-center space-x-3 border-b border-gray-200 mb-3">
                      <button
                        type="button"
                        onClick={() => setSummaryTab("saved")}
                        className={`px-3 py-2 text-xs font-semibold border-b-2 ${
                          summaryTab === "saved"
                            ? "border-[#ff8a15] text-[#ff8a15]"
                            : "border-transparent text-gray-500 hover:text-[#ff8a15]"
                        }`}
                        disabled={!savedSummary}
                      >
                        保存済み
                      </button>
                      <button
                        type="button"
                        onClick={() => setSummaryTab("latest")}
                        className={`px-3 py-2 text-xs font-semibold border-b-2 ${
                          summaryTab === "latest"
                            ? "border-[#ff8a15] text-[#ff8a15]"
                            : "border-transparent text-gray-500 hover:text-[#ff8a15]"
                        }`}
                        disabled={!postInsight}
                      >
                        最新生成
                      </button>
                    </div>
                    {summaryTab === "saved" && savedSummary ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="font-semibold text-gray-600">保存済みAIまとめ</span>
                        </div>
                        <p className="text-sm text-gray-700">{savedSummary.summary}</p>
                        {savedSummary.insights?.length ? (
                          <div>
                            <p className="text-xs font-semibold text-gray-600 mb-1">注目ポイント</p>
                            <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
                              {savedSummary.insights.map((item, idx) => (
                                <li key={`saved-insight-${idx}`}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {savedSummary.recommendedActions?.length ? (
                          <div>
                            <p className="text-xs font-semibold text-gray-600 mb-1">推奨アクション</p>
                            <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
                              {savedSummary.recommendedActions.map((item, idx) => (
                                <li key={`saved-action-${idx}`}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {summaryTab === "latest" ? (
                      postInsight ? (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-700">{postInsight.summary}</p>
                          {postInsight.strengths.length ? (
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1">強み</p>
                              <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
                                {postInsight.strengths.map((item, idx) => (
                                  <li key={`strength-${idx}`}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {postInsight.improvements.length ? (
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1">改善ポイント</p>
                              <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
                                {postInsight.improvements.map((item, idx) => (
                                  <li key={`improve-${idx}`}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {postInsight.nextActions.length ? (
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1">次のアクション</p>
                              <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
                                {postInsight.nextActions.map((item, idx) => (
                                  <li key={`next-${idx}`}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">
                          まだAIサマリーが生成されていません。上部のボタンから生成できます。
                        </p>
                      )
                    ) : null}
                  </div>
                </div>
              </div>
                );
              })()
            ) : (
              <p className="text-sm text-gray-500">
                ディープダイブ情報がありません。投稿に対する分析データやフィードバックが蓄積されると表示されます。
              </p>
            )}
          </div>
        </section>
      </div>
    </SNSLayout>
  );
}
