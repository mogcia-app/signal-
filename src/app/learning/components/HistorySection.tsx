"use client";

import Link from "next/link";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { MessageCircle, Target } from "lucide-react";
import { InfoTooltip } from "./InfoTooltip";
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
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-gray-800">アクション実行ログ</h3>
              <InfoTooltip text="月次レポートの「次月のアクションプラン」や投稿ディープダイブの「次のアクション」でチェックを入れたAI提案がここに記録されます。「フォーカス」は提案の出所を示します（例: next-month-2025-11 = 2025年11月の月次レポート）。" />
            </div>
            {actionHistory.length === 0 ? (
              <EmptyStateCard
                icon={Target}
                align="left"
                title="アクション実行ログがまだありません"
                description="AI提案カードから「実行した」ログを残すと、提案の採用状況がここに集計されます。"
                actions={[{ label: "AI提案を見る", href: "/instagram/report" }]}
              />
            ) : (
              <ul className="space-y-3">
                {actionHistory.map((entry) => {
                  // focusAreaから出所を判定
                  const getFocusAreaLabel = (focusArea: string | undefined) => {
                    if (!focusArea) {
                      return "不明";
                    }
                    if (focusArea.startsWith("next-month-")) {
                      const monthMatch = focusArea.match(/next-month-(\d{4})-(\d{2})/);
                      if (monthMatch) {
                        const [, year, month] = monthMatch;
                        return `${year}年${parseInt(month)}月の月次レポート`;
                      }
                      return "月次レポート";
                    }
                    if (focusArea.startsWith("learning-")) {
                      return "投稿ディープダイブ";
                    }
                    return focusArea;
                  };

                  const focusAreaLabel = getFocusAreaLabel(entry.focusArea);
                  const isFromMonthlyReport = entry.focusArea?.startsWith("next-month-") ?? false;

                  return (
                    <li key={`action-${entry.id}`} className="border border-gray-200 bg-white rounded-none p-3 text-xs text-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-800">{entry.title}</span>
                        <span className="text-[11px] text-gray-500">{formatDateTime(entry.updatedAt)}</span>
                      </div>
                      <div className="mb-2 p-2 bg-gray-50 border border-gray-200 rounded-none">
                        <p className="text-[10px] text-gray-500 mb-1">出所</p>
                        <p className="text-xs text-gray-700 font-medium">
                          {focusAreaLabel}
                          {isFromMonthlyReport && (
                            <Link
                              href="/instagram/report"
                              className="ml-2 text-blue-600 hover:text-blue-800 text-[10px] underline"
                            >
                              月次レポートを見る →
                            </Link>
                          )}
                        </p>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">
                        採用状況:{" "}
                        <span className={entry.applied ? "text-emerald-600 font-semibold" : "text-slate-600"}>
                          {entry.applied ? "✅ 実行済み" : "⏳ 検討中"}
                        </span>
                        {typeof entry.resultDelta === "number"
                          ? ` / 効果: ${entry.resultDelta > 0 ? "+" : ""}${entry.resultDelta.toFixed(1)}%`
                          : ""}
                      </p>
                      {entry.feedback ? (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-none">
                          <p className="text-[10px] text-blue-700 font-semibold mb-1">📝 メモ</p>
                          <p className="text-xs text-blue-800 whitespace-pre-wrap">{entry.feedback}</p>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

