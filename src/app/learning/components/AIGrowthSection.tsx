"use client";

import { Bot } from "lucide-react";
import { getLearningPhaseLabel } from "@/utils/learningPhase";
import type { MasterContextResponse } from "../types";

interface AIGrowthSectionProps {
  contextData: MasterContextResponse | null;
  goldSignalsCount: number;
  redSignalsCount: number;
}

export function AIGrowthSection({
  contextData,
  goldSignalsCount,
  redSignalsCount,
}: AIGrowthSectionProps) {
  if (!contextData) {
    return (
      <section className="border border-gray-100 bg-white p-8 rounded-lg shadow-sm">
        <div className="text-center py-8 text-gray-500">
          <div className="w-5 h-5 border-2 border-[#ff8a15] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span className="text-sm">AIの学習状況を取得中...</span>
        </div>
      </section>
    );
  }

  const achievements = contextData.achievements ?? [];

  // プログレスバーの幅を計算
  const getProgressWidth = () => {
    const total = contextData.totalInteractions || 0;
    // バックエンドのロジックに合わせて:
    // initial: 0-3件 → 0-25%
    // learning: 4-7件 → 25-50%
    // optimized: 8-11件 → 50-75%
    // master: 12件以上 → 75-100%
    if (total >= 12) {
      // 12件以上は75%から100%まで（12件で75%、20件で100%を想定）
      return Math.min(100, 75 + ((total - 12) / 8) * 25);
    } else if (total >= 8) {
      // 8-11件: 50%から75%まで
      return 50 + ((total - 8) / 4) * 25;
    } else if (total >= 4) {
      // 4-7件: 25%から50%まで
      return 25 + ((total - 4) / 4) * 25;
    } else {
      // 0-3件: 0%から25%まで
      return (total / 4) * 25;
    }
  };

  return (
    <section className="border border-gray-100 bg-white p-8 rounded-lg shadow-sm">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-10 h-10 bg-[#FF8A15] rounded flex items-center justify-center flex-shrink-0">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
            AIがあなたから学習中
          </h2>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed">
          AIがあなたの投稿から学習し、どんどん賢くなっていきます
        </p>
      </div>

      <div className="space-y-6">
        {/* 学習フェーズのプログレスバー */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">学習フェーズ</span>
            <span className="text-sm font-semibold text-gray-900">
              {getLearningPhaseLabel(contextData.learningPhase)}
            </span>
          </div>
          <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-gray-400 transition-all duration-700 ease-out"
              style={{
                width: `${getProgressWidth()}%`,
              }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] text-gray-400">
              <span>初期</span>
              <span>成長期</span>
              <span>成熟期</span>
              <span>マスター期</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            {contextData.learningPhase === "initial" && (
              <>
                あと{Math.max(0, 4 - (contextData.totalInteractions || 0))}件分析すると、成長期に進みます（現在: {contextData.totalInteractions || 0}件 / 4件）
              </>
            )}
            {contextData.learningPhase === "learning" && (
              <>
                あと{Math.max(0, 8 - (contextData.totalInteractions || 0))}件分析すると、成熟期に進みます（現在: {contextData.totalInteractions || 0}件 / 8件）
              </>
            )}
            {contextData.learningPhase === "optimized" && (
              <>
                あと{Math.max(0, 12 - (contextData.totalInteractions || 0))}件分析すると、マスター期に進みます（現在: {contextData.totalInteractions || 0}件 / 12件）
              </>
            )}
            {contextData.learningPhase === "master" && (
              <>マスター期に到達しました。AIの提案が最高精度になっています。</>
            )}
          </div>
        </div>

        {/* 統計情報 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-5">
            <div className="text-xs text-gray-500 mb-2 font-medium">分析した投稿数</div>
            <div className="text-3xl font-semibold text-gray-900 mb-2">
              {contextData.totalInteractions || 0}
              <span className="text-lg text-gray-500 ml-1">件</span>
            </div>
            <div className="text-xs text-gray-400">
              AIが学習した投稿の数
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-5">
            <div className="text-xs text-gray-500 mb-2 font-medium">AIの記憶精度</div>
            <div className="text-3xl font-semibold text-gray-900 mb-2">
              {Math.round((contextData.ragHitRate || 0) * 100)}
              <span className="text-lg text-gray-500 ml-1">%</span>
            </div>
            <div className="text-xs text-gray-400">
              過去の成功パターンを覚えている割合
            </div>
          </div>
        </div>

        {/* あなた専用のAI */}
        {(goldSignalsCount > 0 || redSignalsCount > 0 || achievements.length > 0) && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="mb-5">
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                このAIは、あなただけのために育っています
              </h3>
              <p className="text-sm text-gray-500">
                あなたの投稿から学んだ、あなた専用の成功パターンと改善ポイントです
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {goldSignalsCount > 0 && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-2 font-medium">成功パターン</div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {goldSignalsCount}
                    <span className="text-sm text-gray-500 ml-1">件</span>
                  </div>
                </div>
              )}
              {redSignalsCount > 0 && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-2 font-medium">改善ポイント</div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {redSignalsCount}
                    <span className="text-sm text-gray-500 ml-1">件</span>
                  </div>
                </div>
              )}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-500 mb-2 font-medium">学習データ</div>
                <div className="text-2xl font-semibold text-gray-900">
                  {contextData.totalInteractions || 0}
                  <span className="text-sm text-gray-500 ml-1">件</span>
                </div>
              </div>
            </div>
            {contextData.learningPhase !== "master" && (
              <div className="mt-5 pt-5 border-t border-gray-200">
                <p className="text-xs text-gray-600 text-center">
                  <span className="font-medium">もっと使うほど、AIがあなたに最適化されます</span>
                  <br className="mt-1" />
                  <span className="text-gray-500">
                    {contextData.learningPhase === "initial" && "あと" + Math.max(0, 4 - (contextData.totalInteractions || 0)) + "件で成長期に"}
                    {contextData.learningPhase === "learning" && "あと" + Math.max(0, 8 - (contextData.totalInteractions || 0)) + "件で成熟期に"}
                    {contextData.learningPhase === "optimized" && "あと" + Math.max(0, 12 - (contextData.totalInteractions || 0)) + "件でマスター期に"}
                    {"到達します"}
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* AIの学習が進むと */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
          <div className="text-sm font-semibold text-gray-900 mb-3">
            AIの学習が進むと
          </div>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="text-gray-400 mr-2">•</span>
              <span>より正確な提案ができるようになります</span>
            </li>
            <li className="flex items-start">
              <span className="text-gray-400 mr-2">•</span>
              <span>あなたの成功パターンを自動で見つけます</span>
            </li>
            <li className="flex items-start">
              <span className="text-gray-400 mr-2">•</span>
              <span>失敗を減らすアドバイスができます</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

