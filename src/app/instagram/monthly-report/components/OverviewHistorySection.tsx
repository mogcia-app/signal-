"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Loader2, History } from "lucide-react";
import { useAuth } from "../../../../contexts/auth-context";
import { authFetch } from "../../../../utils/authFetch";
import { EmptyStateCard } from "../../../../components/ui/empty-state-card";

interface OverviewHistoryEntry {
  id: string;
  summary: string;
  highlights: Array<{
    label: string;
    value: string;
    change: string;
    context?: string;
  }>;
  watchouts: string[];
  date: string;
  period: "weekly" | "monthly";
  createdAt: string | null;
}

interface OverviewHistorySectionProps {
  period: "weekly" | "monthly";
  refreshKey: number;
  hasRequested: boolean;
  containerClassName?: string;
}

export const OverviewHistorySection: React.FC<OverviewHistorySectionProps> = ({
  period,
  refreshKey,
  hasRequested,
  containerClassName,
}) => {
  const { user } = useAuth();
  const isAuthReady = useMemo(() => Boolean(user), [user]);
  const [history, setHistory] = useState<OverviewHistoryEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (refreshKey > 0) {
      setIsExpanded(true);
    }
  }, [refreshKey]);

  const periodLabel = period === "monthly" ? "（月次）" : "（週次）";
  const periodName = period === "monthly" ? "月次" : "週次";

  useEffect(() => {
    const fetchHistory = async () => {
      if (!isAuthReady || !user?.uid) {
        return;
      }

      if (!isExpanded) {
        return;
      }

      setIsHistoryLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          userId: user.uid,
          period,
          limit: "6",
        });

        const response = await authFetch(`/api/ai/overview-history?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`Overview history API error: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          const bannedPhrases = [
            "投稿が確認できません",
            "投稿が全くない",
            "成長の機会を逃しています",
            "フォロワー増加の可能性が低い",
          ];
          const containsBanned = (text: string) =>
            bannedPhrases.some((p) => text.includes(p));

          const normalizedHistory = Array.isArray(result.data)
            ? result.data
                .map((entry: any) => {
                  const genSummary =
                    entry?.generation?.draft?.body ||
                    entry?.generation?.rawText ||
                    "";
                  const overviewSummary = entry?.overview?.summary || "";
                  const summary = String(genSummary || overviewSummary || "");
                  const highlights = Array.isArray(entry?.overview?.highlights)
                    ? entry.overview.highlights
                    : [];
                  const rawWatchouts: string[] = Array.isArray(entry?.overview?.watchouts)
                    ? entry.overview.watchouts
                    : [];
                  const watchouts = rawWatchouts.filter((w) => !containsBanned(w));
                  return {
                    id: String(entry.id || ""),
                    summary,
                    highlights,
                    watchouts,
                    date: String(entry.date || ""),
                    period: entry.period === "weekly" ? "weekly" : "monthly",
                    createdAt: typeof entry.createdAt === "string" ? entry.createdAt : null,
                  } as OverviewHistoryEntry;
                })
                .filter((e: OverviewHistoryEntry) => e.summary.trim().length > 0)
            : [];

          setHistory(normalizedHistory);
        } else {
          throw new Error(result.error || "履歴取得に失敗しました");
        }
      } catch (fetchError) {
        console.error("AI概要履歴取得エラー:", fetchError);
        setError(fetchError instanceof Error ? fetchError.message : "履歴取得に失敗しました");
      } finally {
        setIsHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [isAuthReady, user?.uid, period, refreshKey, isExpanded]);

  return (
    <div className={`bg-white rounded-none shadow-sm border border-gray-200 p-6 mb-6 ${containerClassName ?? ""}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-black">過去のAIサマリー {periodLabel}</h2>
          <p className="text-sm text-gray-600">
            直近のAIまとめを振り返り、改善の進捗を追跡できます。
          </p>
        </div>
        <button
          onClick={() => {
            if (!isExpanded) {
              setIsExpanded(true);
            } else {
              setIsExpanded(false);
            }
          }}
          className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 rounded-none transition-colors"
        >
          {isExpanded ? "閉じる" : "AIサマリー履歴を表示"}
        </button>
      </div>

      {!isExpanded ? (
        <p className="text-sm text-gray-500">
          {hasRequested
            ? `AI分析で生成された${periodLabel}サマリーの履歴を表示できます。`
            : `「AI分析を実行」すると、${periodLabel}サマリーが履歴として残ります。`}
        </p>
      ) : isHistoryLoading ? (
        <div className="flex items-center justify-center py-8 text-slate-600">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          <span className="text-sm">履歴を読み込んでいます...</span>
        </div>
      ) : error ? (
        <div className="border border-red-200 bg-red-50 rounded-none p-4 text-sm text-red-700">
          履歴を取得できませんでした。リロードして再度お試しください。
        </div>
      ) : history.length === 0 ? (
        <EmptyStateCard
          icon={History}
          tone="info"
          title={`${periodName}サマリーの履歴はまだありません`}
          description={
            hasRequested
              ? "AI分析で保存されたサマリーがまだありません。分析を継続すると履歴が蓄積されます。"
              : "AI分析を実行すると、ここにサマリーが自動的に保存されます。まずはAI分析を走らせてみましょう。"
          }
          actions={[{ label: "AI分析ページを開く", href: "/instagram/monthly-report" }]}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="border border-gray-200 rounded-none p-4 bg-gray-50 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-600">
                  {entry.period === "monthly" ? "月次" : "週次"} {entry.date}
                </p>
                {entry.createdAt && (
                  <p className="text-[11px] text-gray-400">
                    {new Date(entry.createdAt).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>
              <p
                className="text-sm text-gray-700 line-clamp-3"
                dangerouslySetInnerHTML={{
                  __html: String(entry.summary || ""),
                }}
              />
              {entry.highlights?.length ? (
                <ul className="space-y-1">
                  {entry.highlights.slice(0, 2).map((highlight, idx) => (
                    <li
                      key={`${entry.id}-highlight-${idx}`}
                      className="flex items-center justify-between text-xs text-gray-600"
                    >
                      <span
                        dangerouslySetInnerHTML={{
                          __html: String(highlight.label || ""),
                        }}
                      />
                      <span
                        className="font-semibold"
                        dangerouslySetInnerHTML={{
                          __html: String(highlight.change || ""),
                        }}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
              {entry.watchouts?.length ? (
                <p className="text-xs text-gray-500">
                  {String(entry.watchouts[0] || "")
                    .replace(/<[^>]*>/g, "")
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">")
                    .replace(/&amp;/g, "&")}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

