"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Calendar, Target, Lightbulb, FileText, CheckCircle } from "lucide-react";
import { PlanFormData, SimulationResult, AIPlanSuggestion as AIPlanSuggestionType } from "../types/plan";
import { authFetch } from "../../../../utils/authFetch";

interface AIPlanSuggestionProps {
  formData: PlanFormData;
  simulationResult: SimulationResult;
  isLoading?: boolean;
  showWeeklyTasksOnly?: boolean; // 今週やることのみ表示
  showWeeklyPlans?: boolean; // 週ごとの詳細計画のみ表示
  onStartPlan?: (suggestion: AIPlanSuggestionType) => void; // この計画で始めるボタンのハンドラー
}

export const AIPlanSuggestion: React.FC<AIPlanSuggestionProps> = ({
  formData,
  simulationResult,
  isLoading: externalLoading,
  showWeeklyTasksOnly = false,
  showWeeklyPlans = false,
  onStartPlan,
}) => {
  const [suggestion, setSuggestion] = useState<AIPlanSuggestionType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [formData, simulationResult, externalLoading]);

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

  if (!suggestion) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
      {/* 今月の目標 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-[#FF8A15]" />
          <h3 className="text-base font-semibold text-gray-900">今月の目標</h3>
        </div>
        <div className="space-y-2">
          {suggestion.monthlyGoals.map((goal, index) => (
            <div key={index} className="text-sm text-gray-700 flex items-start gap-2">
              <span className="text-gray-500">・</span>
              <span>
                <span className="font-medium text-gray-900">{goal.metric}:</span> {goal.target}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 最適な投稿時間（AIに任せる場合） */}
      {suggestion.recommendedPostingTimes && suggestion.recommendedPostingTimes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-[#FF8A15]" />
            <h3 className="text-base font-semibold text-gray-900">最適な投稿時間</h3>
          </div>
          <div className="space-y-2">
            {suggestion.recommendedPostingTimes.map((timeRec, index) => {
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

      {/* 一番大事なこと */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-5 h-5 text-[#FF8A15]" />
          <h3 className="text-base font-semibold text-gray-900">一番大事なこと</h3>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">{suggestion.keyMessage}</p>
      </div>

      {/* 月次戦略 */}
      {suggestion.monthlyStrategy && suggestion.monthlyStrategy.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-3">月次戦略</h3>
          <div className="space-y-4">
            {suggestion.monthlyStrategy.map((strategy, index) => (
              <div key={index} className="border-l-4 border-[#FF8A15] pl-4">
                <div className="font-semibold text-gray-900 mb-2">
                  【{strategy.week}週目】: {strategy.theme}
                </div>
                <ul className="space-y-1">
                  {strategy.actions.map((action, actionIndex) => (
                    <li key={actionIndex} className="text-sm text-gray-700">
                      - {action}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 週次計画 */}
      {suggestion.weeklyPlans && suggestion.weeklyPlans.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-3">週次計画</h3>
          <div className="space-y-4">
            {suggestion.weeklyPlans.map((plan, planIndex) => {
              const typeLabels: Record<string, string> = {
                feed: "フィード投稿",
                reel: "リール",
                story: "ストーリーズのみ",
                "feed+reel": "フィード投稿 + リール",
              };

              return (
                <div key={planIndex} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    第{plan.week}週（{plan.startDate}〜{plan.endDate}）の計画
                  </h4>
                  <div className="space-y-2">
                    {plan.tasks.map((task, taskIndex) => (
                      <div key={taskIndex} className="text-sm text-gray-700">
                        <div className="font-medium text-gray-900">{task.day}:</div>
                        <div className="ml-4 text-gray-600">
                          {typeLabels[task.type] || task.type}（{task.time}）
                        </div>
                        <div className="ml-4 text-gray-600">「{task.description}」</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        {suggestion.strategyUrl && (
          <a
            href={suggestion.strategyUrl}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-md transition-colors"
          >
            <FileText className="w-4 h-4" />
            詳しい戦略を見る
          </a>
        )}
        <button
          type="button"
          onClick={() => {
            if (onStartPlan && suggestion) {
              onStartPlan(suggestion);
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

