"use client";

import React, { useMemo } from "react";
import { Hash, Loader2 } from "lucide-react";

interface HashtagAnalysisProps {
  hashtagStats: Array<{ hashtag: string; count: number }>;
  isLoading?: boolean;
}

export const HashtagAnalysis: React.FC<HashtagAnalysisProps> = ({
  hashtagStats,
  isLoading,
}) => {
  // 総使用回数を計算
  const totalCount = useMemo(() => {
    return hashtagStats.reduce((sum, item) => sum + item.count, 0);
  }, [hashtagStats]);

  // 最大使用回数を取得（バーの幅計算用）
  const maxCount = useMemo(() => {
    if (hashtagStats.length === 0) return 1;
    return Math.max(...hashtagStats.map((item) => item.count));
  }, [hashtagStats]);

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-[#FF8A15] mr-2" />
          <span className="text-sm text-gray-700">読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-[#ff8a15] flex items-center justify-center mr-3 flex-shrink-0 rounded-lg">
            <Hash className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">ハッシュタグ分析</h2>
            <p className="text-sm text-gray-600 mt-0.5">
              使用頻度の高いハッシュタグ
            </p>
          </div>
        </div>
        {totalCount > 0 && (
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-1">総使用回数</div>
            <div className="text-xl font-bold text-gray-900">{totalCount.toLocaleString()}回</div>
          </div>
        )}
      </div>

      <div className="mt-4">
        {hashtagStats.length > 0 ? (
          <div className="space-y-3">
            {hashtagStats.slice(0, 10).map((item, index) => {
              // ハッシュタグから先頭の#を全て削除してから表示時に#を追加
              const cleanHashtag = item.hashtag.replace(/^#+/, "").trim();
              const percentage = totalCount > 0 ? (item.count / totalCount) * 100 : 0;
              const barWidth = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              
              // トップ3には特別なスタイル
              const isTop3 = index < 3;
              
              return (
                <div
                  key={item.hashtag}
                  className="relative"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center flex-1 min-w-0">
                      {isTop3 && (
                        <div className="w-5 h-5 bg-[#FF8A15] text-white flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0 rounded">
                          {index + 1}
                        </div>
                      )}
                      {!isTop3 && (
                        <div className="w-5 h-5 bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0 rounded">
                          {index + 1}
                        </div>
                      )}
                      <span className={`text-sm font-medium ${isTop3 ? 'text-gray-900' : 'text-gray-700'} truncate`}>
                        #{cleanHashtag}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                      <span className="text-xs text-gray-500">{percentage.toFixed(1)}%</span>
                      <span className="text-sm font-semibold text-gray-900 min-w-[60px] text-right">
                        {item.count.toLocaleString()}回
                      </span>
                    </div>
                  </div>
                  {/* バーグラフ */}
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isTop3
                          ? 'bg-gradient-to-r from-[#FF8A15] to-[#FFA64D]'
                          : 'bg-gradient-to-r from-gray-300 to-gray-400'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {hashtagStats.length > 10 && (
              <div className="pt-2 text-center text-xs text-gray-500">
                他 {hashtagStats.length - 10} 件のハッシュタグ
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Hash className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">ハッシュタグデータがありません</p>
            <p className="text-xs text-gray-600">
              投稿にハッシュタグを付けると
              <br />
              使用頻度の高いハッシュタグが表示されます
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

