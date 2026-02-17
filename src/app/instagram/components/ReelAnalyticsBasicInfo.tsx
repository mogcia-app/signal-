"use client";

import React from "react";
import { InputData } from "./types";

interface ReelAnalyticsBasicInfoProps {
  data: InputData;
  onInputChange: (field: keyof InputData, value: string) => void;
  postData?: {
    id: string;
    title: string;
    content: string;
    hashtags: string[];
    postType: "feed" | "reel" | "story";
  } | null;
}

export const ReelAnalyticsBasicInfo: React.FC<ReelAnalyticsBasicInfoProps> = ({
  data,
  onInputChange,
  postData,
}) => {
  return (
    <div className="space-y-4">
        {postData ? (
          /* 投稿データがある場合：表示のみ */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">タイトル</label>
              <div className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-800">
                {postData.title || "タイトルなし"}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">内容</label>
              <div className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-800 min-h-[80px] whitespace-pre-wrap">
                {postData.content || "内容なし"}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ハッシュタグ</label>
              <div className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-800">
                {postData.hashtags && postData.hashtags.length > 0
                  ? postData.hashtags.join(" ")
                  : "ハッシュタグなし"}
              </div>
            </div>
          </div>
        ) : (
          /* 投稿データがない場合：手動入力 */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">タイトル</label>
              <input
                type="text"
                value={data.title}
                onChange={(e) => onInputChange("title", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white"
                placeholder="リール投稿のタイトルを入力"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">内容</label>
              <textarea
                value={data.content}
                onChange={(e) => onInputChange("content", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white"
                rows={3}
                placeholder="リール投稿の内容を入力"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">ハッシュタグ</label>
              <input
                type="text"
                value={data.hashtags}
                onChange={(e) => onInputChange("hashtags", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white"
                placeholder="#hashtag1 #hashtag2"
              />
            </div>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">カテゴリ</label>
          <select
            value={data.category}
            onChange={(e) =>
              onInputChange("category", e.target.value as "reel" | "feed" | "story")
            }
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white"
          >
            <option value="reel">リール</option>
            <option value="feed">フィード</option>
            <option value="story">ストーリー</option>
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">投稿日</label>
            <input
              type="date"
              value={data.publishedAt}
              onChange={(e) => onInputChange("publishedAt", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">投稿時間</label>
            <input
              type="time"
              value={data.publishedTime}
              onChange={(e) => onInputChange("publishedTime", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>
      </div>
  );
};
