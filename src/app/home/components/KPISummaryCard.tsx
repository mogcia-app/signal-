"use client";

import React from "react";
import Link from "next/link";
import { BarChart3, TrendingUp, TrendingDown, ArrowRight, Loader2 } from "lucide-react";

interface KPISummaryCardProps {
  breakdowns: Array<{
    key: string;
    label: string;
    value: number;
    changePct?: number;
    segments?: Array<{
      label: string;
      value: number;
      delta?: number;
    }>;
  }>;
  isLoading?: boolean;
}

export const KPISummaryCard: React.FC<KPISummaryCardProps> = ({
  breakdowns,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
          <span className="text-sm text-gray-500">読み込み中...</span>
        </div>
      </div>
    );
  }

  // 主要KPIを抽出
  const reachKPI = breakdowns.find((kpi) => kpi.key === "reach");
  const engagementKPI = breakdowns.find((kpi) => kpi.key === "engagement");

  // いいね数をエンゲージメントのセグメントから取得
  const likesSegment = engagementKPI?.segments?.find((seg) => seg.label === "いいね");
  const likesValue = likesSegment?.value || 0;
  const likesChangePct = engagementKPI?.changePct;

  // エンゲージメント率を計算（リーチ数に対するエンゲージメントの割合）
  const engagementRate =
    reachKPI && reachKPI.value > 0 && engagementKPI
      ? ((engagementKPI.value / reachKPI.value) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center border border-orange-100">
            <BarChart3 className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">今月のKPIサマリー</h2>
            <p className="text-xs text-gray-500 mt-0.5">主要指標の今月の実績</p>
          </div>
        </div>
        <Link
          href="/instagram/kpi"
          className="text-xs text-gray-600 hover:text-orange-600 font-medium flex items-center gap-1 transition-colors"
        >
          詳細を見る
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* リーチ数 */}
        {reachKPI && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">リーチ数</span>
              {reachKPI.changePct !== undefined && (
                <div
                  className={`flex items-center gap-1 text-xs font-semibold ${
                    reachKPI.changePct >= 0 ? "text-orange-600" : "text-red-500"
                  }`}
                >
                  {reachKPI.changePct >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {reachKPI.changePct > 0 ? "+" : ""}
                  {reachKPI.changePct.toFixed(1)}%
                </div>
              )}
            </div>
            <p className="text-xl font-bold text-gray-900">
              {reachKPI.value.toLocaleString()}
            </p>
          </div>
        )}

        {/* いいね数 */}
        {engagementKPI && (
          <div className="bg-pink-50 border border-pink-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">いいね数</span>
              {likesChangePct !== undefined && (
                <div
                  className={`flex items-center gap-1 text-xs font-semibold ${
                    likesChangePct >= 0 ? "text-orange-600" : "text-red-500"
                  }`}
                >
                  {likesChangePct >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {likesChangePct > 0 ? "+" : ""}
                  {likesChangePct.toFixed(1)}%
                </div>
              )}
            </div>
            <p className="text-xl font-bold text-gray-900">
              {likesValue.toLocaleString()}
            </p>
          </div>
        )}

        {/* エンゲージメント率 */}
        {engagementKPI && reachKPI && (
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">エンゲージメント率</span>
              {engagementKPI.changePct !== undefined && (
                <div
                  className={`flex items-center gap-1 text-xs font-semibold ${
                    engagementKPI.changePct >= 0 ? "text-orange-600" : "text-red-500"
                  }`}
                >
                  {engagementKPI.changePct >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {engagementKPI.changePct > 0 ? "+" : ""}
                  {engagementKPI.changePct.toFixed(1)}%
                </div>
              )}
            </div>
            <p className="text-xl font-bold text-gray-900">{engagementRate}%</p>
          </div>
        )}
      </div>
    </div>
  );
};

