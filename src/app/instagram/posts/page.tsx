"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import SNSLayout from "../../../components/sns-layout";
import { postsApi } from "../../../lib/api";
import { useAuth } from "../../../contexts/auth-context";
import { useUserProfile } from "@/hooks/useUserProfile";
import { canAccessFeature } from "@/lib/plan-access";
import { notify } from "../../../lib/ui/notifications";
import {
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Share,
  Eye as EyeIcon,
  Calendar,
  Clock,
  Trash2,
  CheckCircle,
  X,
} from "lucide-react";
import type { AIReference, SnapshotReference } from "@/types/ai";

// コンポーネントのインポート
import PostCard from "./components/PostCard";
import PostStats from "./components/PostStats";

interface PostData {
  id: string;
  userId: string;
  title: string;
  content: string;
  hashtags?: string[] | string | null;
  postType: "feed" | "reel" | "story";
  scheduledDate?:
    | Date
    | { toDate(): Date; seconds: number; nanoseconds: number; type?: string }
    | string;
  scheduledTime?: string;
  status: "draft" | "created" | "scheduled" | "published";
  imageUrl?: string | null;
  imageData?: string | null;
  createdAt:
    | Date
    | { toDate(): Date; seconds: number; nanoseconds: number; type?: string }
    | string;
  updatedAt: Date;
  isAIGenerated?: boolean;
  analytics?: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
    reach: number;
    engagementRate: number;
    publishedAt: Date;
    audience?: {
      gender: {
        male: number;
        female: number;
        other: number;
      };
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
      sources: {
        posts: number;
        profile: number;
        explore: number;
        search: number;
        other: number;
      };
      followers: {
        followers: number;
        nonFollowers: number;
      };
    };
  };
  snapshotReferences?: SnapshotReference[];
  generationReferences?: AIReference[];
}

