"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../../contexts/auth-context";
import { useUserProfile } from "@/hooks/useUserProfile";
import { canAccessFeature } from "@/lib/plan-access";
import SNSLayout from "../../../../components/sns-layout";
import { authFetch } from "../../../../utils/authFetch";
import { notify } from "../../../../lib/ui/notifications";
import {
  Image as ImageIcon,
  ArrowLeft,
  RefreshCw,
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
  reposts: number;
  saves: number;
  reach: number;
  followerIncrease?: number;
  publishedAt?: Date | null;
  publishedTime?: string;
  reachFollowerPercent?: number;
  interactionCount?: number;
  interactionFollowerPercent?: number;
  reachedAccounts?: number;
  profileVisits?: number;
  profileFollows?: number;
  externalLinkTaps?: number;
  reelReachFollowerPercent?: number;
  reelInteractionCount?: number;
  reelInteractionFollowerPercent?: number;
  reelReachedAccounts?: number;
  reelSkipRate?: number;
  reelNormalSkipRate?: number;
  reelPlayTime?: number;
  reelAvgPlayTime?: number;
  audience?: {
    gender: { male: number; female: number; other: number };
    age: {
      "13-17": number;
      "18-24": number;
      "25-34": number;
      "35-44": number;
      "45-54": number;
      "55-64": number;
      "65+": number;
    };
  };
  reachSource?: {
    sources: { posts: number; profile: number; explore: number; search: number; other: number };
    followers: { followers: number; nonFollowers: number };
  };
  commentThreads?: CommentThread[];
  createdAt?: Date | null;
}

