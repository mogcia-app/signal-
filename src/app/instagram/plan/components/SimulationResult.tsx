"use client";

import React, { useState } from "react";
import { SimulationResult as SimulationResultType, PlanFormData, AIPlanSuggestion } from "../types/plan";
import { ChevronDown, ChevronUp } from "lucide-react";
import { WeeklyFollowerPredictionChart } from "./WeeklyFollowerPredictionChart";
import { AIPlanSuggestion as AIPlanSuggestionComponent } from "./AIPlanSuggestion";

interface SimulationResultProps {
  result: SimulationResultType;
  formData: {
    currentFollowers: number;
    targetFollowers: number;
    periodMonths: number;
    startDate?: string;
  };
  fullFormData?: PlanFormData; // AI提案に必要な完全なフォームデータ
  aiSuggestedTarget?: number; // AIが自動提案した目標フォロワー数
  onSelectAlternative?: (planId: string) => void;
  onStartPlan?: (suggestion: AIPlanSuggestion) => void; // この計画で始めるボタンのハンドラー
  isSaving?: boolean; // 保存中かどうか
}

export const SimulationResult: React.FC<SimulationResultProps> = ({
  result,
  formData,
  fullFormData,
  aiSuggestedTarget,
  onSelectAlternative,
  onStartPlan,
  isSaving = false,
}) => {
  const [showLevel2, setShowLevel2] = useState(false);
  const [showLevel3, setShowLevel3] = useState(false);

  // 開始日と終了日を計算
  const startDate = formData.startDate 
    ? new Date(formData.startDate)
    : new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + formData.periodMonths);

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  };

  const colorClasses = {
    green: "bg-green-100 text-green-800 border-green-300",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-300",
    orange: "bg-orange-100 text-orange-800 border-orange-300",
    red: "bg-red-100 text-red-800 border-red-300",
  };

  return (
    <div className="space-y-4">
      {/* レベル1: 基本情報（常に表示） */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          ✨ 目標達成シミュレーション
        </h2>

        {/* 基本情報 */}
        <div className="mb-4 space-y-2">
          <div className="text-sm text-gray-600">
            <span className="font-medium">期間:</span> {formatDate(startDate)} → {formatDate(endDate)}（{formData.periodMonths}ヶ月）
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">現在:</span> {formData.currentFollowers.toLocaleString()}人
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">目標:</span> {formData.targetFollowers.toLocaleString()}人（+{(formData.targetFollowers - formData.currentFollowers).toLocaleString()}人）
          </div>
        </div>

        {/* 達成可能性 */}
        <div className={`border rounded-lg p-4 ${colorClasses[result.difficultyColor]}`}>
          <div className="font-semibold mb-2">{result.difficultyMessage}</div>
          <div className="text-sm space-y-1">
            <div>必要な月間成長率: {result.requiredMonthlyGrowthRate}%</div>
            <div>業界平均: {(() => {
              // フォロワー数に応じた業界平均を表示
              if (formData.currentFollowers < 1000) {
                return "2.0〜3.0%";
              } else if (formData.currentFollowers < 10000) {
                return "1.5〜2.5%";
              } else if (formData.currentFollowers < 100000) {
                return "1.0〜1.5%";
              } else {
                return "0.6〜1.0%";
              }
            })()}</div>
            <div>達成難易度スコア: {result.difficultyScore}%</div>
          </div>
        </div>

        {/* レベル2展開ボタン */}
        <button
          type="button"
          onClick={() => setShowLevel2(!showLevel2)}
          className="mt-4 w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          {showLevel2 ? (
            <>
              <ChevronUp className="w-4 h-4" />
              <span>詳しく見る（閉じる）</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              <span>詳しく見る</span>
            </>
          )}
        </button>
      </div>

      {/* レベル2: 詳細情報（クリックで表示） */}
      {showLevel2 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          {/* 週次フォロワー増加予測 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              週次フォロワー増加予測
            </h3>
            <WeeklyFollowerPredictionChart
              currentFollowers={formData.currentFollowers}
              targetFollowers={formData.targetFollowers}
              periodMonths={formData.periodMonths}
              aiSuggestedTarget={aiSuggestedTarget}
            />
          </div>
        </div>
      )}

      {/* AI提案セクション（常に表示） */}
      {fullFormData && (
        <div>
          <AIPlanSuggestionComponent 
            formData={fullFormData} 
            simulationResult={result}
            onStartPlan={onStartPlan}
          />
        </div>
      )}

      {/* レベル3: 詳細な計算根拠（さらにクリックで表示） */}
      {showLevel3 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            詳細な計算根拠
          </h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <div className="font-medium mb-1">必要月間成長率の計算式:</div>
              <div className="bg-gray-50 p-3 rounded font-mono text-xs">
                ((目標フォロワー数 / 現在フォロワー数) ^ (1 / 期間月数) - 1) × 100
              </div>
            </div>
            <div>
              <div className="font-medium mb-1">達成難易度スコアの計算式:</div>
              <div className="bg-gray-50 p-3 rounded font-mono text-xs">
                (必要月間成長率 / 業界平均成長率) × 100
              </div>
            </div>
            <div>
              <div className="font-medium mb-1">業界平均データの出典:</div>
              <div className="text-gray-600">
                Instagram公式データおよび業界レポートに基づく統計値
              </div>
            </div>
            <div>
              <div className="font-medium mb-1">エンゲージメント率の想定値:</div>
              <div className="text-gray-600">
                業界平均: 4.3%（フォロワー数に応じて変動）
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 代替案（非現実的な場合のみ） */}
      {result.alternativePlans && result.alternativePlans.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            代替案の提示
          </h3>
          <div className="space-y-4">
            {result.alternativePlans.map((plan) => (
              <div key={plan.id} className="border border-gray-200 rounded-lg p-4">
                <div className="font-semibold text-gray-900 mb-2">{plan.name}</div>
                <div className="text-sm text-gray-600 mb-3">{plan.description}</div>
                <div className="text-sm text-gray-700 space-y-1 mb-3">
                  <div>目標フォロワー: {plan.targetFollowers.toLocaleString()}人</div>
                  <div>期間: {plan.periodMonths}ヶ月</div>
                  <div>投稿頻度: フィード{plan.weeklyFeedPosts}回/週、リール{plan.weeklyReelPosts}回/週、ストーリーズ{plan.weeklyStoryPosts}回/週</div>
                </div>
                {onSelectAlternative && (
                  <button
                    type="button"
                    onClick={() => onSelectAlternative(plan.id)}
                    className="w-full bg-[#FF8A15] hover:bg-[#E67A0A] text-white font-medium px-4 py-2 rounded-md transition-colors"
                  >
                    この案を選ぶ
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

