"use client";

import React from "react";
import Link from "next/link";
import { Calendar, CheckCircle, AlertCircle, Clock, ArrowRight, Loader2 } from "lucide-react";

interface TodayTask {
  id: string;
  title: string;
  description: string;
  type: "follower" | "analysis" | "post";
  priority: "high" | "medium" | "low";
  link?: string;
}

interface TodayTasksCardProps {
  tasks: TodayTask[];
  isLoading?: boolean;
  lastFollowerUpdate?: string | null;
}

export const TodayTasksCard: React.FC<TodayTasksCardProps> = ({
  tasks,
  isLoading,
  lastFollowerUpdate,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-2" />
          <span className="text-sm text-gray-700">読み込み中...</span>
        </div>
      </div>
    );
  }

  // 今日の日付を取得
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const lastUpdateDate = lastFollowerUpdate ? new Date(lastFollowerUpdate).toISOString().split("T")[0] : null;
  const needsFollowerUpdate = lastUpdateDate !== todayStr;

  // フォロワー更新タスクを追加
  const allTasks: TodayTask[] = needsFollowerUpdate
    ? [
        {
          id: "follower-update",
          title: "フォロワー数を更新する",
          description: "毎日のフォロワー数を記録しましょう",
          type: "follower",
          priority: "high",
        },
        ...tasks,
      ]
    : tasks;

  if (allTasks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">今日すべきこと</h2>
            <p className="text-xs text-gray-600 mt-0.5">今日のタスク一覧</p>
          </div>
        </div>
        <div className="text-center py-6 text-gray-500">
          <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
          <p className="text-sm">今日のタスクはすべて完了しました！</p>
        </div>
      </div>
    );
  }

  const getTaskIcon = (type: string) => {
    switch (type) {
      case "follower":
        return <CheckCircle className="w-4 h-4 text-orange-500" />;
      case "analysis":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case "post":
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-l-4 border-red-500 bg-red-50";
      case "medium":
        return "border-l-4 border-yellow-500 bg-yellow-50";
      case "low":
        return "border-l-4 border-blue-500 bg-blue-50";
      default:
        return "border-l-4 border-gray-300 bg-gray-50";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">今日すべきこと</h2>
          <p className="text-xs text-gray-600 mt-0.5">今日のタスク一覧</p>
        </div>
      </div>
      <div className="space-y-3">
        {allTasks.map((task) => (
          <div
            key={task.id}
            className={`flex items-start gap-3 p-3 rounded-lg ${getPriorityColor(task.priority)}`}
          >
            <div className="mt-0.5 flex-shrink-0">{getTaskIcon(task.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{task.title}</p>
              <p className="text-xs text-gray-600 mt-1">{task.description}</p>
              {task.link && (
                <Link
                  href={task.link}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mt-2"
                >
                  詳細を見る
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

