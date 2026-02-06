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
  } | null;
  isGenerating: boolean;
  isAutoGenerating?: boolean;
  error: string | null;
  onGenerate: () => void;
  sentiment: "satisfied" | "dissatisfied" | null;
  hasPostData: boolean;
}

export const ReelAnalyticsAIAdvice: React.FC<ReelAnalyticsAIAdviceProps> = ({
  aiAdvice,
  isGenerating,
  isAutoGenerating = false,
  error,
  onGenerate,
  sentiment,
  hasPostData,
}) => {
  return (
    <div className="p-4 border-t border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center">
          <span className="w-2 h-2 bg-[#ff8a15] mr-2"></span>
          AIアドバイス
        </h3>
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating || !sentiment || !hasPostData}
          className="px-4 py-2 text-sm font-semibold text-white bg-[#ff8a15] hover:bg-[#e6760f] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#ff8a15] transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              生成中...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              AIアドバイスを生成
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 text-xs">
          {error}
        </div>
      )}

      {isAutoGenerating ? (
        <div className="bg-blue-50 border border-blue-200 p-4 text-xs text-blue-700 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
          <span>AIアドバイスを自動生成中...</span>
        </div>
      ) : aiAdvice ? (
        <div className="space-y-4 bg-gray-50 p-4">
          {/* 方針乖離の警告 */}
          {aiAdvice.directionAlignment && aiAdvice.directionAlignment !== "一致" && aiAdvice.directionComment && (
            <div className={`p-3 border-l-4 rounded ${
              aiAdvice.directionAlignment === "乖離" 
                ? "bg-red-50 border-red-500" 
                : "bg-yellow-50 border-yellow-500"
            }`}>
              <div className="flex items-start gap-2">
                <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                  aiAdvice.directionAlignment === "乖離" 
                    ? "text-red-600" 
                    : "text-yellow-600"
                }`} />
                <div className="flex-1">
                  <h4 className={`text-xs font-semibold mb-1 ${
                    aiAdvice.directionAlignment === "乖離" 
                      ? "text-red-900" 
                      : "text-yellow-900"
                  }`}>
                    {aiAdvice.directionAlignment === "乖離" ? "⚠️ 方針乖離の警告" : "⚠️ 要注意"}
                  </h4>
                  <p className={`text-xs leading-relaxed ${
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
            <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-xs font-semibold text-green-900 mb-1">
                    ✅ 今月のAI方針に沿っています
                  </h4>
                  <p className="text-xs text-green-800 leading-relaxed">
                    {aiAdvice.directionComment}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="border-l-4 border-gray-400 pl-4">
            <p className="text-sm text-gray-800 leading-relaxed">{aiAdvice.summary}</p>
          </div>
          {aiAdvice.strengths.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wider">強み</h4>
              <ul className="list-disc list-inside text-xs text-gray-700 space-y-1 pl-2">
                {aiAdvice.strengths.map((item, idx) => (
                  <li key={`strength-${idx}`}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {aiAdvice.improvements.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wider">改善ポイント</h4>
              <ul className="list-disc list-inside text-xs text-gray-700 space-y-1 pl-2">
                {aiAdvice.improvements.map((item, idx) => (
                  <li key={`improve-${idx}`}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {aiAdvice.nextActions.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wider">次のアクション</h4>
              <ul className="list-disc list-inside text-xs text-gray-700 space-y-1 pl-2">
                {aiAdvice.nextActions.map((item, idx) => (
                  <li key={`action-${idx}`}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 p-4 text-xs text-gray-500">
          {sentiment
            ? "「AIアドバイスを生成」ボタンをクリックして、この投稿の分析とアドバイスを取得できます。"
            : "まず、上記のフィードバック（満足/不満足）を選択してください。"}
        </div>
      )}
    </div>
  );
};





