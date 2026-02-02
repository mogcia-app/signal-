/**
 * 今週の予定セクションコンポーネント
 */

import React from "react";
import { Loader2 } from "lucide-react";
import { useHomeStore } from "@/stores/home-store";

export function WeeklyScheduleSection() {
  const isLoadingAiSections = useHomeStore((state) => state.isLoadingAiSections);
  const isLoadingDashboard = useHomeStore((state) => state.isLoadingDashboard);
  const aiSections = useHomeStore((state) => state.aiSections);

  const typeLabels: Record<string, string> = {
    feed: "フィード投稿",
    reel: "リール",
    story: "ストーリーズ",
  };

  if (isLoadingAiSections || isLoadingDashboard) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
          <span>📅</span>
          今週の予定
        </h2>
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-purple-400 mb-2" />
          <p className="text-xs text-gray-500 font-light">AIが今週の予定を生成中...</p>
        </div>
      </div>
    );
  }

  if (!aiSections || !aiSections.weeklySchedule) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
          <span>📅</span>
          今週の予定
        </h2>
        <p className="text-sm text-gray-500 font-light text-center py-4">
          今週の予定は設定されていません
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
        <span>📅</span>
        今週の予定
      </h2>
      <div className="space-y-4">
        <div className="border-l-2 border-purple-400 pl-4">
          <div className="mb-2">
            <div className="text-sm font-medium text-gray-900 mb-1">
              第{aiSections.weeklySchedule.week}週: {aiSections.weeklySchedule.theme}
            </div>
          </div>
          <div className="space-y-1 mt-2">
            {aiSections.weeklySchedule.actions.map((action, actionIndex) => (
              <div key={actionIndex} className="text-xs font-light text-gray-700 flex items-start gap-2">
                <span className="text-purple-400 mt-0.5">└</span>
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>
        {aiSections.weeklySchedule.tasks && aiSections.weeklySchedule.tasks.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs font-medium text-gray-700 mb-2">📋 今週の投稿スケジュール</div>
            <div className="space-y-2">
              {aiSections.weeklySchedule.tasks.map((task, taskIndex) => (
                <div key={taskIndex} className="text-xs font-light text-gray-700">
                  <span className="text-gray-900">{task.date || task.day}</span>
                  {task.time && <span className="text-gray-500 ml-1">({task.time})</span>}
                  <span className="text-gray-500 ml-1">-</span>
                  <span className="text-gray-700 ml-1">{typeLabels[task.type] || task.type}</span>
                  <span className="text-gray-600 ml-1">「{task.description}」</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

