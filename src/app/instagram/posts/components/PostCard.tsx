"use client";

import React from "react";
import Image from "next/image";
import {
  Trash2,
  Eye,
  Copy,
  Calendar,
  Heart,
  MessageCircle,
  Share,
  Bookmark,
  BarChart3,
  TrendingUp,
  Repeat2,
} from "lucide-react";
import { notify } from "@/lib/ui/notifications";

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
    | { toDate?: () => Date }
    | string
    | null;
  scheduledTime?: string;
  status: "draft" | "created" | "scheduled" | "published";
  imageUrl?: string | null;
  createdAt:
    | Date
    | { toDate(): Date; seconds: number; nanoseconds: number; type?: string }
    | { toDate?: () => Date }
    | string
    | null;
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
  };
  generationReferences?: Array<{ sourceType?: string }>;
}

interface AnalyticsData {
  id: string;
  postId?: string;
  likes: number;
  comments: number;
  shares: number;
  reposts?: number;
  saves: number;
  reach: number;
  engagementRate: number;
  publishedAt: Date;
  followerIncrease?: number;
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
  const handleCopyPostContent = async () => {
    const postBody = (post.content || "").trim();
    const hashtags = normalizeHashtags(post.hashtags);
    const hashtagLine = hashtags.length > 0 ? hashtags.map((tag) => `#${tag}`).join(" ") : "";
    const copyText = [postBody, hashtagLine].filter(Boolean).join("\n\n").trim();

    if (!copyText) {
      notify({ type: "error", message: "コピーする投稿文がありません" });
      return;
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(copyText);
      } else if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = copyText;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (!copied) {
          throw new Error("fallback copy failed");
        }
      } else {
        throw new Error("clipboard unavailable");
      }

