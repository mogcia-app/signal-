"use client";

import React, { useCallback, useEffect, useState } from "react";
import { addHashtag } from "../../../../utils/post-editor-utils";

interface PostEditorHashtagsProps {
  hashtags: string[];
  onHashtagsChange: (hashtags: string[]) => void;
  postType?: "feed" | "reel" | "story";
}

export const PostEditorHashtags: React.FC<PostEditorHashtagsProps> = ({
  hashtags,
  onHashtagsChange,
  postType = "feed",
}) => {
  const [maxHashtags, setMaxHashtags] = useState(postType === "feed" || postType === "reel" ? 5 : Infinity);

  // バリデーションルールをバックエンドから取得
  useEffect(() => {
    const fetchValidationRules = async () => {
      try {
        const { authFetch } = await import("../../../../utils/authFetch");
        const response = await authFetch(`/api/post-editor/validation?postType=${postType}`);
        if (response.ok) {
          const data = await response.json();
          if (data.limits?.maxHashtags !== undefined) {
            setMaxHashtags(data.limits.maxHashtags);
          }
        }
      } catch (error) {
        console.error("バリデーションルール取得エラー:", error);
      }
    };
    fetchValidationRules();
  }, [postType]);

  const handleHashtagRemove = useCallback(
    (index: number) => {
      onHashtagsChange(hashtags.filter((_, i) => i !== index));
    },
    [hashtags, onHashtagsChange]
  );

  const handleHashtagAdd = useCallback(
    (hashtag: string) => {
      const normalized = hashtag.trim().replace(/^#+/, "");
      if (!normalized) {
        return;
      }

      const newHashtags = addHashtag(hashtags, normalized, maxHashtags);
      if (newHashtags) {
        onHashtagsChange(newHashtags);
      }
    },
    [hashtags, onHashtagsChange, maxHashtags]
  );

  return (
    <div className="mb-6">
      <label className="block text-sm font-semibold text-gray-800 mb-3">ハッシュタグ</label>
      <div className="flex flex-wrap gap-2 mb-3">
        {hashtags.map((hashtag, index) => (
          <span
            key={index}
            className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 text-sm border border-orange-200"
          >
            <span className="text-orange-600 mr-1">#</span>
            {hashtag.replace(/^#+/, "")}
            <button
              onClick={() => handleHashtagRemove(index)}
              className="ml-2 text-orange-600 hover:text-orange-800 hover:bg-orange-200 w-4 h-4 flex items-center justify-center transition-colors"
              aria-label="ハッシュタグを削除"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex space-x-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder={
              postType === "feed" || postType === "reel"
                ? "ハッシュタグを入力...（最大5個）"
                : "ハッシュタグを入力..."
            }
            className="w-full px-4 py-3 border-2 border-gray-200 focus:outline-none focus:border-[#ff8a15] transition-all duration-200 bg-white/80"
            disabled={postType === "feed" || postType === "reel" ? hashtags.length >= 5 : false}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                const hashtag = e.currentTarget.value.trim().replace("#", "");
                if (hashtag) {
                  handleHashtagAdd(hashtag);
                  e.currentTarget.value = "";
                }
              }
            }}
          />
          {(postType === "feed" || postType === "reel") && hashtags.length >= 5 && (
            <p className="text-xs text-gray-500 mt-1">ハッシュタグは最大5個までです</p>
          )}
        </div>
        <button
          onClick={() => {
            const input = document.querySelector(
              'input[placeholder*="ハッシュタグを入力"]'
            ) as HTMLInputElement;
            const hashtag = input?.value.trim().replace("#", "");
            if (hashtag) {
              handleHashtagAdd(hashtag);
              if (input) {
                input.value = "";
              }
            }
          }}
          className="px-4 py-2 bg-gradient-to-r from-[#ff8a15] to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          追加
        </button>
      </div>
    </div>
  );
};

