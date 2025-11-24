"use client";

import React, { useState, useEffect } from "react";
import { Target, CheckCircle2, AlertCircle, XCircle, Loader2, Sparkles, X } from "lucide-react";
import { useAuth } from "../../../../contexts/auth-context";
import { authFetch } from "../../../../utils/authFetch";
import type { GoalAchievement } from "@/app/api/analytics/kpi-breakdown/route";

interface GoalAchievementProps {
  goalAchievements: GoalAchievement[];
  isLoading?: boolean;
  currentDate?: string; // YYYY-MM形式
  kpiBreakdowns?: Array<{
    key: string;
    label: string;
    value: number;
    changePct?: number;
  }>;
}

interface NextMonthGoalProposal {
  currentFollowers: number;
  targetFollowers: number;
  followerGain: number;
  planPeriod: string;
  kpiGoals: Array<{
    key: string;
    label: string;
    currentValue: number;
    targetValue: number;
    reasoning: string;
  }>;
  actionGoals: Array<{
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    kpiKey?: string;
  }>;
  reasoning: string;
}

const getStatusConfig = (status: GoalAchievement["status"]) => {
  switch (status) {
    case "achieved":
      return {
        icon: CheckCircle2,
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        label: "達成",
      };
    case "on_track":
      return {
        icon: Target,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        label: "順調",
      };
    case "at_risk":
      return {
        icon: AlertCircle,
        color: "text-amber-600",
        bgColor: "bg-amber-50",
        borderColor: "border-amber-200",
        label: "要注意",
      };
    default:
      return {
        icon: XCircle,
        color: "text-gray-600",
        bgColor: "bg-gray-50",
        borderColor: "border-gray-200",
        label: "未設定",
      };
  }
};

