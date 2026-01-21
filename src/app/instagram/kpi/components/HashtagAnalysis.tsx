"use client";

import React from "react";
import { Hash, Loader2 } from "lucide-react";

interface HashtagAnalysisProps {
  hashtagStats: Array<{ hashtag: string; count: number }>;
  isLoading?: boolean;
}

export const HashtagAnalysis: React.FC<HashtagAnalysisProps> = ({
  hashtagStats,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 p-4">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-[#FF8A15] mr-2" />
          <span className="text-sm text-gray-700">読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 p-6 mb-6">
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 bg-[#ff8a15] flex items-center justify-center mr-3 flex-shrink-0">
          <Hash className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">ハッシュタグ分析</h2>
          <p className="text-sm text-gray-700 mt-0.5">
            効果的なハッシュタグの分析
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        {hashtagStats.length > 0 ? (
          <div className="space-y-2">
            {hashtagStats.map((item, index) => {
              // ハッシュタグから先頭の#を全て削除してから表示時に#を追加
              const cleanHashtag = item.hashtag.replace(/^#+/, "").trim();
              return (
                <div
                  key={item.hashtag}
                  className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200"
                >
                  <div className="flex items-center">
                    <span className="w-6 h-6 bg-gray-100 text-gray-700 flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-700">#{cleanHashtag}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{item.count}回</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 flex items-center justify-center">
              <Hash className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">ハッシュタグを追加してみよう！</p>
            <p className="text-xs text-gray-600">
              投稿にハッシュタグを付けると
              <br />
              人気ハッシュタグ分析が表示されます
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

