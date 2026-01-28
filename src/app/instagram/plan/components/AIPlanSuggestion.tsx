"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Calendar, FileText, CheckCircle } from "lucide-react";
import { PlanFormData, SimulationResult, AIPlanSuggestion as AIPlanSuggestionType } from "../types/plan";
import { authFetch } from "../../../../utils/authFetch";

interface AIPlanSuggestionProps {
  formData: PlanFormData;
  simulationResult: SimulationResult;
  suggestion?: AIPlanSuggestionType | null; // 親から渡されたAI提案（オプション）
  isLoading?: boolean;
  showWeeklyTasksOnly?: boolean; // 今週やることのみ表示
  showWeeklyPlans?: boolean; // 週ごとの詳細計画のみ表示
  onStartPlan?: (suggestion: AIPlanSuggestionType) => void; // この計画で始めるボタンのハンドラー
}

export const AIPlanSuggestion: React.FC<AIPlanSuggestionProps> = ({
  formData,
  simulationResult,
  suggestion: externalSuggestion,
  isLoading: externalLoading,
  showWeeklyTasksOnly = false,
  showWeeklyPlans = false,
  onStartPlan,
}) => {
  const [suggestion, setSuggestion] = useState<AIPlanSuggestionType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 外部から渡された提案を使用
  useEffect(() => {
    if (externalSuggestion) {
      setSuggestion(externalSuggestion);
      setIsLoading(false);
      return;
    }
  }, [externalSuggestion]);

  useEffect(() => {
    // 外部から渡された提案がある場合は取得をスキップ
    if (externalSuggestion) {
      return;
    }

    const fetchSuggestion = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await authFetch("/api/instagram/plan-suggestion", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            formData,
            simulationResult,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
          throw new Error(errorMessage);
        }

        const data = await response.json();
        if (!data.suggestion) {
          throw new Error("AI提案データが取得できませんでした");
        }
        setSuggestion(data.suggestion);
      } catch (err) {
        console.error("AI提案取得エラー:", err);
        const errorMessage = err instanceof Error ? err.message : "AI提案の取得に失敗しました";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (formData && simulationResult && !externalLoading) {
      fetchSuggestion();
    }
  }, [formData, simulationResult, externalLoading, externalSuggestion]);

  // 使用する提案（外部から渡されたものか、内部で取得したものか）
  const currentSuggestion = externalSuggestion || suggestion;

  if (isLoading || externalLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-[#FF8A15] animate-spin mr-2" />
          <span className="text-sm text-gray-600">AIが提案を生成中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="text-sm text-red-600">{error}</div>
      </div>
    );
  }

  if (!currentSuggestion) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
      {/* 最適な投稿時間（AIに任せる場合） */}
      {currentSuggestion.recommendedPostingTimes && currentSuggestion.recommendedPostingTimes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-[#FF8A15]" />
            <h3 className="text-base font-semibold text-gray-900">最適な投稿時間</h3>
          </div>
          <div className="space-y-2">
            {currentSuggestion.recommendedPostingTimes.map((timeRec, index) => {
              const typeLabels = {
                feed: "写真",
                reel: "リール",
                story: "ストーリー",
              };
              return (
                <div key={index} className="text-sm text-gray-700">
                  <span className="font-medium text-gray-900">{typeLabels[timeRec.type]}:</span>{" "}
                  <span className="text-gray-600">{timeRec.times.join("、")}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        {currentSuggestion.strategyUrl && (
          <a
            href={currentSuggestion.strategyUrl}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-md transition-colors"
          >
            <FileText className="w-4 h-4" />
            詳しい戦略を見る
          </a>
        )}
        <button
          type="button"
          onClick={() => {
            if (onStartPlan && currentSuggestion) {
              onStartPlan(currentSuggestion);
            }
          }}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#FF8A15] hover:bg-[#E67A0A] rounded-md transition-colors"
        >
          <CheckCircle className="w-4 h-4" />
          この計画で始める
        </button>
      </div>
    </div>
  );
};

