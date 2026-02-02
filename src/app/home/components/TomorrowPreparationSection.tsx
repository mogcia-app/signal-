/**
 * 明日の準備セクションコンポーネント
 */

import React from "react";
import { Loader2 } from "lucide-react";
import { useHomeStore } from "@/stores/home-store";

export function TomorrowPreparationSection() {
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
          <span>🔮</span>
          明日の準備
        </h2>
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-blue-400 mb-2" />
          <p className="text-xs text-gray-500 font-light">AIが準備タスクを生成中...</p>
        </div>
      </div>
    );
  }

  if (!aiSections || aiSections.tomorrowPreparation.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
          <span>🔮</span>
          明日の準備
        </h2>
        <div className="space-y-4">
          <div className="border-l-2 border-blue-400 pl-4">
            <div className="flex items-start gap-2 mb-2">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 mb-1">【分析・確認】</div>
                <p className="text-sm font-light text-gray-700 mb-2">
                  「投稿後の分析はできていますか？見直してみましょう！」
                </p>
              </div>
            </div>
          </div>
          <div className="border-l-2 border-blue-400 pl-4">
            <div className="flex items-start gap-2 mb-2">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 mb-1">【エンゲージメント】</div>
                <p className="text-sm font-light text-gray-700 mb-2">
                  「コメントには返信を忘れずに！」
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-light text-gray-900 flex items-center gap-2 mb-4">
        <span>🔮</span>
        明日の準備
      </h2>
      <div className="space-y-4">
        {aiSections.tomorrowPreparation.map((prep, index) => (
          <div key={index} className="border-l-2 border-blue-400 pl-4">
            <div className="flex items-start gap-2 mb-2">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 mb-1">
                  {typeLabels[prep.type] || prep.type}
                  {prep.time && (
                    <span className="text-xs font-light text-gray-500 ml-2">({prep.time})</span>
                  )}
                </div>
                <p className="text-sm font-light text-gray-700 mb-2">「{prep.description}」</p>
                <p className="text-xs text-blue-600 font-light">✓ {prep.preparation}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

