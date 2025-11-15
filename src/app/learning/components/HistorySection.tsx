"use client";

import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { MessageCircle, Target } from "lucide-react";
import type { FeedbackEntry } from "../types";
import type { AIActionLog } from "@/types/ai";
import { formatDateTime } from "../utils";

interface HistorySectionProps {
  feedbackHistory: FeedbackEntry[];
  actionHistory: AIActionLog[];
  isLoading: boolean;
  error: string | null;
}

export function HistorySection({ feedbackHistory, actionHistory, isLoading, error }: HistorySectionProps) {
  return (
    <section className="border border-gray-200 bg-white rounded-none p-6">
      <div className="flex items-start sm:items-center justify-between gap-4 mb-4 flex-col sm:flex-row">
        <div>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-slate-600" />
            <h2 className="text-lg font-semibold text-black">フィードバック & アクション履歴</h2>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            最新のフィードバックと、実行されたAI提案の記録です。学習ループがどのように活用されているかを振り返りましょう。
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-slate-600">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mr-2" />
          <span className="text-sm">履歴を取得しています...</span>
        </div>
      ) : error ? (
        <div className="border border-red-200 bg-red-50 rounded-none p-4 text-sm text-red-700">{error}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">最近のフィードバック</h3>
            {feedbackHistory.length === 0 ? (
              <EmptyStateCard
                icon={MessageCircle}
                align="left"
                title="フィードバック履歴がまだありません"
                description="投稿分析ページから「良かった」「改善したい」などのフィードバックを残すと、ここに履歴が蓄積されます。"
                actions={[{ label: "分析ページを開く", href: "/analytics/feed" }]}
              />
            ) : (
              <ul className="space-y-3">
                {feedbackHistory.map((entry) => (
                  <li key={`feedback-${entry.id}`} className="border border-gray-200 bg-gray-50 rounded-none p-3 text-xs text-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`font-semibold ${
                          entry.sentiment === "positive"
                            ? "text-emerald-600"
                            : entry.sentiment === "negative"
                              ? "text-red-600"
                              : "text-slate-600"
                        }`}
                      >
                        {entry.sentiment === "positive" ? "ポジティブ" : entry.sentiment === "negative" ? "ネガティブ" : "ニュートラル"}
                      </span>
                      <span className="text-[11px] text-gray-500">{formatDateTime(entry.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">重み: {entry.weight.toFixed(2)}</p>
                    <p className="text-xs text-gray-700 whitespace-pre-wrap">{entry.comment ? entry.comment : "コメントなし"}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">アクション実行ログ</h3>
            {actionHistory.length === 0 ? (
              <EmptyStateCard
                icon={Target}
                align="left"
                title="アクション実行ログがまだありません"
                description="AI提案カードから「実行した」ログを残すと、提案の採用状況がここに集計されます。"
                actions={[{ label: "AI提案を見る", href: "/instagram/monthly-report" }]}
              />
            ) : (
              <ul className="space-y-3">
                {actionHistory.map((entry) => (
                  <li key={`action-${entry.id}`} className="border border-gray-200 bg-white rounded-none p-3 text-xs text-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-800">{entry.title}</span>
                      <span className="text-[11px] text-gray-500">{formatDateTime(entry.updatedAt)}</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">フォーカス: {entry.focusArea}</p>
                    <p className="text-xs text-gray-600 mb-1">
                      採用状況:{" "}
                      <span className={entry.applied ? "text-emerald-600 font-semibold" : "text-slate-600"}>
                        {entry.applied ? "実行済み" : "検討中"}
                      </span>
                      {typeof entry.resultDelta === "number"
                        ? ` / 効果: ${entry.resultDelta > 0 ? "+" : ""}${entry.resultDelta.toFixed(1)}%`
                        : ""}
                    </p>
                    {entry.feedback ? (
                      <p className="text-xs text-gray-700 whitespace-pre-wrap">メモ: {entry.feedback}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