const normalizeId = (value: unknown): string => {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
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
  const [postAnalytics, setPostAnalytics] = useState<PostAnalyticsRecord | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [resettingAnalytics, setResettingAnalytics] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetConfirming, setIsResetConfirming] = useState(false);

  // プラン階層別アクセス制御: 梅プランでは投稿詳細にアクセスできない
  useEffect(() => {
    if (!profileLoading && !canAccessFeature(userProfile, "canAccessPosts")) {
      router.push("/home");
    }
  }, [userProfile, profileLoading, router]);


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
        const targetId = normalizeId(postId);
        const matched = json.data.find((item: { postId?: string; id?: string }) => {
          return normalizeId(item.postId) === targetId || normalizeId(item.id) === targetId;
        });
        if (matched) {
          const audienceRaw =
            matched.audience && typeof matched.audience === "object"
              ? matched.audience
              : null;
          const audience = audienceRaw
            ? {
                gender: {
                  male: Number(audienceRaw?.gender?.male ?? 0),
                  female: Number(audienceRaw?.gender?.female ?? 0),
                  other: Number(audienceRaw?.gender?.other ?? 0),
                },
                age: {
                  "13-17": Number(audienceRaw?.age?.["13-17"] ?? 0),
                  "18-24": Number(audienceRaw?.age?.["18-24"] ?? 0),
                  "25-34": Number(audienceRaw?.age?.["25-34"] ?? 0),
                  "35-44": Number(audienceRaw?.age?.["35-44"] ?? 0),
                  "45-54": Number(audienceRaw?.age?.["45-54"] ?? 0),
                  "55-64": Number(audienceRaw?.age?.["55-64"] ?? 0),
                  "65+": Number(audienceRaw?.age?.["65+"] ?? 0),
                },
              }
            : null;

          const rawReachSource =
            matched.reachSource && typeof matched.reachSource === "object"
              ? matched.reachSource
              : null;
          const fallbackNonFollowers = Number(
            matched.reachFollowerPercent ?? matched.reelReachFollowerPercent ?? 0
          );
          const safeNonFollowers = Number.isFinite(fallbackNonFollowers)
            ? Math.max(0, Math.min(100, fallbackNonFollowers))
            : 0;
          const fallbackReachSource = {
            sources: {
              posts: Number(matched.reachSourceFeed ?? matched.reelReachSourceReel ?? 0),
              profile: Number(matched.reachSourceProfile ?? matched.reelReachSourceProfile ?? 0),
              explore: Number(matched.reachSourceExplore ?? matched.reelReachSourceExplore ?? 0),
              search: Number(matched.reachSourceSearch ?? matched.reelReachSourceSearch ?? 0),
              other: Number(matched.reachSourceOther ?? matched.reelReachSourceOther ?? 0),
            },
            followers: {
              followers: Math.max(0, 100 - safeNonFollowers),
              nonFollowers: safeNonFollowers,
            },
          };
          const normalizedReachSource = rawReachSource
            ? {
                sources: {
                  posts: Number(rawReachSource?.sources?.posts ?? 0),
                  profile: Number(rawReachSource?.sources?.profile ?? 0),
                  explore: Number(rawReachSource?.sources?.explore ?? 0),
                  search: Number(rawReachSource?.sources?.search ?? 0),
                  other: Number(rawReachSource?.sources?.other ?? 0),
                },
                followers: {
                  followers: Number(rawReachSource?.followers?.followers ?? 0),
                  nonFollowers: Number(rawReachSource?.followers?.nonFollowers ?? 0),
                },
              }
            : fallbackReachSource;

          const commentThreads = Array.isArray(matched.commentThreads)
            ? matched.commentThreads
            : [];

          const record: PostAnalyticsRecord = {
            id: matched.id ?? "",
            postId: matched.postId ?? "",
            category: matched.category ?? undefined,
            likes: matched.likes ?? 0,
            comments: matched.comments ?? 0,
            shares: matched.shares ?? 0,
            reposts: matched.reposts ?? 0,
            saves: matched.saves ?? 0,
            reach: matched.reach ?? 0,
            followerIncrease: matched.followerIncrease ?? 0,
            publishedAt: matched.publishedAt ? new Date(matched.publishedAt) : null,
            publishedTime: matched.publishedTime ?? "",
            reachFollowerPercent: matched.reachFollowerPercent ?? undefined,
            interactionCount: matched.interactionCount ?? undefined,
            interactionFollowerPercent: matched.interactionFollowerPercent ?? undefined,
            reachedAccounts: matched.reachedAccounts ?? undefined,
            profileVisits: matched.profileVisits ?? undefined,
            profileFollows: matched.profileFollows ?? undefined,
            externalLinkTaps: matched.externalLinkTaps ?? undefined,
            reelReachFollowerPercent: matched.reelReachFollowerPercent ?? undefined,
            reelInteractionCount: matched.reelInteractionCount ?? undefined,
            reelInteractionFollowerPercent: matched.reelInteractionFollowerPercent ?? undefined,
            reelReachedAccounts: matched.reelReachedAccounts ?? undefined,
            reelSkipRate: matched.reelSkipRate ?? undefined,
            reelNormalSkipRate: matched.reelNormalSkipRate ?? undefined,
            reelPlayTime: matched.reelPlayTime ?? undefined,
            reelAvgPlayTime: matched.reelAvgPlayTime ?? undefined,
            audience: audience ?? undefined,
            reachSource: normalizedReachSource,
            commentThreads,
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
      router.push("/home");
    }
  }, [userProfile, profileLoading, router]);

  // アクセス権限がない場合は何も表示しない（リダイレクトされる）
  if (profileLoading || !canAccessFeature(userProfile, "canAccessPosts")) {
    return null;
  }

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
      setIsResetConfirming(false);
      return;
    }

    if (!isResetConfirming) {
      setIsResetConfirming(true);
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

      await response.json().catch(() => null);

      setPostAnalytics(null);
      notify({ type: "success", message: "分析データを削除しました" });
      router.push("/instagram/posts");
    } catch (error) {
      console.error("Analytics reset error:", error);
      const errorMsg = error instanceof Error
        ? error.message
        : "分析データのリセットに失敗しました。";
      setResetError(errorMsg);
      notify({ type: "error", message: errorMsg });
    } finally {
      setResettingAnalytics(false);
      setIsResetConfirming(false);
    }
  };

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

  const mergedHashtags = [
    ...new Set(
      [...extractHashtagsFromContent(post.content), ...(post.hashtags || [])].map((tag) =>
        tag.toLowerCase().trim()
      )
    ),
  ];

  const performanceData = postAnalytics
    ? {
        likes: postAnalytics.likes || 0,
        comments: postAnalytics.comments || 0,
        shares: postAnalytics.shares || 0,
        reposts: postAnalytics.reposts || 0,
        saves: postAnalytics.saves || 0,
        followerIncrease: postAnalytics.followerIncrease,
        publishedAt: postAnalytics.publishedAt || null,
      }
    : post.analytics
      ? {
          likes: post.analytics.likes || 0,
          comments: post.analytics.comments || 0,
          shares: post.analytics.shares || 0,
          reposts: 0,
          saves: 0,
          followerIncrease: undefined,
          publishedAt: post.analytics.publishedAt || null,
        }
      : null;

  const analyticsPostType = postAnalytics?.category === "reel" ? "reel" : post.postType;
  const isReelAnalytics = analyticsPostType === "reel";
  const hasCommentLogs = Boolean(
    postAnalytics?.commentThreads?.some((thread) => (thread.comment?.trim() || thread.reply?.trim()))
  );

  return (
    <SNSLayout customTitle="投稿詳細" customDescription="投稿の詳細情報を表示">
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 bg-white min-h-screen">
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
            <button
              type="button"
              onClick={handleResetAnalytics}
              disabled={resettingAnalytics}
              className="inline-flex items-center px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${resettingAnalytics ? "animate-spin" : ""}`} />
              {resettingAnalytics
                ? "リセット中..."
                : isResetConfirming
                  ? "もう一度押してリセット確定"
                  : "分析データをリセット"}
            </button>
          </div>
          {resetError ? <p className="mt-3 text-xs text-red-600">{resetError}</p> : null}
          {isResetConfirming && !resettingAnalytics ? (
            <button
              type="button"
              onClick={() => setIsResetConfirming(false)}
              className="mt-2 text-xs text-gray-500 hover:text-gray-700"
            >
              キャンセル
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-7 border border-gray-200 bg-white p-6 sm:p-8">
            {post.imageUrl && post.imageUrl.length > 0 ? (
              <div className="mb-6">
                <div className="w-full aspect-square bg-gray-50 relative overflow-hidden">
                  <Image
                    src={post.imageUrl}
                    alt={post.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    unoptimized
                  />
                </div>
              </div>
            ) : (
              <div className="mb-6 w-full aspect-square bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 relative flex items-center justify-center">
                <div className="text-center">
                  <div className="bg-white/80 p-4 inline-block">
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  </div>
                  <p className="text-gray-400 text-xs font-medium mt-2">画像なし</p>
                </div>
              </div>
            )}

            <h2 className="text-2xl font-light text-gray-900 mb-4 break-words leading-relaxed tracking-tight">
              {post.title.replace(/^[\s#-]+|[\s#-]+$/g, "").replace(/^#+/g, "").trim()}
            </h2>
            <div className="mb-5 bg-gray-50 p-5 border-l border-gray-300">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                {removeHashtagsFromContent(post.content).replace(/^[\s#-]+|[\s#-]+$/g, "").replace(/^#+/g, "").trim()}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {mergedHashtags.map((tag, index) => {
                const cleanTag = tag.replace(/^#+/, "").trim();
                return (
                  <span key={index} className="inline-block px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium">
                    #{cleanTag}
                  </span>
                );
              })}
            </div>
          </section>

          <aside className="lg:col-span-5 border border-gray-200 bg-white p-6 sm:p-8">
            <h2 className="text-lg font-light text-gray-900 mb-5 tracking-tight">パフォーマンス</h2>
            {analyticsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-[#ff8a15] rounded-full animate-spin" />
                <span>読み込み中です...</span>
              </div>
            ) : analyticsError ? (
              <p className="text-sm text-red-500">{analyticsError}</p>
            ) : performanceData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-gray-200 bg-gray-50 p-4 min-h-[96px]"><p className="text-xs text-gray-500 mb-2">いいね</p><p className="text-xl font-light text-gray-900">{performanceData.likes.toLocaleString()}</p></div>
                  <div className="border border-gray-200 bg-gray-50 p-4 min-h-[96px]"><p className="text-xs text-gray-500 mb-2">コメント</p><p className="text-xl font-light text-gray-900">{performanceData.comments.toLocaleString()}</p></div>
                  <div className="border border-gray-200 bg-gray-50 p-4 min-h-[96px]"><p className="text-xs text-gray-500 mb-2">シェア</p><p className="text-xl font-light text-gray-900">{performanceData.shares.toLocaleString()}</p></div>
                  <div className="border border-gray-200 bg-gray-50 p-4 min-h-[96px]"><p className="text-xs text-gray-500 mb-2">リポスト</p><p className="text-xl font-light text-gray-900">{performanceData.reposts.toLocaleString()}</p></div>
                  <div className="border border-gray-200 bg-gray-50 p-4 min-h-[96px]"><p className="text-xs text-gray-500 mb-2">保存</p><p className="text-xl font-light text-gray-900">{performanceData.saves.toLocaleString()}</p></div>
                  <div className="border border-gray-200 bg-gray-50 p-4 min-h-[96px]"><p className="text-xs text-gray-500 mb-2">フォロワー増加</p><p className="text-xl font-light text-gray-900">{performanceData.followerIncrease !== undefined && performanceData.followerIncrease !== null ? `${performanceData.followerIncrease > 0 ? "+" : ""}${performanceData.followerIncrease.toLocaleString()}` : "-"}</p></div>
                </div>

                {postAnalytics ? (
                  <div className="space-y-3">
                    <details className="border border-gray-200 bg-gray-50 p-4">
                      <summary className="cursor-pointer text-sm text-gray-700 font-medium">
                        概要（{isReelAnalytics ? "リール" : "フィード"}）
                      </summary>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-700">
                        {isReelAnalytics ? (
                          <>
                            <div className="flex justify-between border border-gray-200 bg-white px-2 py-1.5"><span>閲覧数</span><span className="font-medium">{postAnalytics.reach.toLocaleString()}</span></div>
                            <div className="flex justify-between border border-gray-200 bg-white px-2 py-1.5"><span>フォロワー外（閲覧）</span><span className="font-medium">{Number(postAnalytics.reelReachFollowerPercent ?? 0)}%</span></div>
                            <div className="flex justify-between border border-gray-200 bg-white px-2 py-1.5"><span>インタラクション数</span><span className="font-medium">{Number(postAnalytics.reelInteractionCount ?? 0).toLocaleString()}</span></div>
                            <div className="flex justify-between border border-gray-200 bg-white px-2 py-1.5"><span>フォロワー外（インタラクション）</span><span className="font-medium">{Number(postAnalytics.reelInteractionFollowerPercent ?? 0)}%</span></div>
                            <div className="flex justify-between border border-gray-200 bg-white px-2 py-1.5"><span>リーチしたアカウント数</span><span className="font-medium">{Number(postAnalytics.reelReachedAccounts ?? 0).toLocaleString()}</span></div>
                            <div className="flex justify-between border border-gray-200 bg-white px-2 py-1.5"><span>スキップ率</span><span className="font-medium">{Number(postAnalytics.reelSkipRate ?? 0)}%</span></div>
                            <div className="flex justify-between border border-gray-200 bg-white px-2 py-1.5"><span>通常のスキップ率</span><span className="font-medium">{Number(postAnalytics.reelNormalSkipRate ?? 0)}%</span></div>
                            <div className="flex justify-between border border-gray-200 bg-white px-2 py-1.5"><span>再生時間</span><span className="font-medium">{Number(postAnalytics.reelPlayTime ?? 0).toLocaleString()}</span></div>
                            <div className="flex justify-between border border-gray-200 bg-white px-2 py-1.5 col-span-2"><span>平均再生時間</span><span className="font-medium">{Number(postAnalytics.reelAvgPlayTime ?? 0)}</span></div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between border border-gray-200 bg-white px-2 py-1.5"><span>閲覧数</span><span className="font-medium">{postAnalytics.reach.toLocaleString()}</span></div>
                            <div className="flex justify-between border border-gray-200 bg-white px-2 py-1.5"><span>フォロワー外（閲覧）</span><span className="font-medium">{Number(postAnalytics.reachFollowerPercent ?? 0)}%</span></div>
                            <div className="flex justify-between border border-gray-200 bg-white px-2 py-1.5"><span>インタラクション数</span><span className="font-medium">{Number(postAnalytics.interactionCount ?? 0).toLocaleString()}</span></div>
                            <div className="flex justify-between border border-gray-200 bg-white px-2 py-1.5"><span>フォロワー外（インタラクション）</span><span className="font-medium">{Number(postAnalytics.interactionFollowerPercent ?? 0)}%</span></div>
                            <div className="flex justify-between border border-gray-200 bg-white px-2 py-1.5"><span>リーチしたアカウント数</span><span className="font-medium">{Number(postAnalytics.reachedAccounts ?? 0).toLocaleString()}</span></div>
                            <div className="flex justify-between border border-gray-200 bg-white px-2 py-1.5"><span>プロフィールアクセス数</span><span className="font-medium">{Number(postAnalytics.profileVisits ?? 0).toLocaleString()}</span></div>
                            <div className="flex justify-between border border-gray-200 bg-white px-2 py-1.5 col-span-2"><span>外部リンクタップ数</span><span className="font-medium">{Number(postAnalytics.externalLinkTaps ?? 0).toLocaleString()}</span></div>
                          </>
                        )}
                      </div>
                    </details>
                    <details className="border border-gray-200 bg-gray-50 p-4">
                      <summary className="cursor-pointer text-sm text-gray-700 font-medium">オーディエンス</summary>
                      {postAnalytics.audience ? (
                        <div className="mt-3 text-xs text-gray-600 space-y-1">
                          <p>男性 {postAnalytics.audience.gender.male}% / 女性 {postAnalytics.audience.gender.female}% / その他 {postAnalytics.audience.gender.other}%</p>
                          <p>
                            13-17 {postAnalytics.audience.age["13-17"]}% / 18-24 {postAnalytics.audience.age["18-24"]}% / 25-34 {postAnalytics.audience.age["25-34"]}%
                          </p>
                          <p>
                            35-44 {postAnalytics.audience.age["35-44"]}% / 45-54 {postAnalytics.audience.age["45-54"]}% / 55-64 {postAnalytics.audience.age["55-64"]}% / 65+ {postAnalytics.audience.age["65+"]}%
                          </p>
                        </div>
                      ) : <p className="mt-3 text-xs text-gray-500">データ未登録</p>}
                    </details>
                    <details className="border border-gray-200 bg-gray-50 p-4">
                      <summary className="cursor-pointer text-sm text-gray-700 font-medium">閲覧ソース</summary>
                      <div className="mt-3 text-xs text-gray-600 space-y-1">
                        <p>リーチ {postAnalytics.reach.toLocaleString()}</p>
                        {postAnalytics.reachSource ? (
                          <>
                          <p>投稿 {postAnalytics.reachSource.sources.posts}% / プロフィール {postAnalytics.reachSource.sources.profile}% / 探索 {postAnalytics.reachSource.sources.explore}% / 検索 {postAnalytics.reachSource.sources.search}% / その他 {postAnalytics.reachSource.sources.other}%</p>
                          <p>フォロワー内 {postAnalytics.reachSource.followers.followers}% / フォロワー外 {postAnalytics.reachSource.followers.nonFollowers}%</p>
                          </>
                        ) : (
                          <p className="text-gray-500">ソース内訳データは未登録</p>
                        )}
                      </div>
                    </details>
                    <details className="border border-gray-200 bg-gray-50 p-4">
                      <summary className="cursor-pointer text-sm text-gray-700 font-medium">コメントログ</summary>
                      {hasCommentLogs ? (
                        <ul className="mt-3 space-y-2">
                          {(postAnalytics.commentThreads ?? []).map((thread, idx) => (
                            <li key={`thread-${idx}`} className="text-xs text-gray-600">
                              <p className="font-medium text-gray-700">コメント</p>
                              <p className="mb-2">{thread.comment?.trim() || "（未入力）"}</p>
                              <p className="font-medium text-gray-700">返信</p>
                              <p>{thread.reply?.trim() || "（未入力）"}</p>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="mt-3 text-xs text-gray-500">データ未登録</p>}
                    </details>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-gray-500">この投稿の分析データはまだ保存されていません。</p>
            )}
          </aside>
        </div>

      </div>
    </SNSLayout>
  );
}
