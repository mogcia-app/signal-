"use client";

import React from "react";

interface PostEditorContentInputProps {
  title: string;
  onTitleChange?: (title: string) => void;
  content: string;
  onContentChange: (content: string) => void;
  postType?: "feed" | "reel" | "story";
}

export const PostEditorContentInput: React.FC<PostEditorContentInputProps> = ({
  title,
  onTitleChange,
  content,
  onContentChange,
  postType = "feed",
}) => {
  const postTypeLabel = postType === "reel" ? "リール" : postType === "story" ? "ストーリーズ" : "フィード";

  return (
    <>
      {/* タイトル入力 */}
      {onTitleChange && (
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-800 mb-3">タイトル</label>
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder={`${postTypeLabel}のタイトルを入力してください...`}
            className="w-full px-4 py-3 border-2 border-gray-200 focus:outline-none focus:border-[#ff8a15] transition-all duration-200 bg-white/80"
          />
        </div>
      )}

      {/* 投稿文入力エリア */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-800 mb-3">投稿文</label>
        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder={`${postTypeLabel}の投稿文を入力してください...`}
            className="w-full h-32 p-4 border-2 border-gray-200 resize-none focus:outline-none focus:border-[#ff8a15] transition-all duration-200 bg-white/80 backdrop-blur-sm"
            style={{ fontFamily: "inherit" }}
          />
        </div>
      </div>
    </>
  );
};