const normalizeHashtags = (hashtags: PostData["hashtags"]): string[] => {
  if (Array.isArray(hashtags)) {
    return hashtags
      .filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
      .map((tag) => tag.replace(/^#+/, "").trim());
  }

  if (typeof hashtags === "string") {
    return hashtags
      .split(" ")
      .map((tag) => tag.replace(/^#+/, "").trim())
      .filter((tag) => tag.length > 0);
  }

  return [];
};

interface AnalyticsData {
  id: string;
  postId?: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  engagementRate: number;
  publishedAt: Date;
  title?: string;
  content?: string;
  hashtags?: string[];
  category?: string;
  thumbnail?: string;
  sentiment?: "satisfied" | "dissatisfied" | null;
  memo?: string;
  followerIncrease?: number;
  audience?: {
    gender: {
      male: number;
      female: number;
      other: number;
    };
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
    sources: {
      posts: number;
      profile: number;
      explore: number;
      search: number;
      other: number;
    };
    followers: {
      followers: number;
      nonFollowers: number;
    };
  };
}

export default function InstagramPostsPage() {
  const { user } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const router = useRouter();

  // すべてのHooksを早期リターンの前に定義
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "analyzed" | "created">("all");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'post' | 'analytics'; id: string; onConfirm: () => void } | null>(null);

  const [scheduledPosts, setScheduledPosts] = useState<
    Array<{
      day: string;
      date: string;
      type: string;
      title: string;
      time: string;
      status: string;
    }>
  >([]);

  const [unanalyzedPosts, setUnanalyzedPosts] = useState<
    Array<{
      id: string;
      title: string;
      type: string;
      imageUrl: string | null;
      createdAt: string;
      status: string;
    }>
  >([]);

  // BFF APIから投稿一覧と分析データを取得
  const fetchPosts = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`/api/posts/with-analytics`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        // BFF APIから取得したデータを設定
        const fetchedPosts = result.data.posts || [];
        
        // 日付で降順ソート（最新が上）
        const sortedPosts = [...fetchedPosts].sort((a, b) => {
          const getDate = (post: PostData): number => {
            if (post.createdAt instanceof Date) {
              return post.createdAt.getTime();
            }
            if (post.createdAt && typeof post.createdAt === "object" && "toDate" in post.createdAt) {
              return (post.createdAt as { toDate(): Date }).toDate().getTime();
            }
            if (typeof post.createdAt === "string") {
              const date = new Date(post.createdAt);
              return isNaN(date.getTime()) ? 0 : date.getTime();
            }
            return 0;
          };

          const aTime = getDate(a);
          const bTime = getDate(b);
          return bTime - aTime; // 降順（新しい順）
        });
        
        setPosts(sortedPosts);
        setAnalyticsData(result.data.analytics || []);
        setScheduledPosts(result.data.scheduledPosts || []);
        setUnanalyzedPosts(result.data.unanalyzedPosts || []);
        
        // 手動入力の分析データも設定（BFF APIから取得済み）
        // manualAnalyticsDataはanalyticsDataからフィルタリングして取得
      }
    } catch (error) {
      console.error("投稿取得エラー:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // BFF APIから既に計算済みのデータを使用するため、processPostsDataは削除済み

  useEffect(() => {
    if (user?.uid) {
      fetchPosts();
    }
  }, [user?.uid, fetchPosts]);

  // リアルタイムソート更新（30秒ごと）
  useEffect(() => {
    const interval = setInterval(() => {
      setPosts((prevPosts) => {
        // 投稿が存在しない場合はソートしない
        if (prevPosts.length === 0) {return prevPosts;}

        return [...prevPosts].sort((a: PostData, b: PostData) => {
          const getDate = (post: PostData): number => {
            if (post.createdAt instanceof Date) {
              return post.createdAt.getTime();
            }
            if (post.createdAt && typeof post.createdAt === "object" && "toDate" in post.createdAt) {
              return (post.createdAt as { toDate(): Date }).toDate().getTime();
            }
            if (typeof post.createdAt === "string") {
              const date = new Date(post.createdAt);
              return isNaN(date.getTime()) ? 0 : date.getTime();
            }
            return 0;
          };

          const aTime = getDate(a);
          const bTime = getDate(b);
          return bTime - aTime; // 降順（新しい順）
        });
      });
    }, 30000); // 30秒ごと

    return () => {
      clearInterval(interval);
    };
  }, []); // 依存配列を空にして、マウント時のみ実行


  // 投稿削除
  const handleDeletePost = async (postId: string) => {
    setDeleteConfirm({
      type: 'post',
      id: postId,
      onConfirm: async () => {
        try {
          await postsApi.delete(postId);
          setPosts(posts.filter((post) => post.id !== postId));
          notify({ type: "success", message: "投稿を削除しました" });

          // 次のアクションを即座に更新
          if (
            typeof window !== "undefined" &&
            (window as Window & { refreshNextActions?: () => void }).refreshNextActions
          ) {
            console.log("🔄 Triggering next actions refresh after post deletion");
            (window as Window & { refreshNextActions?: () => void }).refreshNextActions!();
          }
        } catch (error) {
          console.error("削除エラー:", error);
          notify({ type: "error", message: "削除に失敗しました" });
        } finally {
          setDeleteConfirm(null);
        }
      }
    });
  };

  // 手動入力データ削除
  const handleDeleteManualAnalytics = async (analyticsId: string) => {
    setDeleteConfirm({
      type: 'analytics',
      id: analyticsId,
      onConfirm: async () => {
        try {
          console.log("Deleting analytics with ID:", analyticsId);
          console.log("User ID:", user?.uid);

          const response = await fetch(`/api/analytics/${analyticsId}`, {
            method: "DELETE",
          });

          console.log("Delete response status:", response.status);

          if (response.ok) {
            const result = await response.json();
            console.log("Delete result:", result);
            setAnalyticsData(analyticsData.filter((a) => a.id !== analyticsId));
            notify({ type: "success", message: "分析データを削除しました" });

            // 次のアクションを即座に更新
            if (
              typeof window !== "undefined" &&
              (window as Window & { refreshNextActions?: () => void }).refreshNextActions
            ) {
              console.log("🔄 Triggering next actions refresh after analytics deletion");
              (window as Window & { refreshNextActions?: () => void }).refreshNextActions!();
            }
          } else {
            const errorText = await response.text();
            console.error("Delete error response:", errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
          }
        } catch (error) {
          console.error("削除エラー:", error);
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          setToastMessage({ message: `削除に失敗しました: ${errorMessage}`, type: 'error' });
          setTimeout(() => setToastMessage(null), 5000);
        } finally {
          setDeleteConfirm(null);
        }
      }
    });
  };

  // 手動入力の分析データ
  const manualAnalyticsData = analyticsData.filter(
    (a) => a.postId === null || a.postId === "" || a.postId === undefined
  );

  // タブの投稿数を計算（BFF APIから取得したデータを使用）
  const tabCounts = React.useMemo(() => {
    // BFF APIから既に計算済みのデータを使用するため、ここでは簡易的に計算
    // 実際の値はBFF APIから取得するが、フロントエンドでも再計算する
    const manualAnalyticsData = analyticsData.filter(
      (a) => a.postId === null || a.postId === "" || a.postId === undefined
    );

    const allPostsCount = posts.length + manualAnalyticsData.length;

    const analyzedPostsCount =
      posts.filter((post) => {
        const hasAnalytics = analyticsData.some((a) => a.postId === post.id) || !!post.analytics;
        return hasAnalytics;
      }).length + manualAnalyticsData.length;

    const createdOnlyCount = posts.filter((post) => {
      const hasAnalytics = analyticsData.some((a) => a.postId === post.id) || !!post.analytics;
      return !hasAnalytics;
    }).length;

    return {
      all: allPostsCount,
      analyzed: analyzedPostsCount,
      created: createdOnlyCount,
    };
  }, [posts, analyticsData]);

  // フィルタリングされた投稿を効率的に計算
  const filteredPosts = React.useMemo(() => {
    const filtered = posts.filter((post) => {
      if (activeTab === "all") {return true;}
      const hasAnalytics = analyticsData.some((a) => a.postId === post.id) || !!post.analytics;
      const shouldShow = activeTab === "analyzed" ? hasAnalytics : !hasAnalytics;

      // デバッグログ
      console.log("Post filtering:", {
        postId: post.id,
        title: post.title,
        activeTab,
        hasAnalytics,
        shouldShow,
      });

      return shouldShow;
    });

    // 日付で降順ソート（最新が上）
    const sorted = [...filtered].sort((a, b) => {
      const getDate = (post: PostData): number => {
        if (post.createdAt instanceof Date) {
          return post.createdAt.getTime();
        }
        if (post.createdAt && typeof post.createdAt === "object" && "toDate" in post.createdAt) {
          return (post.createdAt as { toDate(): Date }).toDate().getTime();
        }
        if (typeof post.createdAt === "string") {
          const date = new Date(post.createdAt);
          return isNaN(date.getTime()) ? 0 : date.getTime();
        }
        return 0;
      };

      const aTime = getDate(a);
      const bTime = getDate(b);
      return bTime - aTime; // 降順（新しい順）
    });

    console.log("Filtered posts result:", {
      activeTab,
      totalPosts: posts.length,
      filteredCount: sorted.length,
      manualAnalyticsCount: manualAnalyticsData.length,
    });

    return sorted;
  }, [posts, analyticsData, activeTab, manualAnalyticsData]);

  return (
    <>
      {/* トースト通知 */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg min-w-[300px] max-w-md ${
            toastMessage.type === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            {toastMessage.type === 'success' ? (
              <CheckCircle size={20} className="flex-shrink-0" />
            ) : (
              <X size={20} className="flex-shrink-0" />
            )}
            <p className="font-medium flex-1">{toastMessage.message}</p>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-2 text-white hover:text-gray-200 transition-colors flex-shrink-0"
              aria-label="閉じる"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {deleteConfirm.type === 'post' ? '投稿を削除' : '分析データを削除'}
            </h3>
            <p className="text-gray-700 mb-6">
              {deleteConfirm.type === 'post' 
                ? 'この投稿を削除しますか？この操作は取り消せません。'
                : 'この分析データを削除しますか？この操作は取り消せません。'}
            </p>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => deleteConfirm.onConfirm()}
                className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      <SNSLayout
        customTitle="投稿一覧"
        customDescription="作成した投稿の詳細表示・管理・削除・分析を行えます"
      >
        <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 bg-white min-h-screen">
          {/* 統計表示 */}
          <PostStats scheduledPosts={scheduledPosts} unanalyzedPosts={unanalyzedPosts} />

          {/* 投稿一覧 */}
          {loading ? (
            <div className="text-center py-12">
              <div className="relative w-12 h-12 mx-auto mb-4">
                <div className="absolute inset-0 border-2 border-gray-200 rounded-full"></div>
                <div className="absolute inset-0 border-2 border-[#FF8A15] border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-sm font-medium text-gray-700">読み込み中...</p>
            </div>
          ) : posts.length === 0 && manualAnalyticsData.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-black text-6xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-black mb-2">投稿がありません</h3>
              <p className="text-black mb-4">
                まだ投稿を保存していません。投稿ラボで投稿を作成しましょう。
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => (window.location.href = "/instagram/lab")}
                  className="inline-flex items-center px-4 py-2 bg-orange-500 text-white  hover:bg-orange-600 transition-colors"
                >
                  投稿を作成する
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* タブナビゲーション */}
              <div className="mb-6">
                <div className="bg-white border border-gray-200 p-1">
                  <nav className="flex space-x-1">
                    <button
                      onClick={() => setActiveTab("all")}
                      className={`py-2 px-4 font-medium text-sm transition-all duration-200 ${
                        activeTab === "all"
                          ? "bg-[#ff8a15] text-white shadow-sm"
                          : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                      }`}
                    >
                      すべての投稿 ({tabCounts.all})
                    </button>
                    <button
                      onClick={() => setActiveTab("analyzed")}
                      className={`py-2 px-4 font-medium text-sm transition-all duration-200 ${
                        activeTab === "analyzed"
                          ? "bg-[#ff8a15] text-white shadow-sm"
                          : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                      }`}
                    >
                      分析済み ({tabCounts.analyzed})
                    </button>
                    <button
                      onClick={() => setActiveTab("created")}
                      className={`py-2 px-4 font-medium text-sm transition-all duration-200 ${
                        activeTab === "created"
                          ? "bg-[#ff8a15] text-white shadow-sm"
                          : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                      }`}
                    >
                      作成のみ ({tabCounts.created})
                    </button>
                  </nav>
                </div>
              </div>

              {/* 手動入力の分析データを表示 */}
              {manualAnalyticsData.length > 0 &&
                (activeTab === "all" || activeTab === "analyzed") && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
                    {manualAnalyticsData.map((analytics, index) => (
                      <div
                        key={`manual-${index}`}
                        className="bg-white shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                      >
                        {/* カードヘッダー */}
                        <div className="p-4 border-b border-gray-100">
                          <div className="mb-2">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <span className="text-2xl flex-shrink-0">📊</span>
                                <h3 className="text-lg font-semibold text-black line-clamp-2 break-words">
                                  {(() => {
                                    const title = analytics.title || "手動入力データ";
                                    // タイトルから先頭・末尾の「##」「-」「空白」を削除
                                    const cleanedTitle =
                                      title
                                        .replace(/^[\s#-]+|[\s#-]+$/g, "")
                                        .replace(/^#+/g, "")
                                        .trim() || "手動入力データ";

                                    // 最大文字数制限（50文字）
                                    const maxLength = 50;
                                    if (cleanedTitle.length > maxLength) {
                                      return cleanedTitle.substring(0, maxLength) + "...";
                                    }
                                    return cleanedTitle;
                                  })()}
                                </h3>
                              </div>
                              <button
                                onClick={() => handleDeleteManualAnalytics(analytics.id)}
                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="削除"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-1  text-xs font-medium bg-blue-100 text-blue-800">
                                手動入力
                              </span>
                              <span className="px-2 py-1 text-xs  bg-green-100 text-green-800 font-medium">
                                分析済み
                              </span>
                              {analytics.sentiment && (
                                <span
                                  className={`px-2 py-1 text-xs font-medium ${
                                    analytics.sentiment === "satisfied"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {analytics.sentiment === "satisfied" ? "😊 満足" : "😞 不満"}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-black">
                            <span className="flex items-center">
                              <Calendar size={14} className="mr-1" />
                              {analytics.publishedAt
                                ? new Date(analytics.publishedAt).toLocaleDateString("ja-JP")
                                : "日付未設定"}
                            </span>
                            <span className="flex items-center">
                              <Clock size={14} className="mr-1" />
                              {analytics.publishedAt
                                ? new Date(analytics.publishedAt).toLocaleTimeString("ja-JP", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "時間未設定"}
                            </span>
                          </div>
                        </div>

                        {/* 投稿内容 */}
                        <div className="p-4">
                          {/* 画像プレビュー */}
                          <div className="mb-3">
                            <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
                              {analytics.thumbnail ? (
                                <Image
                                  src={analytics.thumbnail}
                                  alt="投稿画像"
                                  width={400}
                                  height={400}
                                  quality={90}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="text-center text-black">
                                  <ImageIcon size={24} className="mx-auto mb-1 text-black" />
                                  <div className="text-xs">サムネがありません</div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 投稿文 */}
                          <div className="mb-3">
                            <p className="text-gray-700 text-sm">
                              {(() => {
                                const content = analytics.content || "投稿内容がありません";
                                // 投稿文から先頭・末尾の「##」「-」「空白」を削除
                                const cleanedContent = content
                                  .replace(/^[\s#-]+|[\s#-]+$/g, "")
                                  .replace(/^#+/g, "")
                                  .trim();
                                const firstSentence = cleanedContent.split(/[。！？]/)[0];
                                return (
                                  firstSentence +
                                  (cleanedContent.includes("。") ||
                                  cleanedContent.includes("！") ||
                                  cleanedContent.includes("？")
                                    ? "..."
                                    : "")
                                );
                              })()}
                            </p>
                          </div>

                          {/* ハッシュタグ */}
                          {analytics.hashtags &&
                            Array.isArray(analytics.hashtags) &&
                            analytics.hashtags.length > 0 && (
                              <div className="mb-3">
                                <div className="flex flex-wrap gap-1">
                                  {analytics.hashtags.slice(0, 3).map((hashtag, index) => {
                                    // ハッシュタグから先頭の#を全て削除してから表示時に#を追加
                                    const cleanHashtag = hashtag.replace(/^#+/, "").trim();
                                    return (
                                      <span
                                        key={index}
                                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs "
                                      >
                                        #{cleanHashtag}
                                      </span>
                                    );
                                  })}
                                  {analytics.hashtags.length > 3 && (
                                    <span className="px-2 py-1 bg-gray-100 text-black text-xs ">
                                      +{analytics.hashtags.length - 3}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                          {/* 分析データ */}
                          <div className="mb-3">
                            <div className="grid grid-cols-4 gap-4 text-center">
                              <div>
                                <div className="flex items-center justify-center mb-1">
                                  <Heart size={16} className="text-red-500" />
                                </div>
                                <div className="text-lg font-bold text-black">
                                  {(analytics.likes || 0).toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center justify-center mb-1">
                                  <MessageCircle size={16} className="text-black" />
                                </div>
                                <div className="text-lg font-bold text-black">
                                  {(analytics.comments || 0).toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center justify-center mb-1">
                                  <Share size={16} className="text-black" />
                                </div>
                                <div className="text-lg font-bold text-black">
                                  {(analytics.shares || 0).toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center justify-center mb-1">
                                  <EyeIcon size={16} className="text-black" />
                                </div>
                                <div className="text-lg font-bold text-black">
                                  {(analytics.reach || 0).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              {/* 投稿一覧 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredPosts.map((post: PostData & { hasAnalytics?: boolean; analyticsFromData?: PostData["analytics"] }) => {
                  const hasAnalytics = post.hasAnalytics !== undefined
                    ? post.hasAnalytics
                    : analyticsData.some((a) => a.postId === post.id) || !!post.analytics;
                  const analyticsFromData = post.analyticsFromData || analyticsData.find((a) => a.postId === post.id);
                  const postAnalytics: AnalyticsData | null = analyticsFromData
                    ? {
                        id: (analyticsFromData as { id?: string })?.id || post.id,
                        postId: (analyticsFromData as { postId?: string })?.postId || post.id,
                        likes: (analyticsFromData as { likes?: number })?.likes || 0,
                        comments: (analyticsFromData as { comments?: number })?.comments || 0,
                        shares: (analyticsFromData as { shares?: number })?.shares || 0,
                        reach: (analyticsFromData as { reach?: number })?.reach || 0,
                        engagementRate: (analyticsFromData as { engagementRate?: number })?.engagementRate || 0,
                        publishedAt: (() => {
                          const publishedAt = (analyticsFromData as { publishedAt?: Date | string })?.publishedAt;
                          if (publishedAt) {
                            return publishedAt instanceof Date ? publishedAt : new Date(publishedAt);
                          }
                          if (post.scheduledDate instanceof Date) {
                            return post.scheduledDate;
                          }
                          if (typeof post.scheduledDate === 'string') {
                            return new Date(post.scheduledDate);
                          }
                          if (post.scheduledDate && typeof post.scheduledDate === 'object' && 'toDate' in post.scheduledDate) {
                            return post.scheduledDate.toDate();
                          }
                          return new Date();
                        })(),
                        title: (analyticsFromData as { title?: string })?.title,
                        content: (analyticsFromData as { content?: string })?.content,
                        hashtags: (() => {
                          const hashtags = (analyticsFromData as { hashtags?: string[] | string })?.hashtags;
                          if (!hashtags) return undefined;
                          return Array.isArray(hashtags) ? hashtags : typeof hashtags === 'string' ? normalizeHashtags(hashtags) : undefined;
                        })(),
                        category: (analyticsFromData as { category?: string })?.category,
                        thumbnail: (analyticsFromData as { thumbnail?: string })?.thumbnail,
                        audience: (analyticsFromData as { audience?: unknown })?.audience as AnalyticsData['audience'],
                        reachSource: (analyticsFromData as { reachSource?: unknown })?.reachSource as AnalyticsData['reachSource'],
                      }
                    : post.analytics
                      ? {
                          id: post.id,
                          postId: post.id,
                          likes: post.analytics.likes,
                          comments: post.analytics.comments,
                          shares: post.analytics.shares,
                          reach: post.analytics.reach,
                          engagementRate: post.analytics.engagementRate,
                          publishedAt: post.analytics.publishedAt,
                          title: post.title,
                          content: post.content,
                           
                          hashtags: normalizeHashtags(post.hashtags),
                          category: undefined,
                          thumbnail: undefined,
                          audience: post.analytics.audience,
                          reachSource: post.analytics.reachSource,
                        }
                      : null;

                  return (
                    <PostCard
                      key={post.id}
                      post={post}
                      hasAnalytics={hasAnalytics}
                      postAnalytics={postAnalytics}
                      onDeletePost={handleDeletePost}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </SNSLayout>
    </>
  );
}
