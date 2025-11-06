"use client";

import React from "react";
import Image from "next/image";
import { FileText, Video, Camera, Bookmark, Hash, Calendar } from "lucide-react";
import { Post } from "./types";

interface PostPreviewProps {
  selectedPost: Post | null;
  inputData: {
    title: string;
    content: string;
    hashtags: string;
    category: "reel" | "feed" | "story";
    thumbnail: string;
    publishedAt: string;
    publishedTime: string;
  };
}

const PostPreview: React.FC<PostPreviewProps> = ({ selectedPost, inputData }) => {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "reel":
        return <Video className="w-4 h-4" />;
      case "feed":
        return <FileText className="w-4 h-4" />;
      case "story":
        return <Camera className="w-4 h-4" />;
      default:
        return <Bookmark className="w-4 h-4" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "reel":
        return "リール";
      case "feed":
        return "フィード";
      case "story":
        return "ストーリー";
      default:
        return "その他";
    }
  };

  // 表示するデータを決定（選択された投稿または手動入力データ）
  const displayData = selectedPost
    ? {
        title: selectedPost.title,
        content: selectedPost.content,
        hashtags: selectedPost.hashtags,
        category: selectedPost.category,
        thumbnail: selectedPost.thumbnail,
        publishedAt: selectedPost.publishedAt,
      }
    : {
        title: inputData.title,
        content: inputData.content,
        hashtags: inputData.hashtags ? inputData.hashtags.split(",").map((tag) => tag.trim()) : [],
        category: inputData.category,
        thumbnail: inputData.thumbnail,
        publishedAt: inputData.publishedAt ? new Date(inputData.publishedAt) : null,
      };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-4">
        <div className="w-8 h-8 bg-gradient-to-r from-[#ff8a15] to-orange-600 rounded-lg flex items-center justify-center mr-3">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-black">投稿プレビュー</h2>
          <p className="text-sm text-black">選択された投稿または入力された投稿情報</p>
        </div>
      </div>

      {displayData.title || displayData.content || displayData.thumbnail ? (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-start space-x-4">
            {/* サムネイル */}
            <div className="flex-shrink-0">
              {displayData.thumbnail ? (
                // Base64画像の場合は通常のimgタグを使用
                displayData.thumbnail.startsWith("data:image/") ? (
                  <Image
                    src={displayData.thumbnail}
                    alt={displayData.title || "投稿画像"}
                    width={80}
                    height={80}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                ) : (
                  <Image
                    src={displayData.thumbnail}
                    alt={displayData.title || "投稿画像"}
                    width={80}
                    height={80}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                )
              ) : (
                <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                  {getCategoryIcon(displayData.category)}
                </div>
              )}
            </div>

            {/* 投稿情報 */}
            <div className="flex-grow min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-lg font-semibold text-black truncate">
                  {displayData.title || "無題の投稿"}
                </h3>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  {getCategoryLabel(displayData.category)}
                </span>
              </div>

              {displayData.content && (
                <p className="text-sm text-black mb-3 line-clamp-3">{displayData.content}</p>
              )}

              {displayData.hashtags && displayData.hashtags.length > 0 && (
                <div className="flex items-center space-x-2 mb-3">
                  <Hash className="w-3 h-3 text-black" />
                  <div className="flex flex-wrap gap-1">
                    {displayData.hashtags.slice(0, 5).map((tag, index) => (
                      <span
                        key={index}
                        className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                    {displayData.hashtags.length > 5 && (
                      <span className="text-xs text-black">+{displayData.hashtags.length - 5}</span>
                    )}
                  </div>
                </div>
              )}

              {displayData.publishedAt && (
                <div className="flex items-center space-x-1 text-xs text-black">
                  <Calendar className="w-3 h-3" />
                  <span>{displayData.publishedAt.toLocaleDateString("ja-JP")}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-black mx-auto mb-4" />
          <p className="text-black">投稿を選択するか手動で入力してください</p>
          <p className="text-sm text-black">
            左側の検索バーから投稿を検索するか、手動入力フォームに記入してください
          </p>
        </div>
      )}
    </div>
  );
};

export default PostPreview;
