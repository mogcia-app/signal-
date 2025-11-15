"use client";

import React from "react";
import Link from "next/link";
import { RefreshCw, TrendingUp, TrendingDown, Target, Sparkles, FlaskConical } from "lucide-react";
import type { ABTestResultTag } from "@/types/ab-test";

export type SnapshotInsight = {
  id: string;
  status: "gold" | "negative" | "normal";
  score: number;
  metrics?: {
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    reach?: number;
    engagementRate?: number;
    saveRate?: number;
  };
  deltaMetrics?: Record<string, number>;
  personaInsights?: {
    topGender?: { segment: string; value: number };
    topAgeRange?: { segment: string; value: number };
    summary?: string[];
  };
  textFeatures?: Record<string, string | number | boolean | string[]>;
  source?: { title?: string; postType?: string; hashtags?: string[] };
  createdAt?: string;
  publishedAt?: string;
  experimentNotes?: {
    presetId?: string;
    variant?: string;
    summary?: string;
  };
  abTestResults?: ABTestResultTag[];
};

interface SnapshotInsightsProps {
  snapshots: SnapshotInsight[];
  isLoading?: boolean;
  error?: string;
  onRefresh?: () => void;
  highlightId?: string | null;
  onHighlightClear?: () => void;
}

const statusLabelMap: Record<SnapshotInsight["status"], string> = {
  gold: "ゴールド投稿",
  negative: "ネガティブ投稿",
  normal: "通常投稿",
};

const statusIconMap: Record<SnapshotInsight["status"], React.ReactNode> = {
  gold: <Sparkles className="h-4 w-4 text-amber-500" />,
  negative: <TrendingDown className="h-4 w-4 text-rose-500" />,
  normal: <Target className="h-4 w-4 text-slate-500" />,
};

