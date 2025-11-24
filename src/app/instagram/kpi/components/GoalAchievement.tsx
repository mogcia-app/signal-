"use client";

import React from "react";
import { Target, CheckCircle2, AlertCircle, XCircle, Loader2 } from "lucide-react";
import type { GoalAchievement } from "@/app/api/analytics/kpi-breakdown/route";

interface GoalAchievementProps {
  goalAchievements: GoalAchievement[];
  isLoading?: boolean;
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
}) => {

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
                          ? "bg-orange-500"
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
    </div>
  );
};

