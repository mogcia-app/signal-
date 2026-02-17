"use client";

import React from "react";
import { PostAnalyticsAdviceSummary } from "./PostAnalyticsAdviceSummary";

interface ReelAnalyticsAIAdviceProps {
  aiAdvice: {
    summary: string;
    strengths: string[];
    improvements: string[];
    nextActions: string[];
    imageAdvice?: string[];
    directionAlignment?: "一致" | "乖離" | "要注意" | null;
    directionComment?: string | null;
    goalAchievementProspect?: "high" | "medium" | "low" | null;
    goalAchievementReason?: string | null;
    // learning mode用のフィールド
    patternMatch?: "match" | "partial" | "mismatch" | null;
    patternScore?: number | null;
    patternRank?: "core" | "edge" | "outlier" | null;
    patternReason?: string | null;
    patternBasedPrediction?: "今後フォロワーが増える見込み" | "伸びにくい" | "判断保留" | null;
  } | null;
  isGenerating: boolean;
  isAutoGenerating?: boolean;
  generationStep?: 0 | 1 | 2 | 3;
  error: string | null;
  isAutoSaved?: boolean;
  showAdvice?: boolean;
  thumbnailUrl?: string;
}

export const ReelAnalyticsAIAdvice: React.FC<ReelAnalyticsAIAdviceProps> = ({
  aiAdvice,
  isGenerating,
  isAutoGenerating = false,
  generationStep = 0,
  error,
  isAutoSaved = false,
  showAdvice = true,
  thumbnailUrl,
}) => {
  return (
    <div className="p-4 border-t border-gray-200">
      <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
        <span className="w-2 h-2 bg-[#ff8a15] mr-2"></span>
        AIアドバイス
      </h3>

      <PostAnalyticsAdviceSummary
        aiAdvice={aiAdvice}
        isGenerating={isGenerating}
        isAutoGenerating={isAutoGenerating}
        generationStep={generationStep}
        error={error}
        isAutoSaved={isAutoSaved}
        showAdvice={showAdvice}
        thumbnailUrl={thumbnailUrl}
      />
    </div>
  );
};
