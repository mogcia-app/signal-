"use client";

import Link from "next/link";
import { useMemo } from "react";
import { History } from "lucide-react";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { getLabEditorHref, getAnalyticsHref } from "@/utils/links";
import type { PatternSignal, PostInsight } from "../types";
import type { AIActionLog } from "@/types/ai";
import { renderSignificanceBadge } from "../utils";

interface PostDeepDiveSectionProps {
  signals: PatternSignal[];
  postInsights: Record<string, PostInsight>;
  actionLogMap: Map<string, AIActionLog>;
  handleActionLogToggle: (payload: { actionId: string; title: string; focusArea: string; applied: boolean }) => void;
  onGenerateInsight: (signal: PatternSignal) => void;
  generatingInsightId: string | null;
  actionLogPendingId: string | null;
  actionLogError: string | null;
  isLoading: boolean;
  error: string | null;
}

export function PostDeepDiveSection({
  signals,
  postInsights,
  actionLogMap,
  handleActionLogToggle,
  onGenerateInsight,
  generatingInsightId,
  actionLogPendingId,
  actionLogError,
  isLoading,
  error,
}: PostDeepDiveSectionProps) {
  if (isLoading) {
    return (
      <section className="border border-gray-200 bg-white rounded-none p-6">
        <div className="flex items-center justify-center py-8 text-slate-600">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mr-2" />
          <span className="text-sm">投稿ディープダイブを読み込んでいます...</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="border border-gray-200 bg-white rounded-none p-6">
        <div className="border border-red-200 bg-red-50 rounded-none p-4 text-sm text-red-700">{error}</div>
      </section>
    );
  }

  if (!signals.length) {
    return (
      <section className="border border-gray-200 bg-white rounded-none p-6">
        <EmptyStateCard
          icon={History}
          tone="info"
          title="投稿ディープダイブはまだ準備中"
          description="投稿の分析データとフィードバックが増えると、ここにディープダイブカードが生成されます。まずはレポートや分析画面から記録を増やしてみましょう。"
          actions={[{ label: "分析ページを開く", href: "/analytics/feed" }]}
        />
      </section>
    );
  }

  return (
    <section className="border border-gray-200 bg-white rounded-none p-6">
      <div className="flex items-start sm:items-center justify-between gap-4 mb-4 flex-col sm:flex-row">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-600" />
            <h2 className="text-lg font-semibold text-black">投稿ディープダイブ</h2>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            投稿ごとの指標やクラスタ比較を深掘りし、AIが導き出した強み・改善点・次の一手を確認できます。
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {signals.slice(0, 10).map((signal) => {
          const analyticsHref = getAnalyticsHref(signal.category, signal.postId);
          const labHref = getLabEditorHref(signal.category, signal.postId);
          const insight = postInsights[signal.postId];
          const significance = signal.significance ?? {
            reach: "neutral",
            engagement: "neutral",
            savesRate: "neutral",
            commentsRate: "neutral",
          };
          const metrics = {
            savesRate: signal.metrics?.savesRate ?? 0,
            commentsRate: signal.metrics?.commentsRate ?? 0,
            totalEngagement: signal.metrics?.totalEngagement ?? 0,
          };
          const comparisons = {
            reachDiff: signal.comparisons?.reachDiff ?? 0,
            engagementRateDiff: signal.comparisons?.engagementRateDiff ?? 0,
            savesRateDiff: signal.comparisons?.savesRateDiff ?? 0,
          };
          const cluster = {
            label: signal.cluster?.label ?? "分析中",
            baselinePerformance: signal.cluster?.baselinePerformance ?? 0,
            similarPosts: Array.isArray(signal.cluster?.similarPosts) ? signal.cluster?.similarPosts ?? [] : [],
          };

          return (
            <div key={`deep-${signal.postId}`} className="border border-gray-200 bg-white rounded-none p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">{signal.category.toUpperCase()}</p>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">{signal.title || "タイトル未設定"}</h3>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
                    <span>KPI: {signal.kpiScore.toFixed(2)}</span>
                    <span>エンゲージ率: {signal.engagementRate.toFixed(2)}%</span>
                    <span>保存率: {(metrics.savesRate * 100).toFixed(1)}%</span>
                    <span>コメント率: {(metrics.commentsRate * 100).toFixed(1)}%</span>
                  </div>
                </div>
                <div className="text-right space-y-1 text-xs text-gray-500">
                  <div>
                    クラスタ: <span className="font-semibold text-gray-700">{cluster.label}</span>
                  </div>
                  <div>同クラスタ比較: {Math.round((signal.comparisons?.clusterPerformanceDiff ?? 0) * 100)}%</div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {signal.postId ? (
                      <>
                        {labHref && (
                          <Link
                            href={labHref}
                            target="_blank"
                            className="text-[11px] font-semibold text-white bg-slate-900 px-3 py-1 rounded-none hover:bg-slate-800 transition-colors"
                          >
                            Labで開く
                          </Link>
                        )}
                        <Link
                          href={`/instagram/posts/${signal.postId}`}
                          target="_blank"
                          className="text-[11px] font-semibold text-slate-700 border border-slate-300 bg-white px-3 py-1 rounded-none hover:bg-slate-100 transition-colors"
                        >
                          投稿詳細を見る
                        </Link>
                        {analyticsHref && (
                          <Link
                            href={analyticsHref}
                            target="_blank"
                            className="text-[11px] font-semibold text-slate-700 border border-slate-300 bg-white px-3 py-1 rounded-none hover:bg-slate-100 transition-colors"
                          >
                            分析で開く
                          </Link>
                        )}
                      </>
                    ) : (
                      <span className="text-[11px] text-gray-400">関連する投稿IDがありません</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-xs text-gray-600">
                <div className="border border-dashed border-gray-200 rounded-none p-3 bg-gray-50">
                  <p className="font-semibold text-gray-700 mb-2">指標の強み</p>
                  {renderSignificanceBadge("リーチ差分", comparisons.reachDiff, significance.reach)}
                  {renderSignificanceBadge("エンゲージ差分", comparisons.engagementRateDiff, significance.engagement)}
                  {renderSignificanceBadge("保存率差分", comparisons.savesRateDiff, significance.savesRate)}
                </div>
                <div className="border border-dashed border-gray-200 rounded-none p-3 bg-gray-50">
                  <p className="font-semibold text-gray-700 mb-2">クラスタと類似投稿</p>
                  <p className="mb-1">
                    ベースライン: {cluster.baselinePerformance.toFixed(2)} / 現在: {metrics.totalEngagement}
                  </p>
                  {cluster.similarPosts.length ? (
                    <ul className="space-y-1 list-disc list-inside">
                      {cluster.similarPosts.map((similar) => (
                        <li key={`${signal.postId}-similar-${similar.postId}`}>
                          {similar.title} ({similar.performanceScore.toFixed(2)})
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">類似投稿はまだありません。</p>
                  )}
                </div>
                <div className="border border-dashed border-gray-200 rounded-none p-3 bg-gray-50">
                  <p className="font-semibold text-gray-700 mb-2">AIサマリー</p>
                  <p className="text-gray-600 mb-2">
                    {insight?.summary ?? "AI要約を生成するには、まずフィードバックと分析データを蓄積してください。"}
                  </p>
                  {insight?.strengths?.length ? (
                    <div className="mb-2">
                      <p className="font-semibold text-gray-700">強み</p>
                      <ul className="list-disc list-inside text-gray-600">
                        {insight.strengths.map((item, idx) => (
                          <li key={`${signal.postId}-strength-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {insight?.improvements?.length ? (
                    <div className="mb-2">
                      <p className="font-semibold text-gray-700">改善ポイント</p>
                      <ul className="list-disc list-inside text-gray-600">
                        {insight.improvements.map((item, idx) => (
                          <li key={`${signal.postId}-improve-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {insight?.nextActions?.length ? (
                    <ActionList
                      signal={signal}
                      insight={insight}
                      actionLogMap={actionLogMap}
                      actionLogPendingId={actionLogPendingId}
                      handleActionLogToggle={handleActionLogToggle}
                    />
                  ) : null}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onGenerateInsight(signal)}
                      disabled={generatingInsightId === signal.postId}
                      className="text-[11px] font-semibold text-white bg-slate-700 px-3 py-1 rounded-none hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {generatingInsightId === signal.postId ? "生成中..." : insight ? "AIサマリーを再生成" : "AIサマリーを生成"}
                    </button>
                    {labHref && (
                      <Link
                        href={labHref}
                        target="_blank"
                        className="text-[11px] font-semibold text-slate-700 border border-slate-300 bg-white px-3 py-1 rounded-none hover:bg-slate-100 transition-colors"
                      >
                        Labで開く
                      </Link>
                    )}
                    {insight && <span className="text-[11px] text-gray-500">最終更新: リアルタイム生成</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {actionLogError && <p className="text-[11px] text-rose-600 mt-4">{actionLogError}</p>}
    </section>
  );
}

function ActionList({
  signal,
  insight,
  actionLogMap,
  actionLogPendingId,
  handleActionLogToggle,
}: {
  signal: PatternSignal;
  insight: PostInsight;
  actionLogMap: Map<string, AIActionLog>;
  actionLogPendingId: string | null;
  handleActionLogToggle: (payload: { actionId: string; title: string; focusArea: string; applied: boolean }) => void;
}) {
  return (
    <div>
      <p className="font-semibold text-gray-700">次のアクション</p>
      <ul className="space-y-2 mt-2">
        {insight.nextActions.map((item, idx) => {
          const actionId = `learning-${signal.postId || "post"}-next-${idx}`;
          const focusArea = `learning-${signal.postId || "general"}`;
          const log = actionLogMap.get(actionId);
          const checked = Boolean(log?.applied);
          const updatedLabel =
            log?.updatedAt && !Number.isNaN(Date.parse(log.updatedAt))
              ? new Date(log.updatedAt).toLocaleString("ja-JP", {
                  month: "short",
                  day: "numeric",
                })
              : null;
          return (
            <li
              key={actionId}
              className={`border border-gray-200 rounded-none p-2 text-xs flex items-start gap-2 ${
                checked ? "bg-emerald-50/40" : "bg-white"
              }`}
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 border-gray-400 rounded"
                checked={checked}
                disabled={actionLogPendingId === actionId}
                onChange={(event) =>
                  handleActionLogToggle({
                    actionId,
                    title: item,
                    focusArea,
                    applied: event.target.checked,
                  })
                }
              />
              <div className="flex-1">
                <p className={`font-medium ${checked ? "text-emerald-700 line-through" : "text-gray-700"}`}>{item}</p>
                <p className="text-[10px] text-gray-500">{checked ? `実行済み${updatedLabel ? `（${updatedLabel}）` : ""}` : "未実行"}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

