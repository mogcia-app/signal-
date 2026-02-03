"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../../contexts/auth-context";
import { useUserProfile } from "@/hooks/useUserProfile";
import { canAccessFeature } from "@/lib/plan-access";
import SNSLayout from "../../../../components/sns-layout";
import { authFetch } from "../../../../utils/authFetch";
import { notify } from "../../../../lib/ui/notifications";
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
  imageUrl?: string | null;
  imageData?: string | null;
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
  const { userProfile, loading: profileLoading } = useUserProfile();

  // すべてのHooksを早期リターンの前に定義
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
  const [resettingAnalytics, setResettingAnalytics] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [autoGenerateScheduled, setAutoGenerateScheduled] = useState(false);

  // プラン階層別アクセス制御: 梅プランでは投稿詳細にアクセスできない
  useEffect(() => {
    if (!profileLoading && !canAccessFeature(userProfile, "canAccessPosts")) {
      router.push("/instagram/lab/feed");
    }
  }, [userProfile, profileLoading, router]);

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
  }, [user?.uid, postId, post?.postType, post?.title, post?.hashtags, postAnalytics?.publishedAt]);

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
        const foundPost = Array.isArray(result?.posts) 
          ? result.posts.find((p: PostData) => p.id === postId)
          : undefined;

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

  // プラン階層別アクセス制御: 梅プランでは投稿詳細にアクセスできない
  useEffect(() => {
    if (!profileLoading && !canAccessFeature(userProfile, "canAccessPosts")) {
      router.push("/instagram/lab/feed");
    }
  }, [userProfile, profileLoading, router]);

  // アクセス権限がない場合は何も表示しない（リダイレクトされる）
  if (profileLoading || !canAccessFeature(userProfile, "canAccessPosts")) {
    return null;
  }

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
      notify({ type: "success", message: "分析データを削除しました" });
    } catch (error) {
      console.error("Analytics reset error:", error);
      const errorMsg = error instanceof Error
        ? error.message
        : "分析データのリセットに失敗しました。";
      setResetError(errorMsg);
      notify({ type: "error", message: errorMsg });
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
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 border-2 border-gray-200 rounded-full"></div>
              <div className="absolute inset-0 border-2 border-[#FF8A15] border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-sm font-medium text-gray-700">読み込み中...</p>
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
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 bg-white min-h-screen">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-500 hover:text-gray-900 mb-3 transition-colors text-sm"
              >
                <ArrowLeft size={16} className="mr-1.5" />
                投稿一覧に戻る
              </button>
              <h1 className="text-3xl font-light text-gray-900 tracking-tight">投稿詳細</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetAnalytics}
                disabled={resettingAnalytics}
                className="inline-flex items-center px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${resettingAnalytics ? "animate-spin" : ""}`} />
                {resettingAnalytics ? "リセット中..." : "分析データをリセット"}
              </button>
            </div>
          </div>
          {resetError ? (
            <p className="mt-3 text-xs text-red-600">{resetError}</p>
          ) : null}
        </div>

        {/* 画像セクション */}
        {post.imageData || post.imageUrl ? (
          <div className="mb-8">
            <div className="w-full max-w-lg mx-auto aspect-square bg-gray-50 relative overflow-hidden">
              {(post.imageData && post.imageData.startsWith("data:")) || (post.imageUrl && post.imageUrl.startsWith("data:")) ? (
                <img
                  src={post.imageData || post.imageUrl || ""}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Image
                  src={post.imageData || post.imageUrl || ""}
                  alt={post.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  unoptimized
                />
              )}
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <div className="w-full max-w-lg mx-auto aspect-square bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 relative flex items-center justify-center">
              <div className="text-center">
                <div className="bg-white/80 backdrop-blur-sm p-4 inline-block">
                  <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                </div>
                <p className="text-gray-400 text-xs font-medium mt-2">画像なし</p>
              </div>
            </div>
          </div>
        )}

        {/* 投稿カード */}
        <div className="bg-white border border-gray-200">
          {/* コンテンツ */}
          <div className="p-8">
            {/* タイトル */}
            <h2 className="text-2xl font-light text-gray-900 mb-6 break-words leading-relaxed tracking-tight">
              {(() => {
                // タイトルから先頭・末尾の「##」「-」「空白」を削除
                return post.title
                  .replace(/^[\s#-]+|[\s#-]+$/g, "")
                  .replace(/^#+/g, "")
                  .trim();
              })()}
            </h2>

            {/* 投稿文全文 */}
            <div className="mb-8">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">投稿文</h3>
              <div className="bg-gray-50 p-5 border-l border-gray-300">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
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
            <div className="mb-6">
              <span
                className={`inline-block px-3 py-1 text-xs font-medium tracking-wide ${
                  post.postType === "feed"
                    ? "bg-gray-100 text-gray-700"
                    : post.postType === "reel"
                      ? "bg-gray-100 text-gray-700"
                      : "bg-gray-100 text-gray-700"
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
                  <div className="mb-8">
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">ハッシュタグ</h3>
                    <div className="flex flex-wrap gap-2">
                      {uniqueHashtags.map((tag, index) => {
                        // ハッシュタグから先頭の#を全て削除してから表示時に#を追加
                        const cleanTag = tag.replace(/^#+/, "").trim();
                        return (
                          <span
                            key={index}
                            className="inline-block px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition-colors"
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


            {/* 分析データ */}
            {post.analytics && (
              <div className="mb-8 pt-6 border-t border-gray-200">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">分析データ</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {post.analytics.likes !== undefined && (
                    <div className="text-center p-4 bg-gray-50 border border-gray-200">
                      <Heart size={18} className="text-gray-600 mx-auto mb-2" />
                      <div className="text-xs text-gray-500 mb-1.5">いいね</div>
                      <div className="text-lg font-light text-gray-900">
                        {post.analytics.likes.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {post.analytics.comments !== undefined && (
                    <div className="text-center p-4 bg-gray-50 border border-gray-200">
                      <MessageCircle size={18} className="text-gray-600 mx-auto mb-2" />
                      <div className="text-xs text-gray-500 mb-1.5">コメント</div>
                      <div className="text-lg font-light text-gray-900">
                        {post.analytics.comments.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {post.analytics.shares !== undefined && (
                    <div className="text-center p-4 bg-gray-50 border border-gray-200">
                      <Share size={18} className="text-gray-600 mx-auto mb-2" />
                      <div className="text-xs text-gray-500 mb-1.5">シェア</div>
                      <div className="text-lg font-light text-gray-900">
                        {post.analytics.shares.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {post.analytics.reach !== undefined && (
                    <div className="text-center p-4 bg-gray-50 border border-gray-200">
                      <EyeIcon size={18} className="text-gray-600 mx-auto mb-2" />
                      <div className="text-xs text-gray-500 mb-1.5">リーチ</div>
                      <div className="text-lg font-light text-gray-900">
                        {post.analytics.reach.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {post.analytics.engagementRate !== undefined && (
                    <div className="text-center p-4 bg-gray-50 border border-gray-200">
                      <div className="w-5 h-5 bg-gray-600 mx-auto mb-2 flex items-center justify-center">
                        <span className="text-white text-[10px] font-medium">%</span>
                      </div>
                      <div className="text-xs text-gray-500 mb-1.5">エンゲージメント率</div>
                      <div className="text-lg font-light text-gray-900">
                        {post.analytics.engagementRate.toFixed(1)}%
                      </div>
                    </div>
                  )}
                  {post.analytics.publishedAt && (
                    <div className="text-center p-4 bg-gray-50 border border-gray-200">
                      <Calendar size={18} className="text-gray-600 mx-auto mb-2" />
                      <div className="text-xs text-gray-500 mb-1.5">投稿日時</div>
                      <div className="text-xs font-light text-gray-900">
                        {new Date(post.analytics.publishedAt).toLocaleDateString("ja-JP")}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {new Date(post.analytics.publishedAt).toLocaleTimeString("ja-JP", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        <div className="mt-12 space-y-8">
          <div className="border border-gray-200 bg-white p-8">
            <h2 className="text-lg font-light text-gray-900 mb-6 flex items-center gap-2 tracking-tight">
              <BarChart3 className="w-4 h-4 text-gray-600" />
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
                  <div className="border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-2">
                      <Heart className="w-3 h-3" />
                      いいね
                    </p>
                    <p className="text-lg font-light text-gray-900">
                      {postAnalytics.likes.toLocaleString()}
                    </p>
                  </div>
                  <div className="border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-2">
                      <MessageCircle className="w-3 h-3" />
                      コメント
                    </p>
                    <p className="text-lg font-light text-gray-900">
                      {postAnalytics.comments.toLocaleString()}
                    </p>
                  </div>
                  <div className="border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-2">
                      <Share className="w-3 h-3" />
                      シェア
                    </p>
                    <p className="text-lg font-light text-gray-900">
                      {postAnalytics.shares.toLocaleString()}
                    </p>
                  </div>
                  <div className="border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-2">
                      <Save className="w-3 h-3" />
                      保存
                    </p>
                    <p className="text-lg font-light text-gray-900">
                      {postAnalytics.saves.toLocaleString()}
                    </p>
                  </div>
                  <div className="border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-2">
                      <EyeIcon className="w-3 h-3" />
                      リーチ
                    </p>
                    <p className="text-lg font-light text-gray-900">
                      {postAnalytics.reach.toLocaleString()}
                    </p>
                  </div>
                  {postAnalytics.followerIncrease !== undefined && (
                    <div className="border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-2">
                        <TrendingUp className="w-3 h-3" />
                        フォロワー増加
                      </p>
                      <p className="text-lg font-light text-gray-900">
                        {postAnalytics.followerIncrease > 0 ? "+" : ""}
                        {postAnalytics.followerIncrease.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {postAnalytics.interactionCount !== undefined && (
                    <div className="border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-2">
                        <BarChart3 className="w-3 h-3" />
                        インタラクション
                      </p>
                      <p className="text-lg font-light text-gray-900">
                        {postAnalytics.interactionCount.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {postAnalytics.reachFollowerPercent !== undefined && (
                    <div className="border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-2">
                        <Users className="w-3 h-3" />
                        リーチ/フォロワー率
                      </p>
                      <p className="text-lg font-light text-gray-900">
                        {postAnalytics.reachFollowerPercent.toFixed(1)}%
                      </p>
                    </div>
                  )}
                  {postAnalytics.interactionFollowerPercent !== undefined && (
                    <div className="border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-2">
                        <BarChart3 className="w-3 h-3" />
                        インタラクション/フォロワー率
                      </p>
                      <p className="text-lg font-light text-gray-900">
                        {postAnalytics.interactionFollowerPercent.toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-medium text-gray-600 mb-3 uppercase tracking-wider">満足度フィードバック</p>
                    {postAnalytics.sentiment ? (
                      <div className="space-y-3">
                        <span
                          className={`inline-flex px-3 py-1 text-xs font-medium ${
                            postAnalytics.sentiment === "satisfied"
                              ? "bg-gray-200 text-gray-700"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {postAnalytics.sentiment === "satisfied" ? "満足" : "改善したい"}
                        </span>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                          {postAnalytics.sentimentMemo?.trim()
                            ? postAnalytics.sentimentMemo
                            : "メモは記録されていません。"}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">この投稿には満足度フィードバックがまだありません。</p>
                    )}
                  </div>
                  {postAnalytics.category && (
                    <div className="border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs font-medium text-gray-600 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                        <Tag className="w-3 h-3" />
                        カテゴリー
                      </p>
                      <p className="text-sm text-gray-700">{postAnalytics.category}</p>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <p className="text-xs font-medium text-gray-600 mb-4 flex items-center gap-1.5 uppercase tracking-wider">
                    <MessageCircle className="w-3 h-3" />
                    コメントと返信ログ
                  </p>
                  {postAnalytics.commentThreads && postAnalytics.commentThreads.length ? (
                    <ul className="space-y-3">
                      {postAnalytics.commentThreads.map((thread, idx) => (
                        <li
                          key={`thread-${idx}`}
                          className="border border-gray-200 bg-gray-50 p-4"
                        >
                          <p className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wider">コメント</p>
                          <p className="mb-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {thread.comment?.trim() || "（未入力）"}
                          </p>
                          <p className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wider">返信・フォロー</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {thread.reply?.trim() || "（未入力）"}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">
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

        {/* AI投稿分析セクション */}
        <section className="mt-12 border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-8 py-6">
            <h2 className="text-lg font-light text-gray-900 tracking-tight mb-1">AI投稿分析</h2>
            <p className="text-sm text-gray-500">
              分析ページで生成されたAIアドバイスを表示します。
            </p>
          </div>

          <div className="px-8 py-8">
            {savedSummaryError && !savedSummary ? (
              <p className="text-xs text-red-500 mb-4">{savedSummaryError}</p>
            ) : null}
            
            {savedSummary ? (
              <div className="space-y-6">
                <div className="bg-gray-50 p-6 border-l-4 border-gray-400">
                  <p className="text-base text-gray-800 leading-relaxed font-light">{savedSummary.summary}</p>
                </div>
                {savedSummary.insights?.length ? (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3 uppercase tracking-wider">強み</h3>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-2 leading-relaxed pl-2">
                      {savedSummary.insights.map((item, idx) => (
                        <li key={`saved-insight-${idx}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {savedSummary.recommendedActions?.length ? (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3 uppercase tracking-wider">次のアクション</h3>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-2 leading-relaxed pl-2">
                      {savedSummary.recommendedActions.map((item, idx) => (
                        <li key={`saved-action-${idx}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500 mb-4">
                  まだAIアドバイスが生成されていません。
                </p>
                <p className="text-xs text-gray-400">
                  分析ページでフィードバックを入力し、AIアドバイスを生成してください。
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </SNSLayout>
  );
}