      notify({ type: "success", message: "投稿文をコピーしました" });
    } catch (_error) {
      notify({ type: "error", message: "コピーに失敗しました" });
    }
  };

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

  return (
    <article className="relative bg-white shadow-sm border border-gray-100 overflow-visible hover:shadow-md transition-all duration-200 aspect-square flex flex-col" aria-label={`投稿: ${post.title || "無題"}`}>
      {/* バッジをカード上部から少しはみ出すように配置 */}
      <div className="absolute -top-2 left-2 flex items-center space-x-1.5 z-10 flex-wrap gap-1">
        {post.isAIGenerated && (
          <span className="px-2.5 py-1 text-[10px] font-medium bg-purple-100 text-purple-700 shadow-sm">
            🤖 AI生成
          </span>
        )}
        {post.status !== "created" && (
          <span className={`px-2.5 py-1 text-[10px] font-medium ${getStatusColor(post.status)} shadow-sm`}>
            {getStatusLabel(post.status)}
          </span>
        )}
        {!hasAnalytics && post.postType !== "story" && (
          <span className="px-2.5 py-1 text-[10px] bg-gradient-to-r from-[#FF8A15] to-orange-500 text-white font-bold shadow-sm">
            分析未設定
          </span>
        )}
        {hasAnalytics &&
          postAnalytics?.sentiment &&
          post.postType !== "story" &&
          (() => {
            const sentimentDisplay = getSentimentDisplay(postAnalytics.sentiment);
            return sentimentDisplay ? (
              <span
                className={`px-2.5 py-1 text-[10px] font-medium ${sentimentDisplay.bgColor} ${sentimentDisplay.textColor} shadow-sm`}
              >
                {sentimentDisplay.icon} {sentimentDisplay.text}
              </span>
            ) : null;
          })()}
      </div>

      {/* 画像（正方形） */}
      {post.imageUrl ? (
        <div className="w-full aspect-square bg-gray-100 relative overflow-hidden">
          <Image
            src={post.imageUrl}
            alt={post.title || "投稿画像"}
            fill
            loading="lazy"
            quality={90}
            className="object-cover"
          />
        </div>
      ) : (
        <div className="w-full aspect-square bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 relative overflow-hidden flex items-center justify-center border border-gray-200">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center">
              <div className="bg-white/60 backdrop-blur-sm p-4 rounded-lg shadow-sm">
                <span className="text-4xl">{getPostTypeIcon(post.postType)}</span>
              </div>
            </div>
            <p className="text-xs font-medium text-gray-400">画像なし</p>
          </div>
          {/* 装飾的なパターン */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 left-0 w-full h-full" style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)`
            }}></div>
          </div>
        </div>
      )}

      {/* カードコンテンツ */}
      <div className="p-3 flex-1 flex flex-col">
        {/* タイトル */}
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 break-words leading-snug mb-1.5">
          {(() => {
            const title = post.title || "タイトルなし";
            const cleanedTitle =
              title
                .replace(/^[\s#-]+|[\s#-]+$/g, "")
                .replace(/^#+/g, "")
                .trim() || "タイトルなし";

            const maxLength = 40;
            if (cleanedTitle.length > maxLength) {
              return cleanedTitle.substring(0, maxLength) + "...";
            }
            return cleanedTitle;
          })()}
        </h3>

        {/* 日付と投稿時間 */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1.5">
          <span className="flex items-center gap-1">
            <Calendar size={10} />
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
                  const toDateFunc = post.scheduledDate.toDate;
                  if (toDateFunc) {
                    date = toDateFunc();
                  } else {
                    return "記録なし";
                  }
                } else if (typeof post.scheduledDate === "string") {
                  date = new Date(post.scheduledDate);
                } else {
                  return "記録なし";
                }

                if (isNaN(date.getTime())) {
                  return "記録なし";
                }

                return date.toLocaleDateString("ja-JP");
              } catch (_error) {
                return "記録なし";
              }
            })()}
          </span>
          {post.scheduledTime && (
            <span className="text-xs text-gray-500">
              {post.scheduledTime}
            </span>
          )}
        </div>

        {/* 投稿文 */}
        <div className="mb-2 flex-1">
          <p className="text-gray-600 text-xs leading-relaxed line-clamp-2">
            {(() => {
              const content = post.content || "投稿内容がありません";
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
            <div className="mb-2">
              <div className="flex flex-wrap gap-1">
                {hashtags
                  .slice(0, 3)
                  .map((hashtag: string, index: number) => {
                    const cleanHashtag = hashtag.replace(/^#+/, "").trim();
                    if (!cleanHashtag) {return null;}
                    return (
                      <span
                        key={index}
                        className="px-1.5 py-0.5 bg-orange-50 text-orange-700 text-[10px] rounded border border-orange-200"
                      >
                        #{cleanHashtag}
                      </span>
                    );
                  })
                  .filter(Boolean)}
                {hashtags.length > 3 && (
                  <span className="px-1.5 py-0.5 bg-gray-50 text-gray-600 text-[10px] rounded border border-gray-200">
                    +{hashtags.length - 3}
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        {/* 分析データ（分析済みの場合のみ表示） */}
        {hasAnalytics && postAnalytics && post.postType !== "story" && (
          <div className="mb-2 pt-2 border-t border-gray-100">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="flex items-center justify-center mb-0.5">
                  <Heart size={12} className="text-red-500" />
                </div>
                <div className="text-xs font-bold text-gray-900">
                  {(postAnalytics.likes || 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-gray-500 leading-none mt-0.5">いいね</div>
              </div>
              <div>
                <div className="flex items-center justify-center mb-0.5">
                  <MessageCircle size={12} className="text-gray-600" />
                </div>
                <div className="text-xs font-bold text-gray-900">
                  {(postAnalytics.comments || 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-gray-500 leading-none mt-0.5">コメント</div>
              </div>
              <div>
                <div className="flex items-center justify-center mb-0.5">
                  <Eye size={12} className="text-gray-600" />
                </div>
                <div className="text-xs font-bold text-gray-900">
                  {(postAnalytics.reach || 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-gray-500 leading-none mt-0.5">リーチ</div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="flex items-center justify-center mb-0.5">
                  <Share size={12} className="text-gray-600" />
                </div>
                <div className="text-xs font-bold text-gray-900">
                  {(postAnalytics.shares || 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-gray-500 leading-none mt-0.5">シェア</div>
              </div>
              <div>
                <div className="flex items-center justify-center mb-0.5">
                  <Repeat2 size={12} className="text-gray-600" />
                </div>
                <div className="text-xs font-bold text-gray-900">
                  {(postAnalytics.reposts || 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-gray-500 leading-none mt-0.5">リポスト</div>
              </div>
              <div>
                <div className="flex items-center justify-center mb-0.5">
                  <Bookmark size={12} className="text-gray-600" />
                </div>
                <div className="text-xs font-bold text-gray-900">
                  {(postAnalytics.saves || 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-gray-500 leading-none mt-0.5">保存</div>
              </div>
            </div>
            {postAnalytics.followerIncrease !== undefined && postAnalytics.followerIncrease !== null && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-center gap-1">
                  <TrendingUp size={12} className="text-green-600" />
                  <span className="text-xs font-medium text-gray-600">フォロワー増加</span>
                </div>
                <div className="text-xs font-bold text-green-600 text-center mt-0.5">
                  {postAnalytics.followerIncrease > 0 ? "+" : ""}
                  {postAnalytics.followerIncrease.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* アクションボタン */}
        <div className="mt-auto pt-3 border-t border-gray-100">
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={handleCopyPostContent}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 hover:text-[#ff8a15] hover:bg-orange-50 hover:border-orange-200 transition-all focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:ring-offset-2"
              aria-label={`投稿「${post.title || "無題"}」の投稿文をコピー`}
            >
              <Copy size={12} />
              コピー
            </button>
            <a
              href={`/instagram/posts/${post.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 hover:text-[#ff8a15] hover:bg-orange-50 hover:border-orange-200 transition-all focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:ring-offset-2"
              aria-label={`投稿「${post.title || "無題"}」の詳細を表示`}
            >
              <Eye size={12} />
              詳細
            </a>
            {!hasAnalytics && post.postType !== "story" && (
              <a
                href={`${post.postType === "feed" ? "/analytics/feed" : "/instagram/analytics/reel"}?postId=${post.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 hover:text-[#ff8a15] hover:bg-orange-50 hover:border-orange-200 transition-all focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:ring-offset-2"
                aria-label={`投稿「${post.title || "無題"}」の分析を開始`}
              >
                <BarChart3 size={12} />
                分析
              </a>
            )}
            <button
              onClick={() => onDeletePost(post.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              aria-label={`投稿「${post.title || "無題"}」を削除`}
            >
              <Trash2 size={12} />
              削除
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default PostCard;
