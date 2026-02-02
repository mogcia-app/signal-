/**
 * 今月の目標セクションコンポーネント
 */

import React from "react";
import { Loader2 } from "lucide-react";
import { useHomeStore } from "@/stores/home-store";

export function MonthlyGoalsSection() {
  const isLoadingAiSections = useHomeStore((state) => state.isLoadingAiSections);
  const isLoadingDashboard = useHomeStore((state) => state.isLoadingDashboard);
  const aiSections = useHomeStore((state) => state.aiSections);

  if (isLoadingAiSections || isLoadingDashboard) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
          <span>🎯</span>
          今月の目標
        </h2>
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-orange-400 mb-2" />
          <p className="text-xs text-gray-500 font-light">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!aiSections || aiSections.monthlyGoals.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
          <span>🎯</span>
          今月の目標
        </h2>
        <p className="text-sm text-gray-500 font-light text-center py-4">
          今月の目標は設定されていません
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
        <span>🎯</span>
        今月の目標
      </h2>
      <div className="space-y-3">
        {aiSections.monthlyGoals.map((goal, index) => (
          <div key={index} className="flex items-start gap-2">
            <span className="text-gray-400">・</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">{goal.metric}</div>
              <div className="text-sm font-light text-gray-700">{goal.target}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

