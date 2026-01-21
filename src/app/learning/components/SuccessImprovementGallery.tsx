"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Crown, AlertTriangle, Sparkles } from "lucide-react";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { getLabEditorHref } from "@/utils/links";
import type { PatternSignal, PostPatternInsights } from "../types";
import { sentimentColorMap, sentimentLabelMap, renderSignificanceBadge } from "../utils";
import { InfoTooltip } from "./InfoTooltip";

interface SuccessImprovementGalleryProps {
  goldSignals: PatternSignal[];
  redSignals: PatternSignal[];
  patternInsights?: PostPatternInsights | null;
  isLoading: boolean;
  error: string | null;
}

export function SuccessImprovementGallery({
  goldSignals,
  redSignals,
  patternInsights,
  isLoading,
  error,
}: SuccessImprovementGalleryProps) {
  return (
    <section className="border border-gray-200 bg-white p-6 mb-6">
      <div className="flex items-start sm:items-center justify-between gap-4 mb-4 flex-col sm:flex-row">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#ff8a15] flex items-center justify-center flex-shrink-0">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">成功 & 改善投稿ギャラリー</h2>
            <InfoTooltip text="ゴールド投稿（成功パターン）とレッド投稿（改善余地があるパターン）を一覧で確認できます。" />
          </div>
          <p className="mt-2 text-sm text-gray-700">
            ゴールド（成功）とレッド（改善が必要）投稿をピックアップしました。AIが学習したポイントを振り返り、次の投稿に活かしましょう。
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-gray-700">
          <div className="w-5 h-5 border-2 border-[#ff8a15] border-t-transparent rounded-full animate-spin mr-2" />
          <span className="text-sm">投稿パターンを分析中です...</span>
        </div>
      ) : error ? (
        <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : !patternInsights || patternInsights.signals.length === 0 ? (
        <EmptyStateCard
          icon={Sparkles}
          title="投稿パターンを蓄積していきましょう"
          description="投稿やフィードバックが集まると、成功・改善パターンをAIが自動で抽出します。まずは投稿記録とフィードバック入力を続けましょう。"
          actions={[
            { label: "投稿一覧を見る", href: "/instagram/posts" },
            { label: "フィードバックを入力", href: "/analytics/feed" },
          ]}
        />
      ) : (
        <div className="space-y-6">
          <SuccessGrid title="成功パターン（GOLD）" icon={<Crown className="h-4 w-4 text-amber-500" />} signals={goldSignals} tone="gold" />
          <SuccessGrid title="改善優先パターン（RED）" icon={<AlertTriangle className="h-4 w-4 text-red-500" />} signals={redSignals} tone="red" />
        </div>
      )}
    </section>
  );
}

interface SuccessGridProps {
  title: string;
  icon: ReactNode;
  signals: PatternSignal[];
  tone: "gold" | "red";
}

const toneStyles = {
  gold: {
    border: "border-slate-200",
    badge: "text-slate-500",
    hashtag: "bg-slate-50 border-slate-200 text-slate-600",
    button: "text-slate-700 border-slate-300 hover:bg-slate-100",
    metricBg: "border-slate-100 bg-slate-50",
    hintBg: "border-slate-200 bg-slate-50",
  },
  red: {
    border: "border-slate-200",
    badge: "text-slate-500",
    hashtag: "bg-slate-50 border-slate-200 text-slate-600",
    button: "text-slate-700 border-slate-300 hover:bg-slate-100",
    metricBg: "border-slate-100 bg-slate-50",
    hintBg: "border-slate-200 bg-slate-50",
  },
} as const;