function SnapshotCard({
  snapshot,
  highlightId,
}: {
  snapshot: SnapshotInsight;
  highlightId?: string | null;
}) {
  const { metrics = {}, deltaMetrics = {}, personaInsights } = snapshot;
  const structureTags = Array.isArray(snapshot.textFeatures?.structureTags)
    ? (snapshot.textFeatures?.structureTags as string[])
    : undefined;
  const showDelta = (key: string) => {
    const value = deltaMetrics[key];
    if (value === undefined || value === null) {return null;}
    const formatted = value > 0 ? `+${value}` : `${value}`;
    const color =
      value > 0 ? "text-emerald-600 bg-emerald-50" : value < 0 ? "text-rose-600 bg-rose-50" : "text-slate-600 bg-slate-100";
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{formatted}</span>
    );
  };

  return (
    <div
      className={`p-4 border rounded-lg space-y-3 transition ring-2 ring-offset-2 ${
        highlightId === snapshot.id ? "ring-indigo-300" : "ring-transparent"
      } ${
        snapshot.status === "gold"
          ? "border-amber-200 bg-amber-50/70"
          : snapshot.status === "negative"
            ? "border-rose-200 bg-rose-50/70"
            : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          {statusIconMap[snapshot.status]}
          <span>{statusLabelMap[snapshot.status]}</span>
        </div>
        <div className="text-xs text-slate-500">
          {snapshot.publishedAt ? new Date(snapshot.publishedAt).toLocaleDateString("ja-JP") : ""}
        </div>
      </div>
      {snapshot.source?.title && (
        <p className="text-sm font-medium text-slate-900 line-clamp-2">{snapshot.source.title}</p>
      )}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-slate-500 text-xs mb-0.5">エンゲージメント率</p>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">{metrics.engagementRate?.toFixed?.(1)}%</span>
            {showDelta("engagementRateDeltaPct")}
          </div>
        </div>
        <div>
          <p className="text-slate-500 text-xs mb-0.5">保存率</p>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">{metrics.saveRate?.toFixed?.(1)}%</span>
            {showDelta("saveRateDeltaPct")}
          </div>
        </div>
        <div>
          <p className="text-slate-500 text-xs mb-0.5">リーチ</p>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">
              {metrics.reach?.toLocaleString?.() ?? "-"}
            </span>
            {showDelta("reachDelta")}
          </div>
        </div>
        <div>
          <p className="text-slate-500 text-xs mb-0.5">保存数</p>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">
              {metrics.saves?.toLocaleString?.() ?? "-"}
            </span>
            {showDelta("savesDelta")}
          </div>
        </div>
      </div>
      {personaInsights?.summary && personaInsights.summary.length > 0 && (
        <div className="text-xs text-slate-600 bg-white/70 border border-slate-100 rounded-md p-2">
          <p className="font-medium text-slate-700 mb-1 flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-slate-500" />
            反応が高いセグメント
          </p>
          <ul className="list-disc list-inside space-y-0.5">
            {personaInsights.summary.map((summary, index) => (
              <li key={`${snapshot.id}-persona-${index}`}>{summary}</li>
            ))}
          </ul>
        </div>
      )}
      {snapshot.textFeatures && (
        <div className="text-xs text-slate-600 flex flex-wrap gap-2">
          {"hashtagsCount" in snapshot.textFeatures && (
            <span className="px-2 py-0.5 bg-white/80 border border-slate-200 rounded-full">
              #{snapshot.textFeatures.hashtagsCount ?? 0}
            </span>
          )}
          {"containsCTA" in snapshot.textFeatures && snapshot.textFeatures.containsCTA && (
            <span className="px-2 py-0.5 bg-white/80 border border-emerald-200 text-emerald-700 rounded-full">
              CTAあり
            </span>
          )}
          {"introStyle" in snapshot.textFeatures && (
            <span className="px-2 py-0.5 bg-white/80 border border-indigo-200 text-indigo-700 rounded-full">
              導入: {snapshot.textFeatures.introStyle}
            </span>
          )}
          {structureTags &&
            structureTags.slice(0, 5).map((tag) => (
              <span
                key={`${snapshot.id}-structure-${tag}`}
                className="px-2 py-0.5 bg-white/70 border border-slate-200 rounded-full"
              >
                {tag}
              </span>
            ))}
          {structureTags && structureTags.length > 5 && (
            <span className="px-2 py-0.5 bg-white/70 border border-slate-200 rounded-full">
              +{structureTags.length - 5}
            </span>
          )}
        </div>
      )}
      {snapshot.abTestResults && snapshot.abTestResults.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-md p-3 space-y-2">
          <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
            <FlaskConical className="w-3.5 h-3.5 text-slate-500" />
            A/Bテスト結果
          </p>
          {snapshot.abTestResults.map((result) => (
            <div
              key={`${result.testId}-${result.variantLabel}`}
              className="text-xs text-slate-600 flex items-center justify-between gap-2"
            >
              <div>
                <p className="font-semibold text-slate-900">{result.testName}</p>
                <p className="text-[11px] text-slate-500">
                  {result.variantLabel}
                  {result.result === "win"
                    ? "（勝者）"
                    : result.result === "lose"
                      ? "（敗者）"
                      : ""}
                </p>
              </div>
              {result.metricSummary && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                  {result.metricSummary}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SnapshotInsights({
  snapshots,
  isLoading,
  error,
  onRefresh,
  highlightId,
  onHighlightClear,
}: SnapshotInsightsProps) {
  const goldSnapshots = snapshots.filter((snapshot) => snapshot.status === "gold").slice(0, 3);
  const negativeSnapshots = snapshots
    .filter((snapshot) => snapshot.status === "negative")
    .slice(0, 3);
  const containerRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  React.useEffect(() => {
    if (highlightId && containerRefs.current[highlightId]) {
      containerRefs.current[highlightId]?.scrollIntoView({ behavior: "smooth", block: "center" });
      const node = containerRefs.current[highlightId];
      if (node) {
        node.classList.add("ring-2", "ring-amber-400");
        const timer = setTimeout(() => {
          node.classList.remove("ring-2", "ring-amber-400");
          onHighlightClear?.();
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [highlightId, onHighlightClear]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">AIが捉えた成功パターン</p>
          <p className="text-xs text-slate-500">
            ゴールド/ネガティブ投稿から切り口・優先度を抽出します
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/learning"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold text-slate-700 border border-slate-300 bg-white px-2.5 py-1 rounded-none hover:bg-slate-50 transition-colors"
          >
            学習ダッシュボードへ
          </Link>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1 text-xs text-slate-600 border border-slate-200 px-2.5 py-1 rounded-md hover:bg-slate-50 disabled:opacity-50"
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            更新
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="py-6 text-center text-sm text-slate-500">分析データを取得中です...</div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-md border border-rose-100 mb-3">
          {error}
        </div>
      )}

      {!isLoading && snapshots.length === 0 && !error && (
        <div className="py-6 text-center text-sm text-slate-500">
          まだ分析済みの投稿がありません。投稿後に AI が自動で学習します。
        </div>
      )}

      <div className="space-y-4">
        {goldSnapshots.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-amber-700 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> ゴールド投稿
            </p>
            <div className="space-y-3">
              {goldSnapshots.map((snapshot) => (
                <div
                  key={snapshot.id}
                  ref={(el) => {
                    containerRefs.current[snapshot.id] = el;
                  }}
                >
                  <SnapshotCard snapshot={snapshot} />
                </div>
              ))}
            </div>
          </div>
        )}

        {negativeSnapshots.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-rose-700 flex items-center gap-1">
              <TrendingDown className="h-3.5 w-3.5" /> ネガティブ投稿
            </p>
            <div className="space-y-3">
              {negativeSnapshots.map((snapshot) => (
                <div
                  key={snapshot.id}
                  ref={(el) => {
                    containerRefs.current[snapshot.id] = el;
                  }}
                >
                  <SnapshotCard snapshot={snapshot} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

