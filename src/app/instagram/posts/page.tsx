"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import SNSLayout from "../../../components/sns-layout";
import { useAuth } from "../../../contexts/auth-context";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Share,
  Eye as EyeIcon,
  Calendar,
  Clock,
  Trash2,
} from "lucide-react";
import { parseFirestoreDate } from "../../api/ai/monthly-analysis/utils/date-utils";
import { usePostsStore, type PostData, type AnalyticsData } from "@/stores/posts-store";

// コンポーネントのインポート
import PostCard from "./components/PostCard";
import PostStats from "./components/PostStats";
import { ToastNotification } from "./components/ToastNotification";
import { DeleteConfirmModal } from "./components/DeleteConfirmModal";

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

export default function InstagramPostsPage() {
  const { user } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile();

  // Zustandストアから状態を取得
  const posts = usePostsStore((state) => state.posts);
  const loading = usePostsStore((state) => state.loading);
  const activeTab = usePostsStore((state) => state.activeTab);
  const analyticsData = usePostsStore((state) => state.analyticsData);
  const scheduledPosts = usePostsStore((state) => state.scheduledPosts);
  const unanalyzedPosts = usePostsStore((state) => state.unanalyzedPosts);
  const toastMessage = usePostsStore((state) => state.toastMessage);
  const deleteConfirm = usePostsStore((state) => state.deleteConfirm);
  const fetchPosts = usePostsStore((state) => state.fetchPosts);
  const deletePost = usePostsStore((state) => state.deletePost);
  const deleteManualAnalytics = usePostsStore((state) => state.deleteManualAnalytics);
  const setActiveTab = usePostsStore((state) => state.setActiveTab);
  const setDeleteConfirm = usePostsStore((state) => state.setDeleteConfirm);
  const setToastMessage = usePostsStore((state) => state.setToastMessage);
  const getManualAnalyticsData = usePostsStore((state) => state.getManualAnalyticsData);
  const getTabCounts = usePostsStore((state) => state.getTabCounts);
  const getFilteredPosts = usePostsStore((state) => state.getFilteredPosts);

  // データ取得
  useEffect(() => {
    if (user?.uid) {
      fetchPosts(user.uid);
    }
  }, [user?.uid, fetchPosts]);


  // 投稿削除
  const handleDeletePost = (postId: string) => {
    setDeleteConfirm({
      type: "post",
      id: postId,
      onConfirm: async () => {
        try {
          await deletePost(postId);
        } catch (error) {
          // エラーはストア内で処理済み
        } finally {
          setDeleteConfirm(null);
        }
      },
    });
  };

  // 手動入力データ削除
  const handleDeleteManualAnalytics = (analyticsId: string) => {
    setDeleteConfirm({
      type: "analytics",
      id: analyticsId,
      onConfirm: async () => {
        try {
          await deleteManualAnalytics(analyticsId);
        } catch (error) {
          // エラーはストア内で処理済み
        } finally {
          setDeleteConfirm(null);
        }
      },
    });
  };

  // 計算プロパティ
  const manualAnalyticsData = getManualAnalyticsData();
  const tabCounts = getTabCounts();
  const filteredPosts = getFilteredPosts();

  return (
    <>
      {/* トースト通知 */}
      {toastMessage && (
        <ToastNotification
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* 削除確認モーダル */}
      {deleteConfirm && (
        <DeleteConfirmModal
          type={deleteConfirm.type}
          onConfirm={deleteConfirm.onConfirm}
          onCancel={() => setDeleteConfirm(null)}
        />
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
                          const parsedScheduledDate = parseFirestoreDate(post.scheduledDate);
                          return parsedScheduledDate || new Date();
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
