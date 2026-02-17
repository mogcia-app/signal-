"use client";

import React from "react";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { BotStatusCard } from "../../../components/bot-status-card";

interface PostAiAdvice {
  summary: string;
  strengths: string[];
  improvements: string[];
  nextActions: string[];
  imageAdvice?: string[];
}

interface PostAnalyticsAdviceSummaryProps {
  aiAdvice: PostAiAdvice | null;
  isGenerating: boolean;
  isAutoGenerating?: boolean;
  generationStep?: 0 | 1 | 2 | 3;
  error: string | null;
  isAutoSaved?: boolean;
  showAdvice?: boolean;
  thumbnailUrl?: string;
}

const normalizeAdviceText = (value: string): string => value.replace(/\s+/g, " ").trim();

export const PostAnalyticsAdviceSummary: React.FC<PostAnalyticsAdviceSummaryProps> = ({
  aiAdvice,
  isGenerating,
  isAutoGenerating = false,
  generationStep = 0,
  error,
  isAutoSaved = false,
  showAdvice = true,
  thumbnailUrl,
}) => {
  const hasAdvice = !!aiAdvice && showAdvice;
  const issuePoints = (aiAdvice?.improvements || []).map(normalizeAdviceText).filter(Boolean);
  const actionPoints = (aiAdvice?.nextActions || []).map(normalizeAdviceText).filter(Boolean);
  const imageAdvicePoints = (aiAdvice?.imageAdvice || []).map(normalizeAdviceText).filter(Boolean).slice(0, 4);
  const mergedActions = [...actionPoints, ...issuePoints];
  const actionKeys = new Set<string>();
  const compactActions = mergedActions
    .filter((item) => {
      const key = item.replace(/\s+/g, "");
      if (!key || actionKeys.has(key)) {
        return false;
      }
      actionKeys.add(key);
      return true;
    })
    .slice(0, 2);
  const generationProgressMap: Record<0 | 1 | 2 | 3, number> = {
    0: 20,
    1: 45,
    2: 75,
    3: 100,
  };
  const generationSubtitleMap: Record<0 | 1 | 2 | 3, string> = {
    0: "投稿内容を確認中...",
    1: "傾向を分析中...",
    2: "改善ポイントを整理中...",
    3: "完了",
  };
  const generationProgress = generationProgressMap[generationStep];
  const generationSubtitle = generationSubtitleMap[generationStep];

  return (
    <>
      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 text-xs">
          {error}
        </div>
      )}

      {(isAutoGenerating || isGenerating) ? (
        <BotStatusCard
          title="生成中..."
          subtitle={generationSubtitle}
          progress={generationProgress}
        />
      ) : hasAdvice ? (
        <div className="bg-gradient-to-br from-gray-50 to-orange-50/30 p-6 border border-orange-100">
          <div className="space-y-4">
            <section>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">要点</h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                {normalizeAdviceText(aiAdvice?.summary || "今回の投稿の結果を整理しました")}
              </p>
            </section>

            <section className="pt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">次にやること</h4>
              {compactActions.length > 0 ? (
                <ul className="space-y-2">
                  {compactActions.map((item, idx) => (
                    <li key={`action-${idx}`} className="text-sm text-gray-700 leading-relaxed">
                      ・{item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-600">次回の投稿で試すアクションを生成できませんでした。</p>
              )}
            </section>

            {thumbnailUrl && imageAdvicePoints.length > 0 ? (
              <section className="pt-4 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">画像の改善ポイント</h4>
                <div className="mb-3">
                  <div className="relative w-full max-w-xs aspect-square border border-gray-200 overflow-hidden bg-gray-100">
                    <Image
                      src={thumbnailUrl}
                      alt="投稿画像"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                </div>
                {imageAdvicePoints.length > 0 ? (
                  <ul className="space-y-2">
                    {imageAdvicePoints.map((item, idx) => (
                      <li key={`image-advice-${idx}`} className="text-sm text-gray-700">・{item}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ) : null}

            {isAutoSaved && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  分析内容とAIアドバイスを保存済みです
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 p-4 text-xs text-orange-700">
          <p className="font-medium mb-1">AIに分析してもらう</p>
          <p>ボタンを押すと、投稿のまとめと次にやることを分かりやすく表示します。</p>
        </div>
      )}
    </>
  );
};