function SuccessGrid({ title, icon, signals, tone }: SuccessGridProps) {
  const styles = toneStyles[tone];
  const emptyContent =
    tone === "gold"
      ? {
          title: "ゴールドパターンはまだありません",
          description:
            "高評価と成果がそろった投稿が蓄積されると、ここに成功パターンが並びます。引き続き投稿とフィードバックを重ねていきましょう。",
          actions: [{ label: "投稿を振り返る", href: "/instagram/posts" }],
        }
      : {
          title: "改善優先パターンはまだありません",
          description:
            "改善すべき投稿が蓄積されると、注意すべきポイントがここに表示されます。気になる投稿にはフィードバックを残しておきましょう。",
          actions: [{ label: "分析ページを開く", href: "/analytics/feed" }],
        };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      {signals.length === 0 ? (
        <EmptyStateCard icon={tone === "gold" ? Sparkles : AlertTriangle} tone={tone === "gold" ? "info" : "warning"} align="left" title={emptyContent.title} description={emptyContent.description} actions={emptyContent.actions} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {signals.map((signal) => {
            const analyticsHref = signal.postId
              ? signal.category === "reel"
                ? `/instagram/analytics/reel?postId=${signal.postId}`
                : `/analytics/feed?postId=${signal.postId}`
              : "#";
            const labHref = getLabEditorHref(signal.category, signal.postId);

            return (
              <div
                key={`${tone}-${signal.postId}`}
                className={`relative border ${styles.border} bg-white rounded-none p-4 pt-6`}
              >
                {tone === "gold" && (
                  <span className="absolute -top-2 left-4 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-white border border-amber-200 px-2 py-0.5 rounded-full shadow-sm">
                    <Sparkles className="w-3 h-3" />
                    成功バッジ
                  </span>
                )}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={`text-[10px] tracking-wide uppercase ${styles.badge}`}>
                    {signal.category}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    KPI {signal.kpiScore.toFixed(2)}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-slate-900 line-clamp-2 mb-3">
                  {signal.title || "タイトル未設定"}
                </h4>
                <div
                  className={`grid grid-cols-2 gap-3 text-xs text-slate-600 border ${styles.metricBg} p-3 rounded-none`}
                >
                  <Metric label="ER" value={`${signal.engagementRate.toFixed(1)}%`} />
                  <Metric label="保存率" value={formatRate(signal.metrics?.savesRate)} />
                  <Metric label="コメント率" value={formatRate(signal.metrics?.commentsRate)} />
                  <Metric label="クラスタ比較" value={formatDiff(signal.comparisons?.engagementRateDiff, { signed: true })} />
                </div>
                <p className={`text-xs font-medium mt-3 ${sentimentColorMap[signal.sentimentLabel]}`}>
                  {sentimentLabelMap[signal.sentimentLabel]} ({signal.sentimentScore.toFixed(2)})
                </p>
                {tone === "red" && signal.feedbackCounts ? (
                  <p className="text-xs text-gray-600 mt-2">
                    ポジティブ {signal.feedbackCounts.positive}件 / ネガティブ {signal.feedbackCounts.negative}件
                  </p>
                ) : null}
                {tone === "red" ? (
                  <div className={`mt-3 rounded-none ${styles.hintBg} p-3 space-y-1 text-xs text-slate-700`}>
                    <p className="font-semibold text-slate-900">改善ヒント</p>
                    <p>・リーチ差分: {formatDiff(signal.comparisons?.reachDiff, { signed: true })}</p>
                    <p>・保存/コメント率に課題。導入とCTAを簡潔にして再テスト。</p>
                  </div>
                ) : (
                  <div className="space-y-1 mt-2">
                    {renderSignificanceBadge("リーチ差分", signal.comparisons?.reachDiff, signal.significance?.reach)}
                    {renderSignificanceBadge("エンゲージ差分", signal.comparisons?.engagementRateDiff, signal.significance?.engagement)}
                    {renderSignificanceBadge("保存率差分", signal.comparisons?.savesRateDiff, signal.significance?.savesRate)}
                  </div>
                )}

                {signal.hashtags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {signal.hashtags.slice(0, 4).map((tag) => (
                      <span key={`${signal.postId}-${tag}`} className={`px-2 py-1 text-[11px] font-medium rounded-none border ${styles.hashtag}`}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {signal.postId ? (
                    <>
                      {labHref && (
                        <Link
                          href={labHref}
                          target="_blank"
                          className="text-[11px] font-semibold text-slate-800 border border-slate-300 bg-white px-3 py-1 rounded-none hover:bg-slate-100 transition-colors"
                        >
                          {tone === "gold" ? "Labで再編集" : "Labで改善案を作る"}
                        </Link>
                      )}
                      <Link href={`/instagram/posts/${signal.postId}`} target="_blank" className={`text-[11px] font-semibold border bg-white px-3 py-1 rounded-none transition-colors ${styles.button}`}>
                        投稿詳細を見る
                      </Link>
                      <Link href={analyticsHref} target="_blank" className="text-[11px] font-semibold text-slate-700 border border-slate-300 bg-white px-3 py-1 rounded-none hover:bg-slate-100 transition-colors">
                        分析で開く
                      </Link>
                    </>
                  ) : (
                    <span className="text-[11px] text-gray-400">関連する投稿IDがありません</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatRate(value?: number) {
  if (typeof value !== "number") {
    return "-";
  }
  return `${(value * 100).toFixed(1)}%`;
}

function formatDiff(value?: number, options: { signed?: boolean } = {}) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "データ不足";
  }
  const { signed = false } = options;
  const formatted = (value * 100).toFixed(1);
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${formatted}ポイント`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

