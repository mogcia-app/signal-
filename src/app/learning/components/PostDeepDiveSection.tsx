"use client";

import Link from "next/link";
import { History } from "lucide-react";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { getLabEditorHref, getAnalyticsHref } from "@/utils/links";
import type { PatternSignal, PostInsight } from "../types";
import type { AIActionLog } from "@/types/ai";
import { renderSignificanceBadge } from "../utils";
import { InfoTooltip } from "./InfoTooltip";

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
      <section className="border border-gray-200 bg-white p-6 mb-6">
        <div className="flex items-center justify-center py-8 text-gray-700">
          <div className="w-5 h-5 border-2 border-[#ff8a15] border-t-transparent rounded-full animate-spin mr-2" />
          <span className="text-sm">投稿ディープダイブを読み込んでいます...</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="border border-gray-200 bg-white p-6 mb-6">
        <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      </section>
    );
  }

  if (!signals.length) {
    return (
      <section className="border border-gray-200 bg-white p-6 mb-6">
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
    <section className="border border-gray-200 bg-white p-6 mb-6">
      <div className="flex items-start sm:items-center justify-between gap-4 mb-4 flex-col sm:flex-row">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#ff8a15] flex items-center justify-center flex-shrink-0">
              <History className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">投稿ディープダイブ</h2>
          </div>
          <p className="mt-2 text-sm text-gray-700">
            投稿ごとの指標やクラスタ比較を深掘りし、AIが導き出した強み・改善点・次の一手を確認できます。
          </p>
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 text-xs text-blue-800">
            <p className="font-semibold mb-1">📊 このセクションの見方</p>
            <ul className="space-y-1 list-disc list-inside ml-2">
              <li><strong>指標の強み</strong>: この投稿が平均と比べてどの指標が優れているかを表示</li>
              <li><strong>クラスタと類似投稿</strong>: 似た特徴を持つ投稿群との比較結果</li>
              <li><strong>AIサマリー</strong>: 投稿の強み・改善点・次のアクションをAIが分析</li>
            </ul>
          </div>
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
                  <div className="flex items-center justify-end gap-1">
                    <span>クラスタ:</span>
                    <span className="font-semibold text-gray-700">{cluster.label}</span>
                    <InfoTooltip text="この投稿が属するクラスタ（似た特徴を持つ投稿グループ）の名前です。" />
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <span>同クラスタ比較:</span>
                    <span className={`font-semibold ${
                      (signal.comparisons?.clusterPerformanceDiff ?? 0) > 0 ? "text-emerald-600" : 
                      (signal.comparisons?.clusterPerformanceDiff ?? 0) < 0 ? "text-red-600" : "text-gray-700"
                    }`}>
                      {Math.round((signal.comparisons?.clusterPerformanceDiff ?? 0) * 100) > 0 ? "+" : ""}
                      {Math.round((signal.comparisons?.clusterPerformanceDiff ?? 0) * 100)}%
                    </span>
                    <InfoTooltip text="同じクラスタ内の他の投稿と比べて、この投稿のパフォーマンスが何%高い（または低い）かを示します。プラスは良い結果、マイナスは改善の余地があることを示します。" />
                  </div>
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
                  <div className="flex items-center gap-1 mb-2">
                    <p className="font-semibold text-gray-700">指標の強み</p>
                    <InfoTooltip text="この投稿が過去の平均と比べて、どの指標が優れているかを表示します。「平均よりも高い」は良い結果、「平均より低い」は改善の余地があることを示します。" />
                  </div>
                  <div className="space-y-2">
                    {renderSignificanceBadge("リーチ差分", comparisons.reachDiff, significance.reach)}
                    {renderSignificanceBadge("エンゲージ差分", comparisons.engagementRateDiff, significance.engagement)}
                    {renderSignificanceBadge("保存率差分", comparisons.savesRateDiff, significance.savesRate)}
                  </div>
                </div>
                <div className="border border-dashed border-gray-200 rounded-none p-3 bg-gray-50">
                  <div className="flex items-center gap-1 mb-2">
                    <p className="font-semibold text-gray-700">クラスタと類似投稿</p>
                    <InfoTooltip text="クラスタとは、似た特徴（ハッシュタグ、投稿タイプ、テーマなど）を持つ投稿のグループです。同じクラスタ内の投稿と比較することで、この投稿の相対的なパフォーマンスがわかります。" />
                  </div>
                  <div className="mb-2 p-2 bg-white border border-gray-200 rounded-none">
                    <p className="text-[10px] text-gray-500 mb-1">クラスタ平均 vs この投稿</p>
                    <p className="text-xs">
                      <span className="font-semibold">平均: {cluster.baselinePerformance.toFixed(2)}</span> / 
                      <span className="font-semibold text-blue-600"> この投稿: {metrics.totalEngagement}</span>
                    </p>
                  </div>
                  {cluster.similarPosts.length ? (
                    <div>
                      <p className="text-[10px] text-gray-500 mb-1">類似投稿（パフォーマンス順）</p>
                      <ul className="space-y-1 list-disc list-inside text-[11px]">
                        {cluster.similarPosts.slice(0, 3).map((similar) => (
                          <li key={`${signal.postId}-similar-${similar.postId}`}>
                            <span className="font-medium">{similar.title}</span> 
                            <span className="text-gray-500"> (スコア: {similar.performanceScore.toFixed(2)})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-[11px]">類似投稿はまだありません。データが蓄積されると表示されます。</p>
                  )}
                </div>
                <div className="border border-dashed border-gray-200 rounded-none p-3 bg-gray-50">
                  <div className="flex items-center gap-1 mb-2">
                    <p className="font-semibold text-gray-700">AIサマリー</p>
                    <InfoTooltip text="この投稿のデータとフィードバックを分析し、AIが強み・改善点・次のアクションを提案します。「AIサマリーを生成」ボタンで最新の分析を取得できます。" />
                  </div>
                  {insight?.summary ? (
                    <div className="mb-3 p-2 bg-white border border-gray-200 rounded-none">
                      <p className="text-gray-700 text-[11px] leading-relaxed">{insight.summary}</p>
                    </div>
                  ) : (
                    <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-none">
                      <p className="text-yellow-800 text-[11px]">
                        AI要約を生成するには、まずフィードバックと分析データを蓄積してください。
                      </p>
                    </div>
                  )}
                  {insight?.strengths?.length ? (
                    <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 rounded-none">
                      <p className="font-semibold text-emerald-800 text-[11px] mb-1">✅ 強み</p>
                      <ul className="list-disc list-inside text-emerald-700 text-[11px] space-y-0.5">
                        {insight.strengths.map((item, idx) => (
                          <li key={`${signal.postId}-strength-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {insight?.improvements?.length ? (
                    <div className="mb-2 p-2 bg-orange-50 border border-orange-200 rounded-none">
                      <p className="font-semibold text-orange-800 text-[11px] mb-1">🔧 改善ポイント</p>
                      <ul className="list-disc list-inside text-orange-700 text-[11px] space-y-0.5">
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

