"use client";

import React from "react";
import Link from "next/link";
import { Activity, BarChart3, BookmarkCheck, Sparkles, TrendingDown, FlaskConical } from "lucide-react";
import { getLabEditorHref, getAnalyticsHref } from "@/utils/links";
import type { ABTestResultTag } from "@/types/ab-test";

type SnapshotReference = {
  id: string;
  status: "gold" | "negative" | "normal";
  summary?: string;
};

type AnalyticsSummary = {
  likes?: number;
  comments?: number;
  saves?: number;
  reach?: number;
  followerIncrease?: number;
  engagementRate?: number;
} | null;

type ReportPost = {
  id: string;
  title: string;
  postType: "feed" | "reel" | "story";
  createdAt?: string | Date | { toDate: () => Date };
  analyticsSummary?: AnalyticsSummary;
  snapshotReferences?: SnapshotReference[];
  textFeatures?: Record<string, unknown>;
  abTestResults?: ABTestResultTag[];
};

type PatternHighlights = {
  gold?: SnapshotReference[];
  negative?: SnapshotReference[];
};

interface PostDeepDiveSectionProps {
  posts?: ReportPost[];
  patternHighlights?: PatternHighlights;
  unifiedTotalPosts?: number; // total posts derived/augmented by AI or summary
}

const badgeConfig: Record<
  SnapshotReference["status"],
  { label: string; className: string; icon: React.ReactNode }
> = {
  gold: {
    label: "ゴールド",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: <Sparkles className="w-3.5 h-3.5 text-amber-500" />,
  },
  negative: {
    label: "改善",
    className: "bg-rose-50 text-rose-700 border border-rose-200",
    icon: <TrendingDown className="w-3.5 h-3.5 text-rose-500" />,
  },
  normal: {
    label: "参考",
    className: "bg-slate-50 text-slate-600 border border-slate-200",
    icon: <BarChart3 className="w-3.5 h-3.5 text-slate-500" />,
  },
};

function formatDateLabel(value?: string | Date | { toDate: () => Date }) {
  if (!value) {
    return "";
  }
  if (value instanceof Date) {
    return value.toLocaleDateString("ja-JP");
  }
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toLocaleDateString("ja-JP");
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleDateString("ja-JP");
  }
  return "";
}

const postTypeLabel: Record<ReportPost["postType"], string> = {
  feed: "フィード",
  reel: "リール",
  story: "ストーリーズ",
};

function MetricCell({ label, value }: { label: string; value?: number }) {
  return (
    <div>
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">
        {typeof value === "number" && !Number.isNaN(value) ? value.toLocaleString("ja-JP") : "-"}
      </p>
    </div>
  );
}

