"use client";

import React from "react";
import { Clock, TrendingUp, Loader2 } from "lucide-react";
import type { TimeSlotEntry } from "@/app/api/analytics/kpi-breakdown/route";

interface TimeSlotAnalysisProps {
  timeSlotData: TimeSlotEntry[];
  isLoading?: boolean;
}

export const TimeSlotAnalysis: React.FC<TimeSlotAnalysisProps> = ({
  timeSlotData,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-[#FF8A15] mr-2" />
          <span className="text-sm text-gray-700">読み込み中...</span>
        </div>
      </div>
    );
  }

  const bestTimeSlot = timeSlotData.reduce((best, current) => {
    if (current.postsInRange > 0 && current.avgEngagement > best.avgEngagement) {
      return current;
    }
    return best;
  }, timeSlotData[0] || { postsInRange: 0, avgEngagement: 0 });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4">
      <div className="flex items-center mb-4">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0 shadow-sm">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">投稿時間分析</h2>
          <p className="text-xs text-gray-600 mt-0.5">
            投稿分析ページで入力した実際の投稿時間ベースの分析
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        {/* 最適な投稿時間の提案 */}
        {bestTimeSlot && bestTimeSlot.postsInRange > 0 && (
          <div className="p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 mb-4">
            <div className="flex items-center mb-2">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <h4 className="text-sm font-semibold text-green-900">おすすめ投稿時間</h4>
            </div>
            <p className="text-xs sm:text-sm text-green-800">
              <span className="font-medium">{bestTimeSlot.label}</span>
              が最もエンゲージメントが高い時間帯です。平均{" "}
              <span className="font-bold">{Math.round(bestTimeSlot.avgEngagement)}</span>{" "}
              エンゲージを記録しています。
            </p>
          </div>
        )}

        {/* 時間帯別データ */}
        <div className="space-y-2">
          {timeSlotData.map(({ label, color, postsInRange, avgEngagement }) => (
            <div
              key={label}
              className={`p-2 sm:p-3 rounded-lg ${postsInRange > 0 ? "bg-gray-50" : "bg-gray-25"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm font-medium text-gray-700">{label}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs sm:text-sm font-bold text-gray-900">{postsInRange}件</span>
                </div>
              </div>
              {postsInRange > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(100, postsInRange * 20)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-900">
                      平均 {Math.round(avgEngagement)} エンゲージ
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2">
                  <div className="text-xs text-gray-500 italic">📅 この時間帯はまだ投稿なし</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

