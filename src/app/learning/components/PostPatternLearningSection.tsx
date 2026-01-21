"use client";

import type { PatternTag, PostPatternInsights, PatternSignal } from "../types";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { Target, Sparkles } from "lucide-react";

interface PostPatternLearningSectionProps {
  patternInsights?: PostPatternInsights | null;
  patternCounts: Record<PatternTag, number>;
  goldSampleSignals: PatternSignal[];
  topHashtagEntries: Array<[string, number]>;
  isLoading: boolean;
  error: string | null;
  tagMeta: Record<
    PatternTag,
    {
      label: string;
      description: string;
      caption: string;
      headerBg: string;
      iconTint: string;
      railClass?: string;
    }
  >;
}

export function PostPatternLearningSection({
  patternInsights,
  patternCounts,
  goldSampleSignals,
  topHashtagEntries,
  isLoading,
  error,
  tagMeta,
}: PostPatternLearningSectionProps) {
  if (isLoading) {
    return (
      <section className="border border-gray-200 bg-white p-6 mb-6">
        <div className="flex items-center justify-center py-10 text-gray-700">
          <div className="w-5 h-5 border-2 border-[#ff8a15] border-t-transparent rounded-full animate-spin mr-2" />
          <span className="text-sm">投稿パターンを学習中です...</span>
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

  if (!patternInsights || Object.keys(patternInsights.summaries || {}).length === 0) {
    return (
      <section className="border border-gray-200 bg-white p-6 mb-6">
        <EmptyStateCard
          icon={Target}
          tone="info"
          title="投稿パターンの抽出はこれから"
          description="投稿結果とフィードバックが十分に蓄積されると、AIが成功・惜しい・改善のパターンを自動で整理します。まずは記録を重ねていきましょう。"
          actions={[{ label: "投稿一覧を見る", href: "/instagram/posts" }]}
        />
      </section>
    );
  }

  return (
    <section className="border border-gray-200 bg-white p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">投稿パターン学習</h2>
          <p className="text-sm text-gray-700">
            KPIと満足度の両面から自動抽出した投稿パターンです。成功パターンを再現しつつ、惜しい投稿の改善点を確認できます。
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.keys(tagMeta) as PatternTag[]).map((tag) => {
            const summary = patternInsights.summaries?.[tag];
            const count = patternCounts[tag] || 0;
            if (!summary && count === 0) {
              return null;
            }
            const meta = tagMeta[tag];
            return (
              <div
                key={tag}
                className="relative border border-slate-200 rounded-none p-4 bg-white flex flex-col gap-3 pt-6"
              >
                {tag === "gold" ? (
                  <span className="absolute -top-2 left-4 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-white border border-amber-200 px-2 py-0.5 rounded-full shadow-sm">
                    <Sparkles className="w-3 h-3" />
                    成功バッジ
                  </span>
                ) : null}
                <div className="flex items-start justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">
                    {meta.label}
                  </span>
                  <span>件数: {count}</span>
                </div>
                <p className="text-sm text-slate-800">{meta.description}</p>
                {summary?.summary ? (
                  <div className="text-xs text-slate-600 border border-slate-200 bg-slate-50 p-3 rounded-none">
                    <p className="text-[11px] font-semibold text-slate-700 mb-1">要約</p>
                    <p className="leading-relaxed">{summary.summary.trim()}</p>
                  </div>
                ) : null}
                {summary?.keyThemes?.length ? (
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1">共通点</p>
                    <ul className="text-xs text-slate-600 space-y-1">
                      {summary.keyThemes.slice(0, 3).map((theme, idx) => (
                        <li key={`${tag}-theme-${idx}`}>・{theme}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {summary?.suggestedAngles?.length ? (
                  <div className="rounded-none border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-700 mb-1">次に活かす視点</p>
                    <ul className="text-xs text-slate-600 space-y-1">
                      {summary.suggestedAngles.slice(0, 2).map((angle, idx) => (
                        <li key={`${tag}-angle-${idx}`}>・{angle}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {summary?.cautions?.length && tag !== "gold" ? (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-slate-600 mb-1">注意点</p>
                    <ul className="text-xs text-slate-600 space-y-1">
                      {summary.cautions.slice(0, 2).map((item, idx) => (
                        <li key={`${tag}-caution-${idx}`}>・{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {tag === "gold" && goldSampleSignals.length > 0 && (
                  <div className="mt-3 rounded-none border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold text-slate-800 mb-2">勝ちパターン例</p>
                    <div className="space-y-2">
                      {goldSampleSignals.map((signal) => {
                        const er = typeof signal.engagementRate === "number" ? signal.engagementRate : 0;
                        const savesRate = typeof signal.metrics?.savesRate === "number" ? signal.metrics.savesRate : 0;
                        const comparisonDiff =
                          typeof signal.comparisons?.engagementRateDiff === "number"
                            ? signal.comparisons.engagementRateDiff
                            : 0;
                        return (
                          <div key={`gold-sample-${signal.postId}`} className="text-xs text-slate-700 border border-slate-200 bg-white px-3 py-2">
                            <p className="font-semibold text-slate-900">{signal.title || "タイトル未設定"}</p>
                            <p className="text-[11px] text-slate-500 mb-1">
                              ER {er.toFixed(1)}% / 保存率 {(savesRate * 100).toFixed(1)}%
                            </p>
                            <p className="text-[11px] text-slate-500">
                              貢献: {comparisonDiff > 0 ? "+" : ""}
                              {(comparisonDiff * 100).toFixed(1)}pt vs クラスタ
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {topHashtagEntries.length ? (
          <div className="border border-dashed border-slate-300 rounded-none p-4 bg-slate-50">
            <p className="text-xs font-semibold text-slate-600 mb-2">よく使われたハッシュタグ（重み順）</p>
            <div className="flex flex-wrap gap-2">
              {topHashtagEntries.map(([tag, weight]) => (
                <span
                  key={`hashtag-${tag}`}
                  className="px-3 py-1 text-xs font-medium bg-white border border-slate-200 rounded-none text-slate-700"
                >
                  #{tag} <span className="text-[11px] text-gray-500">×{weight.toFixed(2)}</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

