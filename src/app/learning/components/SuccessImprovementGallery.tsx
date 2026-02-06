"use client";

import type { ReactNode } from "react";
import { Crown, AlertTriangle, Sparkles } from "lucide-react";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import type { PatternSignal, PostPatternInsights } from "../types";

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
            <h2 className="text-lg font-bold text-gray-900">目標達成見込み別投稿ギャラリー</h2>
          </div>
          <p className="mt-2 text-sm text-gray-700">
            目標達成見込みが高い投稿と低い投稿をピックアップしました。
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
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              🎯 目標達成見込み: 高
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              AIが見つけた、計画や今月の方針に沿って目標達成が見込める投稿です。次の投稿に活かしましょう。
            </p>
            <SuccessGrid title="" icon={<Crown className="h-4 w-4 text-amber-500" />} signals={goldSignals} tone="gold" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              🎯 目標達成見込み: 低
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              AIが見つけた、計画や今月の方針から乖離しており、目標達成が困難な投稿です。
            </p>
            <SuccessGrid title="" icon={<AlertTriangle className="h-4 w-4 text-red-500" />} signals={redSignals} tone="red" />
          </div>
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
          title: "目標達成見込み: 高の投稿はまだありません",
          description:
            "計画や今月の方針に沿って目標達成が見込める投稿が蓄積されると、ここに表示されます。引き続き投稿とフィードバックを重ねていきましょう。",
          actions: [{ label: "投稿を振り返る", href: "/instagram/posts" }],
        }
      : {
          title: "目標達成見込み: 低の投稿はまだありません",
          description:
            "計画や今月の方針から乖離しており、目標達成が困難な投稿が蓄積されると、注意すべきポイントがここに表示されます。気になる投稿にはフィードバックを残しておきましょう。",
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
            return (
              <div
                key={`${tone}-${signal.postId}`}
                className={`relative border ${styles.border} bg-white rounded-none p-4 pt-6`}
              >
                {tone === "gold" && (
                  <span className="absolute -top-2 left-4 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-white border border-amber-200 px-2 py-0.5 rounded-full shadow-sm">
                    <Sparkles className="w-3 h-3" />
                    目標達成見込み: 高
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

                {signal.hashtags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {signal.hashtags.slice(0, 4).map((tag) => (
                      <span key={`${signal.postId}-${tag}`} className={`px-2 py-1 text-[11px] font-medium rounded-none border ${styles.hashtag}`}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

