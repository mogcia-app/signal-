"use client";

import React from "react";
import Image from "next/image";
import {
  Trash2,
  Eye,
  Calendar,
  Clock,
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Share,
  Eye as EyeIcon,
} from "lucide-react";
import type { AIReference } from "@/types/ai";

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
  generationReferences?: AIReference[];
}

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

interface PostCardProps {
  post: PostData;
  hasAnalytics: boolean;
  postAnalytics: AnalyticsData | null;
  onDeletePost: (postId: string) => void;
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

const PostCard: React.FC<PostCardProps> = ({ post, hasAnalytics, postAnalytics, onDeletePost }) => {
  // ステータス表示の色分け
  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "created":
        return "bg-purple-100 text-purple-800";
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "published":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // ステータス表示の日本語
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft":
        return "下書き";
      case "created":
        return "作成済み";
      case "scheduled":
        return "予約投稿";
      case "published":
        return "公開済み";
      default:
        return status;
    }
  };

  // 投稿タイプ表示の絵文字
  const getPostTypeIcon = (postType: string) => {
    // デバッグログを追加
    console.log("PostCard 投稿タイプデバッグ:", {
      postId: post.id,
      postType: postType,
      title: post.title,
    });

    switch (postType) {
      case "feed":
        return "📸";
      case "reel":
        return "🎬";
      case "story":
        return "📱";
      default:
        return "📝";
    }
  };

  // 満足度表示の色とアイコン
  const getSentimentDisplay = (sentiment: "satisfied" | "dissatisfied" | null | undefined) => {
    if (!sentiment) {return null;}

    switch (sentiment) {
      case "satisfied":
        return {
          icon: "😊",
          text: "満足",
          bgColor: "bg-green-100",
          textColor: "text-green-800",
        };
      case "dissatisfied":
        return {
          icon: "😞",
          text: "不満",
          bgColor: "bg-red-100",
          textColor: "text-red-800",
        };
      default:
        return null;
    }
  };

  const referenceTypeMeta: Record<
    AIReference["sourceType"] | "default",
    { label: string; badgeClass: string }
  > = {
    profile: { label: "アカウント設定", badgeClass: "border-slate-200 bg-slate-50 text-slate-700" },
    plan: { label: "運用計画", badgeClass: "border-indigo-200 bg-indigo-50 text-indigo-700" },
    masterContext: { label: "マスターコンテキスト", badgeClass: "border-amber-200 bg-amber-50 text-amber-700" },
    snapshot: { label: "投稿実績", badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    feedback: { label: "フィードバック", badgeClass: "border-rose-200 bg-rose-50 text-rose-700" },
    analytics: { label: "分析データ", badgeClass: "border-blue-200 bg-blue-50 text-blue-700" },
    manual: { label: "メモ", badgeClass: "border-slate-200 bg-slate-50 text-slate-700" },
    default: { label: "参照データ", badgeClass: "border-slate-200 bg-slate-50 text-slate-700" },
  };

  const getReferenceMeta = (sourceType: AIReference["sourceType"]) =>
    referenceTypeMeta[sourceType] ?? referenceTypeMeta.default;

  return (
    <div className="relative bg-white shadow-sm border border-gray-200 overflow-visible hover:shadow-md transition-shadow">
      {/* ラベルをカードの外枠の上に配置 */}
      <div className="absolute -top-3 left-4 flex items-center space-x-2 z-10">
        {post.isAIGenerated && (
          <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 flex items-center shadow-sm">
            <span className="mr-1">🤖</span>
            AI生成
          </span>
        )}
        <span className={`px-2 py-1 text-xs font-medium ${getStatusColor(post.status)} shadow-sm`}>
          {getStatusLabel(post.status)}
        </span>
        {hasAnalytics && post.postType !== "story" && (
          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 font-medium shadow-sm">
            分析済み
          </span>
        )}
        {hasAnalytics &&
          postAnalytics?.sentiment &&
          post.postType !== "story" &&
          (() => {
            const sentimentDisplay = getSentimentDisplay(postAnalytics.sentiment);
            return sentimentDisplay ? (
              <span
                className={`px-2 py-1 text-xs font-medium ${sentimentDisplay.bgColor} ${sentimentDisplay.textColor} shadow-sm`}
              >
                {sentimentDisplay.icon} {sentimentDisplay.text}
              </span>
            ) : null;
          })()}
      </div>

      {/* カードヘッダー */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <span className="text-2xl flex-shrink-0">{getPostTypeIcon(post.postType)}</span>
            <h3 className="text-lg font-semibold text-black line-clamp-2 break-words">
              {(() => {
                const title = post.title || "タイトルなし";
                // タイトルから先頭・末尾の「##」「-」「空白」を削除
                const cleanedTitle =
                  title
                    .replace(/^[\s#-]+|[\s#-]+$/g, "")
                    .replace(/^#+/g, "")
                    .trim() || "タイトルなし";

                // 最大文字数制限（50文字）
                const maxLength = 50;
                if (cleanedTitle.length > maxLength) {
                  return cleanedTitle.substring(0, maxLength) + "...";
                }
                return cleanedTitle;
              })()}
            </h3>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm text-black">
          <span className="flex items-center">
            <Calendar size={14} className="mr-1" />
            {(() => {
              try {
                if (!post.scheduledDate) {return "記録なし";}

                let date: Date;
                if (post.scheduledDate instanceof Date) {
                  date = post.scheduledDate;
                } else if (
                  post.scheduledDate &&
                  typeof post.scheduledDate === "object" &&
                  "toDate" in post.scheduledDate
                ) {
                  date = post.scheduledDate.toDate();
                } else {
                  date = new Date(post.scheduledDate);
                }

                // Invalid Date チェック
                if (isNaN(date.getTime())) {
                  return "記録なし";
                }

                return date.toLocaleDateString("ja-JP");
              } catch (_error) {
                return "記録なし";
              }
            })()}
          </span>
          <span className="flex items-center">
            <Clock size={14} className="mr-1" />
            {post.scheduledTime || "記録なし"}
          </span>
        </div>
      </div>

      {/* 投稿内容 */}
      <div className="p-4">
        {/* 画像プレビュー */}
        <div className="mb-3">
          <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
            {post.imageData || post.imageUrl ? (
              post.imageData ? (
                <Image
                  src={post.imageData}
                  alt="投稿画像"
                  width={400}
                  height={400}
                  quality={90}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon size={24} className="text-black" />
              )
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
              const content = post.content || "投稿内容がありません";
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
        {(() => {
          const hashtags = normalizeHashtags(post.hashtags);

          if (hashtags.length === 0) {return null;}

          return (
            <div className="mb-3">
              <div className="flex flex-wrap gap-1">
                {hashtags
                  .slice(0, 3)
                  .map((hashtag: string, index: number) => {
                    // ハッシュタグから先頭の#を全て削除してから表示時に#を追加
                    const cleanHashtag = hashtag.replace(/^#+/, "").trim();
                    if (!cleanHashtag) {return null;}
                    return (
                      <span
                        key={index}
                        className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full"
                      >
                        #{cleanHashtag}
                      </span>
                    );
                  })
                  .filter(Boolean)}
                {hashtags.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-black text-xs rounded-full">
                    +{hashtags.length - 3}
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        {/* AI参照データ */}
        {post.generationReferences && post.generationReferences.length > 0 && (
          <div className="mb-3">
            <p className="text-[11px] text-slate-500 mb-1">AI参照データ</p>
            <div className="flex flex-wrap gap-1.5">
              {post.generationReferences.slice(0, 5).map((reference) => {
                const meta = getReferenceMeta(reference.sourceType);
                return (
                  <span
                    key={`${post.id}-${reference.id}`}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${meta.badgeClass}`}
                    title={reference.summary || meta.label}
                  >
                    {reference.label || meta.label}
                  </span>
                );
              })}
              {post.generationReferences.length > 5 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium border border-slate-200 bg-white text-slate-600">
                  +{post.generationReferences.length - 5}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 分析データ（分析済みの場合のみ、ストーリーは除く） */}
        {hasAnalytics && postAnalytics && post.postType !== "story" && (
          <div className="mb-3">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center mb-1">
                  <Heart size={16} className="text-red-500" />
                </div>
                <div className="text-lg font-bold text-black">
                  {postAnalytics.likes.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-center mb-1">
                  <MessageCircle size={16} className="text-black" />
                </div>
                <div className="text-lg font-bold text-black">
                  {postAnalytics.comments.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-center mb-1">
                  <Share size={16} className="text-black" />
                </div>
                <div className="text-lg font-bold text-black">
                  {postAnalytics.shares.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-center mb-1">
                  <EyeIcon size={16} className="text-black" />
                </div>
                <div className="text-lg font-bold text-black">
                  {postAnalytics.reach.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* アクションボタン */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-end space-x-2">
          {/* 編集ボタン（すべてのカードに表示） */}
          <a
            href={`/instagram/lab/${post.postType}?edit=${post.id}`}
            className="px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 hover:text-[#ff8a15] hover:bg-orange-50 hover:border-orange-300 transition-colors"
          >
            編集
          </a>

          {/* 詳細表示ボタン（すべてのカードに表示） */}
          <a
            href={`/instagram/posts/${post.id}`}
            className="px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 hover:text-[#ff8a15] hover:bg-orange-50 hover:border-orange-300 transition-colors"
          >
            詳細
          </a>

          {!hasAnalytics && (
            <>
              {/* 分析ボタン（ストーリー以外） */}
              {post.postType !== "story" && (
                <a
                  href={`${post.postType === "feed" ? "/analytics/feed" : "/instagram/analytics/reel"}?postId=${post.id}`}
                  className="px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 hover:text-[#ff8a15] hover:bg-orange-50 hover:border-orange-300 transition-colors"
                >
                  分析
                </a>
              )}
              <button
                onClick={() => onDeletePost(post.id)}
                className="px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 hover:text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
              >
                削除
              </button>
            </>
          )}

          {hasAnalytics && (
            <>
              {/* 分析済みの場合のボタン */}
              {post.postType !== "story" && (
                <a
                  href={`${post.postType === "feed" ? "/analytics/feed" : "/instagram/analytics/reel"}?postId=${post.id}`}
                  className="px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 hover:text-[#ff8a15] hover:bg-orange-50 hover:border-orange-300 transition-colors"
                >
                  分析編集
                </a>
              )}
              <button
                onClick={() => onDeletePost(post.id)}
                className="px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 hover:text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
              >
                削除
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostCard;
