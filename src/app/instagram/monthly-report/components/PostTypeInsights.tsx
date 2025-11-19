"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { AIAnalysisPostTypeHighlight } from "./AIPredictionAnalysis";

interface PostTypeInsightsProps {
  highlights: AIAnalysisPostTypeHighlight[];
  unifiedTotalPosts?: number;
}

const statusConfig = {
  strong: {
    icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    label: "好調",
  },
  neutral: {
    icon: <Minus className="w-5 h-5 text-gray-500" />,
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-600",
    label: "安定",
  },
  weak: {
    icon: <TrendingDown className="w-5 h-5 text-red-600" />,
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    label: "伸び悩み",
  },
} as const;

export const PostTypeInsights: React.FC<PostTypeInsightsProps> = ({ highlights, unifiedTotalPosts }) => {
  if (!highlights || highlights.length === 0) {
    // 投稿自体はあるが、タイプ別インサイトが抽出されなかった場合は非表示
    if ((unifiedTotalPosts ?? 0) > 0) {
      return null;
    }
    return (
      <div className="bg-white rounded-none shadow-sm border border-gray-200 p-6 mb-6 mt-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-black">投稿タイプ別インサイト</h2>
            <p className="text-sm text-gray-600">
              投稿タイプごとの反応傾向を把握し、次の打ち手を検討しましょう。
            </p>
          </div>
        </div>
        <div className="border border-dashed border-gray-300 rounded-none p-6 text-center text-gray-500 text-sm">
          投稿データが不足しているため、インサイトを生成できませんでした。
          少なくとも1件以上の投稿がある期間で再度ご確認ください。
        </div>
      </div>
    );
  }

  const sortedHighlights = [...highlights].sort((a, b) => {
    const order: Record<AIAnalysisPostTypeHighlight["status"], number> = {
      strong: 0,
      neutral: 1,
      weak: 2,
    };
    if (order[a.status] === order[b.status]) {
      return b.percentage - a.percentage;
    }
    return order[a.status] - order[b.status];
  });

  return (
    <div className="bg-white rounded-none shadow-sm border border-gray-200 p-6 mb-6 mt-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-black">投稿タイプ別インサイト</h2>
          <p className="text-sm text-gray-600">
            投稿タイプごとの反応傾向を把握し、次の打ち手を検討しましょう。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sortedHighlights.map((highlight) => {
          const config = statusConfig[highlight.status];
          return (
            <div
              key={highlight.id}
              className={`rounded-none border ${config.border} ${config.bg} p-4 flex flex-col space-y-2`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center space-x-2 text-sm font-semibold text-gray-700">
                  {config.icon}
                  <span
                    dangerouslySetInnerHTML={{
                      __html: String(highlight.label || ""),
                    }}
                  />
                </span>
                <span className="text-xs text-gray-500">{config.label}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span
                  className="text-base font-semibold text-black"
                  dangerouslySetInnerHTML={{
                    __html: String(highlight.label || ""),
                  }}
                />
                <span className={`${config.text} text-sm`}>
                  {highlight.percentage}% ({highlight.count}件)
                </span>
              </div>
              <p
                className={`text-sm ${config.text}`}
                dangerouslySetInnerHTML={{
                  __html: String(highlight.message || ""),
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

