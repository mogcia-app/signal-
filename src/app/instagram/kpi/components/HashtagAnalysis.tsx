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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-2" />
          <span className="text-sm text-gray-700">読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4">
      <div className="flex items-center mb-4">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0 shadow-sm">
          <Hash className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">ハッシュタグ分析</h2>
          <p className="text-xs text-gray-600 mt-0.5">
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
                  className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold mr-2 sm:mr-3 flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-gray-700">#{cleanHashtag}</span>
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-gray-900">{item.count}回</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
              <Hash className="w-6 h-6 text-blue-600" />
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

