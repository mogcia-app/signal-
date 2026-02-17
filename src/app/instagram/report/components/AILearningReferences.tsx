"use client";

import React from "react";
import { Brain, Layers, ListChecks, Target, Award, Sparkles } from "lucide-react";
import { getLearningPhaseLabel } from "../../../../utils/learningPhase";
import type { ReportData } from "../../../../types/report";
import type { AIReference, MasterContextSummary, SnapshotReference } from "../../../../types/ai";

interface AILearningReferencesProps {
  selectedMonth: string;
  reportData?: ReportData | null;
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

export const AILearningReferences: React.FC<AILearningReferencesProps> = ({ selectedMonth: _selectedMonth, reportData }) => {
  // reportDataからAI学習リファレンスデータを取得
  const masterContext: MasterContextSummary | null = reportData?.aiLearningReferences?.masterContext || null;
  const references: AIReference[] = reportData?.aiLearningReferences?.references || [];
  const snapshotRefs: SnapshotReference[] = reportData?.aiLearningReferences?.snapshotReferences || [];

  const nonSnapshotReferences = references.filter((ref) => ref.sourceType !== "snapshot");

  return (
    <div className="bg-white border border-gray-200 p-3 sm:p-4 mb-4">
      {/* ヘッダー */}
      <div className="flex items-center mb-4">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#ff8a15] flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
          <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">AI学習リファレンス</h2>
          <p className="text-xs text-gray-600 mt-0.5">
            AIが提案を出す際に参照したデータを確認できます
          </p>
        </div>
      </div>

      {/* コンテンツ */}
      <div>
        {!masterContext && references.length === 0 && snapshotRefs.length === 0 ? (
          <div className="bg-white border border-gray-200 p-3 sm:p-4">
            <div className="flex items-start">
              <div className="w-4 h-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0">ℹ️</div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-800 mb-1.5">データがありません</p>
              </div>
            </div>
          </div>
        ) : !masterContext && nonSnapshotReferences.length === 0 && snapshotRefs.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Brain className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1.5">データがありません</p>
            <p className="text-xs text-gray-600">
              マイアカウント設定とフィードバックを入力するとAIが学習を開始します。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* マスターコンテキスト */}
            {masterContext ? (
              <div className="border border-gray-200 p-2.5 sm:p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-gray-500" />
                  マスターコンテキスト
                </p>
                <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm text-gray-700">
                  <div>
                    <p className="text-xs text-gray-500">フェーズ</p>
                    <p className="font-semibold text-gray-900">
                      {getLearningPhaseLabel(masterContext.learningPhase)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">RAGヒット率</p>
                    <p className="font-semibold text-gray-900">
                      {typeof masterContext.ragHitRate === "number"
                        ? `${Math.round(masterContext.ragHitRate * 100)}%`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">累計インタラクション</p>
                    <p className="font-semibold text-gray-900">
                      {masterContext.totalInteractions?.toLocaleString("ja-JP") ?? "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">フィードバック好感度</p>
                    <p className="font-semibold text-gray-900">
                      {typeof masterContext.feedbackStats?.positiveRate === "number"
                        ? `${Math.round(masterContext.feedbackStats.positiveRate * 100)}%`
                        : "-"}
                    </p>
                  </div>
                </div>
                {masterContext.achievements && masterContext.achievements.length > 0 && (
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs font-semibold text-gray-500 mb-2">学習バッジ</p>
                    <div className="flex flex-wrap gap-2">
                      {masterContext.achievements.slice(0, 3).map((badge) => (
                        <span
                          key={badge.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-indigo-200 text-indigo-700 text-xs bg-indigo-50"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>{badge.title}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-dashed border-gray-200 p-4 text-xs text-gray-500">
                マスターコンテキストがまだ構築されていません。マイアカウント設定とフィードバックを入力するとAIが学習を開始します。
              </div>
            )}

            {/* 参照データログ */}
            <div className="border border-gray-200 p-2.5 sm:p-3 md:p-4 space-y-2 sm:space-y-3">
              <p className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                <Layers className="w-4 h-4 text-gray-500" />
                参照データログ
              </p>
              {nonSnapshotReferences.length === 0 ? (
                <p className="text-xs text-gray-500">
                  今月はアカウント設定以外の参照データがありません。
                </p>
              ) : (
                <div className="space-y-2">
                  {nonSnapshotReferences.map((reference) => (
                    <div
                      key={reference.id}
                      className="flex items-start gap-2 border border-gray-100 rounded-md px-3 py-2"
                    >
                      <div className="mt-0.5">{sourceIconMap[reference.sourceType]}</div>
                      <div className="text-xs text-gray-700">
                        <p className="font-semibold">
                          {reference.label || sourceTypeLabel[reference.sourceType] || ""}
                        </p>
                        {reference.summary && (
                          <p className="text-xs text-gray-500 mt-1">{reference.summary}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 引用された投稿スナップショット */}
        {snapshotRefs.length > 0 && (
          <div className="mt-3 sm:mt-4 border border-gray-200 p-2.5 sm:p-3 md:p-4">
            <p className="text-xs font-semibold text-gray-700 flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              引用された投稿スナップショット
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
              {snapshotRefs.map((reference) => (
                <div
                  key={`learning-snapshot-${reference.id}`}
                  className="border border-dashed border-gray-200 rounded-md p-3 text-xs text-gray-600"
                >
                  <p className="font-semibold mb-1">
                    {reference.status === "gold"
                      ? "成功パターン"
                      : reference.status === "negative"
                        ? "改善ポイント"
                        : "参考投稿"}
                  </p>
                  {reference.summary && (
                    <p className="text-xs text-gray-500">{reference.summary}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
