"use client";

import React, { useEffect, useState } from "react";
import { Lightbulb, ArrowUpRight, CheckCircle2, Loader2 } from "lucide-react";
import { AIAnalysisActionPlan } from "./AIPredictionAnalysis";

interface ActionPlanRecommendationsProps {
  actionPlans: AIAnalysisActionPlan[] | null;
  isLoading: boolean;
  hasRequested: boolean;
}

const priorityStyles: Record<
  AIAnalysisActionPlan["priority"],
  { badge: string; text: string; label: string }
> = {
  high: {
    badge: "bg-red-100 text-red-700 border border-red-200",
    text: "text-red-700",
    label: "優先度: 高",
  },
  medium: {
    badge: "bg-yellow-100 text-yellow-700 border border-yellow-200",
    text: "text-yellow-700",
    label: "優先度: 中",
  },
  low: {
    badge: "bg-blue-100 text-blue-700 border border-blue-200",
    text: "text-blue-700",
    label: "優先度: 低",
  },
};

export const ActionPlanRecommendations: React.FC<ActionPlanRecommendationsProps> = ({
  actionPlans,
  isLoading,
  hasRequested,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setIsExpanded(false);
    }
  }, [isLoading]);

  if (!hasRequested && !isLoading) {
    return (
      <div className="bg-white rounded-none shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-semibold text-black">次のアクションプラン</h2>
            <p className="text-sm text-gray-600">
              「AI分析を実行」ボタンを押すと、ここに優先度付きのアクションプランが表示されます。
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-none shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-black">次のアクションプラン</h2>
            <p className="text-sm text-gray-600">AIが最新の分析結果から提案を生成しています。</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-10 text-slate-600">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-sm">AIがアクションプランを作成中です...</span>
        </div>
      </div>
    );
  }

  if (!actionPlans || actionPlans.length === 0) {
    return (
      <div className="bg-white rounded-none shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-semibold text-black">次のアクションプラン</h2>
            <p className="text-sm text-gray-600">
              アクションプランを生成できませんでした。再度AI分析を実行してみてください。
            </p>
          </div>
        </div>
      </div>
    );
  }

  const sortedPlans = [...actionPlans].sort((a, b) => {
    const order: Record<AIAnalysisActionPlan["priority"], number> = {
      high: 0,
      medium: 1,
      low: 2,
    };
    if (order[a.priority] === order[b.priority]) {
      return a.focusArea.localeCompare(b.focusArea);
    }
    return order[a.priority] - order[b.priority];
  });

  return (
    <div className="bg-white rounded-none shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-black">次のアクションプラン</h2>
          <p className="text-sm text-gray-600">
            AIが全体の分析結果を踏まえ、優先度順に推奨アクションを整理しました。
          </p>
        </div>
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 rounded-none transition-colors"
        >
          {isExpanded ? "閉じる" : "AI推奨アクションを見る"}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {sortedPlans.map((plan) => {
            const style = priorityStyles[plan.priority];
            return (
              <div key={plan.id} className="border border-gray-200 rounded-none p-5 bg-gray-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Lightbulb className="w-5 h-5 text-orange-500" />
                    <div>
                      <div className="text-sm font-semibold text-gray-800">
                        {String(plan.title || "")
                          .replace(/<[^>]*>/g, "")
                          .replace(/&lt;/g, "<")
                          .replace(/&gt;/g, ">")
                          .replace(/&amp;/g, "&")}
                      </div>
                      <div
                        className="text-xs text-gray-500"
                        dangerouslySetInnerHTML={{
                          __html: String(plan.focusArea || ""),
                        }}
                      />
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-none ${style.badge}`}>
                    {style.label}
                  </span>
                </div>

                <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
                  {String(plan.description || "")
                    .replace(/<[^>]*>/g, "")
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">")
                    .replace(/&amp;/g, "&")}
                </p>

                <div className="flex items-center space-x-2 mb-3">
                  <ArrowUpRight className={`w-4 h-4 ${style.text}`} />
                  <span
                    className={`text-xs font-medium ${style.text}`}
                    dangerouslySetInnerHTML={{
                      __html: String(plan.expectedImpact || ""),
                    }}
                  />
                </div>

                <div className="border border-dashed border-gray-300 rounded-none p-3 bg-white">
                  <p className="text-xs text-gray-500 mb-2">推奨アクション</p>
                  <ul className="space-y-2">
                    {plan.recommendedActions.map((action, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm text-gray-700">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                        <span>
                          {String(action || "")
                            .replace(/<[^>]*>/g, "")
                            .replace(/&lt;/g, "<")
                            .replace(/&gt;/g, ">")
                            .replace(/&amp;/g, "&")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

