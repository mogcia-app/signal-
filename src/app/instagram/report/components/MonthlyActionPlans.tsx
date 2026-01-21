"use client";

import React, { useState, useEffect } from "react";
import { Lightbulb, ArrowRight, RefreshCw } from "lucide-react";

// マークダウン記法を削除する関数
const removeMarkdown = (text: string): string => {
  if (!text) return text;
  return text
    .replace(/\*\*/g, "") // **太字**
    .replace(/\*/g, "") // *斜体*
    .replace(/__/g, "") // __太字__
    .replace(/_/g, "") // _斜体_
    .replace(/#{1,6}\s/g, "") // # 見出し
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // [リンクテキスト](URL)
    .replace(/`([^`]+)`/g, "$1") // `コード`
    .replace(/~~/g, "") // ~~取り消し線~~
    .trim();
};

interface MonthlyActionPlansProps {
  selectedMonth: string;
  kpis?: {
    totalLikes: number;
    totalReach: number;
    totalSaves: number;
    totalComments: number;
    totalFollowerIncrease: number;
  } | null;
  reportData?: any;
  onRegenerate?: () => void;
}

interface ActionPlan {
  title: string;
  description: string;
  action: string;
}

export const MonthlyActionPlans: React.FC<MonthlyActionPlansProps> = ({ selectedMonth, kpis, reportData, onRegenerate }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // reportDataからアクションプランを取得
  const actionPlans: ActionPlan[] = reportData?.monthlyReview?.actionPlans || [];

  // データがある場合は自動的に展開
  useEffect(() => {
    if (actionPlans.length > 0) {
      setIsExpanded(true);
    }
  }, [actionPlans.length]);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleRegenerate = () => {
    if (onRegenerate) {
      onRegenerate();
    }
  };

  return (
    <div className="bg-white border border-gray-200 p-3 sm:p-4 mb-4">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#ff8a15] flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
            <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">次のアクションプラン</h2>
            <p className="text-xs text-gray-600 mt-0.5">
              AIが生成した来月に向けた具体的なアクションプラン
            </p>
          </div>
        </div>

        {actionPlans.length > 0 && (
          <button
            onClick={handleToggle}
            className="flex items-center justify-center space-x-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all border border-gray-300"
          >
            {isExpanded ? (
              <span className="hidden sm:inline text-xs">閉じる</span>
            ) : (
              <span className="hidden sm:inline text-xs">開く</span>
            )}
          </button>
        )}
      </div>

      {/* コンテンツ */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 animate-in fade-in duration-300">
          {actionPlans.length > 0 ? (
            <>
              <div className="space-y-2">
                {actionPlans.map((plan, index) => (
                    <div
                      key={index}
                      className="bg-white p-3 sm:p-4 border border-gray-200"
                    >
                      <h3 className="text-sm font-semibold text-gray-900 mb-1.5">
                        {index + 1}. {removeMarkdown(plan.title)}
                      </h3>
                      {plan.description && (
                        <p className="text-xs text-gray-700 mb-2 leading-relaxed">{removeMarkdown(plan.description)}</p>
                      )}
                      {plan.action && (
                        <div className="flex items-start gap-2 mt-2 pt-2 border-t border-orange-200">
                          <ArrowRight className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs font-medium text-gray-900">{removeMarkdown(plan.action)}</p>
                        </div>
                      )}
                    </div>
                ))}
              </div>

              {/* 再提案するボタン */}
              <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={handleRegenerate}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors border border-gray-300"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>再提案する</span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <p className="text-xs">アクションプランがありません</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

