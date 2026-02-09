"use client";

import React from "react";
import { Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";

interface ReelAnalyticsAIAdviceProps {
  aiAdvice: {
    summary: string;
    strengths: string[];
    improvements: string[];
    nextActions: string[];
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
  error: string | null;
  onGenerate: () => void;
  sentiment: "satisfied" | "dissatisfied" | null;
  hasPostData: boolean;
  isAutoSaved?: boolean;
}

export const ReelAnalyticsAIAdvice: React.FC<ReelAnalyticsAIAdviceProps> = ({
  aiAdvice,
  isGenerating,
  isAutoGenerating = false,
  error,
  onGenerate,
  sentiment,
  hasPostData,
  isAutoSaved = false,
}) => {
  return (
    <div className="p-4 border-t border-gray-200">
      <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
        <span className="w-2 h-2 bg-[#ff8a15] mr-2"></span>
        AIアドバイス
      </h3>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 text-xs">
          {error}
        </div>
      )}

      {(isAutoGenerating || isGenerating) ? (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-600 border-t-transparent"></div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-900 mb-1">
                Signal AI があなたの投稿を分析しています
              </p>
              <p className="text-xs text-orange-700 leading-relaxed">
                投稿内容と伸び方の傾向を分析しています…
              </p>
            </div>
          </div>
        </div>
      ) : aiAdvice ? (
        <div className="space-y-4 bg-gradient-to-br from-gray-50 to-orange-50/30 p-6 border border-orange-100">
          {/* 目標達成見込みの表示 */}
          {aiAdvice.goalAchievementProspect && aiAdvice.goalAchievementReason && (
            <div className={`p-4 shadow-sm ${
              aiAdvice.goalAchievementProspect === "high"
                ? "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200"
                : aiAdvice.goalAchievementProspect === "medium"
                ? "bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200"
                : "bg-gradient-to-r from-red-50 to-rose-50 border border-red-200"
            }`}>
              <div className="flex items-start gap-3">
                {aiAdvice.goalAchievementProspect === "high" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : aiAdvice.goalAchievementProspect === "medium" ? (
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <h4 className={`text-sm font-semibold mb-2 ${
                    aiAdvice.goalAchievementProspect === "high"
                      ? "text-green-900"
                      : aiAdvice.goalAchievementProspect === "medium"
                      ? "text-yellow-900"
                      : "text-red-900"
                  }`}>
                    {aiAdvice.goalAchievementProspect === "high"
                      ? "目標達成見込み: 高"
                      : aiAdvice.goalAchievementProspect === "medium"
                      ? "目標達成見込み: 中"
                      : "目標達成見込み: 低"}
                  </h4>
                  <p className={`text-sm leading-relaxed ${
                    aiAdvice.goalAchievementProspect === "high"
                      ? "text-green-800"
                      : aiAdvice.goalAchievementProspect === "medium"
                      ? "text-yellow-800"
                      : "text-red-800"
                  }`}>
                    {aiAdvice.goalAchievementReason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 方針乖離の警告 */}
          {aiAdvice.directionAlignment && aiAdvice.directionAlignment !== "一致" && aiAdvice.directionComment && (
            <div className={`p-4 shadow-sm ${
              aiAdvice.directionAlignment === "乖離" 
                ? "bg-gradient-to-r from-red-50 to-rose-50 border border-red-200" 
                : "bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200"
            }`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  aiAdvice.directionAlignment === "乖離" 
                    ? "text-red-600" 
                    : "text-yellow-600"
                }`} />
                <div className="flex-1">
                  <h4 className={`text-sm font-semibold mb-2 ${
                    aiAdvice.directionAlignment === "乖離" 
                      ? "text-red-900" 
                      : "text-yellow-900"
                  }`}>
                    {aiAdvice.directionAlignment === "乖離" ? "方針乖離の警告" : "要注意"}
                  </h4>
                  <p className={`text-sm leading-relaxed ${
                    aiAdvice.directionAlignment === "乖離" 
                      ? "text-red-800" 
                      : "text-yellow-800"
                  }`}>
                    {aiAdvice.directionComment}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 方針一致の確認 */}
          {aiAdvice.directionAlignment === "一致" && aiAdvice.directionComment && (
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 shadow-sm">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-green-900 mb-1.5">
                    今月のAI方針に沿っています
                  </h4>
                  <p className="text-sm text-green-800 leading-relaxed">
                    {aiAdvice.directionComment}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 強みセクション */}
          {aiAdvice.strengths.length > 0 && (
            <div className="bg-white border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-green-500"></div>
                <h4 className="text-sm font-semibold text-gray-900">強み</h4>
              </div>
              <ul className="space-y-2.5">
                {aiAdvice.strengths.map((item, idx) => (
                  <li key={`strength-${idx}`} className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed">
                    <span className="text-green-500 mt-1.5 flex-shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 改善ポイントセクション */}
          {aiAdvice.improvements.length > 0 && (
            <div className="bg-white border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-amber-500"></div>
                <h4 className="text-sm font-semibold text-gray-900">改善ポイント</h4>
              </div>
              <ul className="space-y-2.5">
                {aiAdvice.improvements.map((item, idx) => (
                  <li key={`improve-${idx}`} className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed">
                    <span className="text-amber-500 mt-1.5 flex-shrink-0">→</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 次のアクションセクション */}
          {aiAdvice.nextActions.length > 0 && (
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-orange-500"></div>
                <h4 className="text-sm font-semibold text-gray-900">次のアクション</h4>
              </div>
              <ul className="space-y-2.5">
                {aiAdvice.nextActions.map((item, idx) => (
                  <li key={`action-${idx}`} className="flex items-start gap-2.5 text-sm text-gray-800 leading-relaxed">
                    <span className="text-orange-600 mt-1.5 flex-shrink-0 font-bold">▶</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Coaching Mode: 継続分析の価値を伝えるメッセージ */}
          {!aiAdvice.patternMatch && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-purple-900 mb-1">
                    より具体的な提案のために
                  </h4>
                  <p className="text-sm text-purple-800 leading-relaxed">
                    投稿を分析すればするほど、Signal AIはあなたのアカウントの傾向を学習し、より具体的で効果的な提案が可能になります。継続的な分析をおすすめします。
                  </p>
                </div>
              </div>
            </div>
          )}

          {isAutoSaved && (
            <div className="mt-3 pt-3 border-t border-gray-300">
              <p className="text-xs text-gray-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                この分析結果は自動的に保存されています
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 p-4 text-xs text-gray-500">
          分析データを保存すると、AIアドバイスが自動的に生成されます。
        </div>
      )}
    </div>
  );
};





