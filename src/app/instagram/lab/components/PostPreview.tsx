"use client";

import React from "react";
import Image from "next/image";

interface PostPreviewProps {
  title?: string;
  content: string;
  image?: string | null;
  hashtags: string[];
  postType: "feed" | "reel" | "story";
  scheduledDate?: string;
  scheduledTime?: string;
}

export const PostPreview: React.FC<PostPreviewProps> = ({
  title,
  content,
  image,
  hashtags,
  postType,
  scheduledDate,
  scheduledTime,
}) => {

  return (
    <div className="bg-white border border-gray-200 flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
          プレビュー
        </h3>
      </div>

      <div className="p-6 flex-1 flex flex-col min-h-0 overflow-auto">
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 border-2 border-gray-100">
          {/* 投稿情報ヘッダー */}
          <div className="mb-4 pb-3 border-b border-gray-200">
            <div className="flex items-center justify-between text-xs text-black">
              <div className="flex items-center space-x-3">
                <span className="font-medium">
                  {postType === "feed"
                    ? "📸 フィード"
                    : postType === "reel"
                      ? "🎬 リール"
                      : "📱 ストーリーズ"}
                </span>
                {scheduledDate && scheduledTime && (
                  <span className="text-black">
                    📅 {new Date(scheduledDate).toLocaleDateString("ja-JP")} {scheduledTime}
                  </span>
                )}
              </div>
              <div className="text-black">
                {scheduledDate
                  ? new Date(scheduledDate).toLocaleDateString("ja-JP")
                  : new Date().toLocaleDateString("ja-JP")}
              </div>
            </div>
          </div>

          {/* 投稿内容 */}
          {title && (
            <div className="text-lg font-semibold text-black mb-3">
              {title
                .replace(/^[\s#-]+|[\s#-]+$/g, "")
                .replace(/^#+/g, "")
                .trim()}
            </div>
          )}

          {/* 画像プレビュー */}
          {image && (
            <div className="mb-3">
              <Image
                src={image}
                alt="投稿画像"
                width={400}
                height={192}
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
          )}

          {content ? (
            <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {content
                .replace(/^[\s#-]+|[\s#-]+$/g, "")
                .replace(/^#+/g, "")
                .trim()}
            </div>
          ) : (
            <div className="text-black italic text-center py-4">
              📝 投稿文を入力するとプレビューが表示されます
            </div>
          )}
          {hashtags.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="text-sm text-orange-600 flex flex-wrap gap-1">
                {hashtags
                  .map((hashtag) => {
                    // ハッシュタグから先頭の#を全て削除してから表示時に#を追加
                    const cleanHashtag = hashtag.replace(/^#+/, "").trim();
                    return `#${cleanHashtag}`;
                  })
                  .join(" ")}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostPreview;

