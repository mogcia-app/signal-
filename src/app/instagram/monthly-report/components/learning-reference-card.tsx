"use client";

import React, { useMemo } from "react";
import { Brain, Layers, ListChecks, Target, Award, Sparkles } from "lucide-react";
import type { AIReference } from "@/types/ai";
import { getLearningPhaseLabel } from "@/utils/learningPhase";

type SnapshotReference = {
  id: string;
  status: "gold" | "negative" | "normal";
  summary?: string;
};

type MasterContextSummary = {
  learningPhase?: string;
  ragHitRate?: number;
  totalInteractions?: number;
  feedbackStats?: {
    total?: number;
    positiveRate?: number;
  } | null;
  actionStats?: {
    total?: number;
    adoptionRate?: number;
  } | null;
  achievements?: Array<{
    id: string;
    title: string;
    description: string;
    status?: string;
    progress?: number;
  }> | null;
} | null;

type LearningContext = {
  references?: AIReference[];
  snapshotReferences?: SnapshotReference[];
  masterContext?: MasterContextSummary;
} | null;

interface LearningReferenceCardProps {
  learningContext?: LearningContext;
}

const sourceTypeLabel: Record<AIReference["sourceType"], string> = {
  profile: "アカウント設定",
  plan: "運用計画",
  masterContext: "マスターコンテキスト",
  snapshot: "投稿スナップショット",
  feedback: "フィードバック",
  analytics: "アナリティクス",
  manual: "その他",
};

const sourceIconMap: Record<AIReference["sourceType"], React.ReactNode> = {
  profile: <Target className="w-3.5 h-3.5 text-slate-500" />,
  plan: <Layers className="w-3.5 h-3.5 text-slate-500" />,
  masterContext: <Brain className="w-3.5 h-3.5 text-slate-500" />,
  snapshot: <Sparkles className="w-3.5 h-3.5 text-amber-500" />,
  feedback: <ListChecks className="w-3.5 h-3.5 text-emerald-500" />,
  analytics: <Target className="w-3.5 h-3.5 text-indigo-500" />,
  manual: <Layers className="w-3.5 h-3.5 text-slate-500" />,
};

export function LearningReferenceCard({ learningContext }: LearningReferenceCardProps) {
  const masterContext = learningContext?.masterContext;
  const snapshotRefs = learningContext?.snapshotReferences ?? [];
  const references = learningContext?.references ?? [];

  const nonSnapshotReferences = useMemo(
    () => references.filter((ref) => ref.sourceType !== "snapshot").slice(0, 6),
    [references]
  );

  if (!masterContext && nonSnapshotReferences.length === 0 && snapshotRefs.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-none p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">AI学習リファレンス</p>
          <p className="text-xs text-slate-500">
            今月のAIがどのデータを参照して提案を出したかを可視化します
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {masterContext ? (
          <div className="border border-slate-200 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-700 flex items-center gap-2">
              <Brain className="w-4 h-4 text-slate-500" />
              マスターコンテキスト
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
              <div>
                  <p className="text-[11px] text-slate-500">フェーズ</p>
                  <p className="font-semibold text-slate-900">
                    {getLearningPhaseLabel(masterContext.learningPhase)}
                  </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">RAGヒット率</p>
                <p className="font-semibold text-slate-900">
                  {typeof masterContext.ragHitRate === "number"
                    ? `${Math.round(masterContext.ragHitRate * 100)}%`
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">累計インタラクション</p>
                <p className="font-semibold text-slate-900">
                  {masterContext.totalInteractions?.toLocaleString("ja-JP") ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">フィードバック好感度</p>
                <p className="font-semibold text-slate-900">
                  {typeof masterContext.feedbackStats?.positiveRate === "number"
                    ? `${Math.round(masterContext.feedbackStats.positiveRate * 100)}%`
                    : "-"}
                </p>
              </div>
            </div>
            {masterContext.achievements && masterContext.achievements.length > 0 && (
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[11px] font-semibold text-slate-500 mb-2">学習バッジ</p>
                <div className="flex flex-wrap gap-2">
                  {masterContext.achievements.slice(0, 3).map((badge) => (
                    <span
                      key={badge.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-indigo-200 text-indigo-700 text-[11px]"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span
                        dangerouslySetInnerHTML={{
                          __html: String(badge.title || ""),
                        }}
                      />
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="border border-dashed border-slate-200 rounded-lg p-4 text-xs text-slate-500">
            マスターコンテキストがまだ構築されていません。マイアカウント設定とフィードバックを入力するとAIが学習を開始します。
          </div>
        )}

        <div className="border border-slate-200 rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-700 flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            参照データログ
          </p>
          {nonSnapshotReferences.length === 0 ? (
            <p className="text-xs text-slate-500">
              今月はアカウント設定以外の参照データがありません。
            </p>
          ) : (
            <div className="space-y-2">
              {nonSnapshotReferences.map((reference) => (
                <div
                  key={reference.id}
                  className="flex items-start gap-2 border border-slate-100 rounded-md px-3 py-2"
                >
                  <div className="mt-0.5">{sourceIconMap[reference.sourceType]}</div>
                  <div className="text-xs text-slate-700">
                    <p
                      className="font-semibold"
                      dangerouslySetInnerHTML={{
                        __html: String(reference.label || sourceTypeLabel[reference.sourceType] || ""),
                      }}
                    />
                    <p className="text-[11px] text-slate-500">
                      {String(reference.summary || "")
                        .replace(/<[^>]*>/g, "")
                        .replace(/&lt;/g, "<")
                        .replace(/&gt;/g, ">")
                        .replace(/&amp;/g, "&")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {snapshotRefs.length > 0 && (
        <div className="mt-4 border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-slate-700 flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            引用された投稿スナップショット
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {snapshotRefs.slice(0, 3).map((reference) => (
              <div
                key={`learning-snapshot-${reference.id}`}
                className="border border-dashed border-slate-200 rounded-md p-3 text-xs text-slate-600"
              >
                <p className="font-semibold mb-1">
                  {reference.status === "gold"
                    ? "成功パターン"
                    : reference.status === "negative"
                      ? "改善ポイント"
                      : "参考投稿"}
                </p>
                <p
                  className="text-[11px] text-slate-500"
                  dangerouslySetInnerHTML={{
                    __html: String(reference.summary || ""),
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