export const GoalAchievementComponent: React.FC<GoalAchievementProps> = ({
  goalAchievements,
  isLoading,
  currentDate,
  kpiBreakdowns = [],
}) => {
  const { user } = useAuth();
  const [aiProposal, setAiProposal] = useState<NextMonthGoalProposal | null>(null);
  const [isLoadingProposal, setIsLoadingProposal] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [isProposalClosed, setIsProposalClosed] = useState(false);

  // localStorageから閉じた状態を取得
  useEffect(() => {
    if (currentDate && typeof window !== "undefined") {
      const closedKey = `kpi-goal-proposal-closed-${currentDate}`;
      const isClosed = localStorage.getItem(closedKey) === "true";
      setIsProposalClosed(isClosed);
    }
  }, [currentDate]);

  // 閉じるボタンのハンドラー
  const handleCloseProposal = () => {
    if (currentDate && typeof window !== "undefined") {
      const closedKey = `kpi-goal-proposal-closed-${currentDate}`;
      localStorage.setItem(closedKey, "true");
      setIsProposalClosed(true);
    }
  };

  // 再度開くハンドラー
  const handleReopenProposal = () => {
    if (currentDate && typeof window !== "undefined") {
      const closedKey = `kpi-goal-proposal-closed-${currentDate}`;
      localStorage.removeItem(closedKey);
      setIsProposalClosed(false);
    }
  };

  // 閉じていない場合、localStorageからデータを復元または自動取得
  useEffect(() => {
    if (!user || !currentDate || isProposalClosed || isLoading) return;

    // localStorageからデータを復元
    if (typeof window !== "undefined") {
      const dataKey = `kpi-goal-proposal-data-${currentDate}`;
      const savedData = localStorage.getItem(dataKey);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          setAiProposal(parsed);
          return; // データがある場合は取得しない
        } catch (e) {
          console.error("Failed to parse saved proposal data:", e);
        }
      }
    }

    // データがない場合、KPI分解データがあれば自動取得
    if (kpiBreakdowns && kpiBreakdowns.length > 0 && !isLoadingProposal) {
      handleAskAI();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentDate, isProposalClosed, kpiBreakdowns?.length]);

  // AI提案を取得（ボタンクリック時、または自動取得時）
  const handleAskAI = async () => {
    if (!user || !currentDate || !kpiBreakdowns || kpiBreakdowns.length === 0) {
      setProposalError("KPIデータが不足しています");
      return;
    }

    setIsLoadingProposal(true);
    setProposalError(null);
    setAiProposal(null);

    try {
      const response = await authFetch("/api/ai/next-month-goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: currentDate,
          kpiBreakdowns: kpiBreakdowns,
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setAiProposal(result.data);
        // データをlocalStorageに保存
        if (typeof window !== "undefined") {
          const dataKey = `kpi-goal-proposal-data-${currentDate}`;
          localStorage.setItem(dataKey, JSON.stringify(result.data));
        }
      } else {
        setProposalError(result.error || "提案の取得に失敗しました");
      }
    } catch (error) {
      console.error("AI提案取得エラー:", error);
      setProposalError("提案の取得中にエラーが発生しました");
    } finally {
      setIsLoadingProposal(false);
    }
  };

  // 閉じていない場合、localStorageからデータを復元または自動取得
  useEffect(() => {
    if (!user || !currentDate || isProposalClosed) return;

    // localStorageからデータを復元
    if (typeof window !== "undefined") {
      const dataKey = `kpi-goal-proposal-data-${currentDate}`;
      const savedData = localStorage.getItem(dataKey);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          setAiProposal(parsed);
          return; // データがある場合は取得しない
        } catch (e) {
          console.error("Failed to parse saved proposal data:", e);
        }
      }
    }

    // データがない場合、KPI分解データがあれば自動取得
    if (kpiBreakdowns && kpiBreakdowns.length > 0) {
      handleAskAI();
    }
  }, [user, currentDate, isProposalClosed, kpiBreakdowns]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-2" />
          <span className="text-sm text-gray-700">読み込み中...</span>
        </div>
      </div>
    );
  }

  if (!goalAchievements || goalAchievements.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4">
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">目標が設定されていません</p>
          <p className="text-xs mt-1">運用計画で目標を設定すると、達成度が表示されます</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4">
      <div className="flex items-center mb-4">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0 shadow-sm">
          <Target className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">KPI目標達成度</h2>
          <p className="text-xs text-gray-600 mt-0.5">
            設定した目標に対する達成度を表示します
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 左側: KPI目標達成度 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">今月の達成度</h3>
            <div className="space-y-3">
              {goalAchievements.map((goal) => {
            const statusConfig = getStatusConfig(goal.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={goal.key}
                className={`${statusConfig.bgColor} ${statusConfig.borderColor} border rounded-lg p-3 sm:p-4`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center">
                    <StatusIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${statusConfig.color} mr-2`} />
                    <h3 className="text-sm font-semibold text-gray-900">{goal.label}</h3>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${statusConfig.bgColor} ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-xs text-gray-600">達成率</span>
                    <span className={`text-lg font-bold ${statusConfig.color}`}>
                      {goal.achievementRate}%
                    </span>
                  </div>

                  {/* プログレスバー */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        goal.achievementRate >= 100
                          ? "bg-red-500"
                          : "bg-gray-400"
                      }`}
                      style={{ width: `${Math.min(100, goal.achievementRate)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-gray-600">実績: </span>
                      <span className="font-semibold text-gray-900">
                        {goal.actual.toLocaleString()}
                        {goal.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">目標: </span>
                      <span className="font-semibold text-gray-900">
                        {goal.target.toLocaleString()}
                        {goal.unit}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
            </div>
          </div>

          {/* 右側: AI提案 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                <Sparkles className="w-4 h-4 text-purple-500 mr-2" />
                AI提案：来月の目標
              </h3>
              {!isProposalClosed && aiProposal && (
                <button
                  onClick={handleCloseProposal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="閉じる"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {isProposalClosed ? (
              // 閉じた状態：AIに聞くボタンを表示
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500 mb-3">
                  KPI分解データを分析して<br />
                  来月の目標を提案します
                </p>
                <button
                  onClick={handleReopenProposal}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium py-2.5 px-4 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center shadow-sm"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AIに聞く
                </button>
              </div>
            ) : isLoadingProposal ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-purple-600 mr-2" />
                <span className="text-sm text-gray-700">AIが目標を提案中...</span>
              </div>
            ) : proposalError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600 mb-3">{proposalError}</p>
                <button
                  onClick={handleAskAI}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium py-2 px-4 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
                >
                  再試行
                </button>
              </div>
            ) : aiProposal ? (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-600 mb-3">{aiProposal.reasoning}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">現在のフォロワー数</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {aiProposal.currentFollowers.toLocaleString()}人
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">目標フォロワー数</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {aiProposal.targetFollowers.toLocaleString()}人
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">目標増加数</span>
                      <span className="text-sm font-semibold text-purple-600">
                        +{aiProposal.followerGain.toLocaleString()}人
                      </span>
                    </div>
                  </div>
                  {aiProposal.kpiGoals && aiProposal.kpiGoals.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-purple-200">
                      <p className="text-xs font-semibold text-gray-900 mb-2">KPI目標</p>
                      <div className="space-y-2">
                        {aiProposal.kpiGoals.map((kpi) => (
                          <div key={kpi.key} className="bg-white rounded p-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-700">{kpi.label}</span>
                              <span className="text-xs text-purple-600">
                                {kpi.currentValue.toLocaleString()} → {kpi.targetValue.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">{kpi.reasoning}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiProposal.actionGoals && aiProposal.actionGoals.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-purple-200">
                      <p className="text-xs font-semibold text-gray-900 mb-2">行動目標</p>
                      <div className="space-y-2">
                        {aiProposal.actionGoals.map((action, index) => {
                          const priorityConfig = {
                            high: {
                              label: "高",
                              className: "bg-red-50 text-red-700 border-red-200",
                            },
                            medium: {
                              label: "中",
                              className: "bg-amber-50 text-amber-700 border-amber-200",
                            },
                            low: {
                              label: "低",
                              className: "bg-blue-50 text-blue-700 border-blue-200",
                            },
                          };
                          const priority = priorityConfig[action.priority] || priorityConfig.medium;
                          return (
                            <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="text-xs font-semibold text-gray-900 flex-1">{action.title}</h4>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${priority.className} flex-shrink-0 ml-2`}>
                                  {priority.label}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 leading-relaxed">{action.description}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500 mb-3">
                  KPI分解データを分析して<br />
                  来月の目標を提案します
                </p>
                <button
                  onClick={handleAskAI}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium py-2.5 px-4 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center shadow-sm"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AIに聞く
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