export function PostDeepDiveSection({ posts, patternHighlights, unifiedTotalPosts }: PostDeepDiveSectionProps) {
  const postsToShow = posts?.slice(0, 4) ?? [];
  const hasPatternHighlights =
    (patternHighlights?.gold && patternHighlights.gold.length > 0) ||
    (patternHighlights?.negative && patternHighlights.negative.length > 0);

  // If AI/summary says total posts are zero, hide the section entirely
  if ((unifiedTotalPosts ?? 0) === 0) {
    return null;
  }

  // If there are posts (per unified count) but none to show and no highlights, render a friendly empty state
  if (postsToShow.length === 0 && !hasPatternHighlights) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-none p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">投稿ディープダイブ</p>
          <p className="text-xs text-slate-500">
            投稿実績・AI参照元・主要KPIをワンビューで確認できます
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {postsToShow.length === 0 ? (
            <div className="border border-dashed border-slate-200 bg-slate-50/40 p-6 text-sm text-slate-500">
              投稿は存在しますが、深掘り対象となる投稿がまだありません。
            </div>
          ) : (
            postsToShow.map((post) => {
              const analytics = post.analyticsSummary;
              const snapshotRefs = post.snapshotReferences || [];
              const labHref = getLabEditorHref(post.postType, post.id);
              const analyticsHref = getAnalyticsHref(post.postType, post.id);
              const textFeatures = post.textFeatures as
                | (Record<string, string | number | boolean | string[]> & {
                    structureTags?: string[];
                    ctaType?: string;
                  })
                | undefined;
              const structureTags = Array.isArray(textFeatures?.structureTags)
                ? textFeatures?.structureTags
                : undefined;
              return (
                <div key={post.id} className="border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">
                        {postTypeLabel[post.postType]}・{formatDateLabel(post.createdAt)}
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {post.title || "無題の投稿"}
                      </p>
                    </div>
                    {snapshotRefs.length > 0 && (
                      <div className="flex flex-wrap justify-end gap-1">
                        {snapshotRefs.slice(0, 3).map((reference) => {
                          const config = badgeConfig[reference.status];
                          return (
                            <span
                              key={`${post.id}-${reference.id}`}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${config.className}`}
                            >
                              {config.icon}
                              {config.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {analytics ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <MetricCell label="いいね" value={analytics.likes} />
                      <MetricCell label="保存" value={analytics.saves} />
                      <MetricCell label="リーチ" value={analytics.reach} />
                      <MetricCell label="フォロワー増加" value={analytics.followerIncrease} />
                      <div>
                        <p className="text-[11px] text-slate-500">エンゲージメント率</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {typeof analytics.engagementRate === "number"
                            ? `${analytics.engagementRate.toFixed(1)}%`
                            : "-"}
                        </p>
                      </div>
                      <MetricCell label="コメント" value={analytics.comments} />
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-200 px-3 py-2 rounded">
                      まだ分析データが紐付いていません。分析ページから登録すると実績が表示されます。
                    </p>
                  )}
                  {(structureTags && structureTags.length > 0) ||
                  textFeatures?.ctaType ||
                  textFeatures?.introStyle ? (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {textFeatures?.introStyle && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700">
                          導入: {String(textFeatures.introStyle)}
                        </span>
                      )}
                      {textFeatures?.ctaType && textFeatures.ctaType !== "none" && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                          CTA: {textFeatures.ctaType === "conversion" ? "コンバージョン" : "エンゲージ"}
                        </span>
                      )}
                      {structureTags &&
                        structureTags.slice(0, 6).map((tag) => (
                          <span
                            key={`${post.id}-structure-${tag}`}
                            className="text-[11px] px-2 py-0.5 rounded-full border border-slate-200 bg-white text-slate-600"
                          >
                            {tag}
                          </span>
                        ))}
                      {structureTags && structureTags.length > 6 && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full border border-slate-200 bg-white text-slate-500">
                          +{structureTags.length - 6}
                        </span>
                      )}
                    </div>
                  ) : null}
                  {post.abTestResults && post.abTestResults.length > 0 && (
                    <div className="bg-white border border-slate-100 rounded-md p-3 space-y-2">
                      <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <FlaskConical className="w-3.5 h-3.5 text-slate-500" />
                        A/Bテスト連動
                      </p>
                      {post.abTestResults.slice(0, 2).map((test) => (
                        <div
                          key={`${post.id}-${test.testId}-${test.variantLabel}`}
                          className="text-xs text-slate-600 border border-slate-200 rounded-md p-2 bg-slate-50"
                        >
                          <p className="text-sm font-semibold text-slate-900">{test.testName}</p>
                          <p className="text-[11px] text-slate-500">
                            {test.variantLabel}
                            {test.result === "win"
                              ? "（勝者）"
                              : test.result === "lose"
                                ? "（敗者）"
                                : ""}
                          </p>
                          {test.metricSummary && (
                            <p className="text-[11px] text-slate-500 mt-1">{test.metricSummary}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {labHref && (
                      <Link
                        href={labHref}
                        className="text-[11px] font-semibold text-white bg-slate-900 px-3 py-1 rounded-none hover:bg-slate-800 transition-colors"
                      >
                        Labで開く
                      </Link>
                    )}
                    <Link
                      href={`/instagram/posts/${post.id}`}
                      className="text-[11px] font-semibold text-slate-700 border border-slate-300 bg-white px-3 py-1 rounded-none hover:bg-slate-100 transition-colors"
                    >
                      投稿詳細
                    </Link>
                    {analyticsHref && (
                      <Link
                        href={analyticsHref}
                        className="text-[11px] font-semibold text-slate-700 border border-slate-300 bg-white px-3 py-1 rounded-none hover:bg-slate-100 transition-colors"
                      >
                        分析で開く
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-4">
          <div className="border border-slate-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-slate-700 flex items-center gap-2 mb-3">
              <BookmarkCheck className="w-4 h-4 text-slate-500" />
              成功/改善パターン
            </p>

            {hasPatternHighlights ? (
              <div className="space-y-3">
                {(patternHighlights?.gold || []).slice(0, 3).map((reference) => (
                  <div key={`gold-${reference.id}`} className="text-xs text-slate-700">
                    <p className="font-semibold text-amber-700 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      成功パターン
                    </p>
                    <p className="text-slate-600 mt-1">{reference.summary}</p>
                  </div>
                ))}
                {(patternHighlights?.negative || []).slice(0, 3).map((reference) => (
                  <div key={`negative-${reference.id}`} className="text-xs text-slate-700">
                    <p className="font-semibold text-rose-700 flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5" />
                      改善ポイント
                    </p>
                    <p className="text-slate-600 mt-1">{reference.summary}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                ゴールド/ネガティブ投稿がまだ抽出されていません。スナップショットが増えると自動で表示されます。
              </p>
            )}
          </div>

          <div className="border border-slate-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-slate-700 flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-slate-500" />
              次月に向けた注目ポイント
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              ゴールド投稿の成功要素とネガティブ投稿の注意点を即座に比較し、来月の重点KPIや企画テーマに反映できます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

