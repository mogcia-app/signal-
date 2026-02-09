"use client";

import React from "react";
import { SimulationResult as SimulationResultType, PlanFormData } from "../types/plan";
import { CheckCircle } from "lucide-react";
import { WeeklyFollowerPredictionChart } from "./WeeklyFollowerPredictionChart";
import { useUserProfile } from "../../../../hooks/useUserProfile";

interface SimulationResultProps {
  result: SimulationResultType;
  formData: {
    currentFollowers: number;
    targetFollowers: number;
    periodMonths: number;
    startDate?: string;
  };
  fullFormData?: PlanFormData; // 完全なフォームデータ
  aiSuggestedTarget?: number; // AIが自動提案した目標フォロワー数
  onSelectAlternative?: (planId: string) => void;
  onStartPlan?: () => void; // この計画で始めるボタンのハンドラー
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
  const { userProfile } = useUserProfile();

  // 開始日と終了日を計算
  const startDate = formData.startDate 
    ? new Date(formData.startDate)
    : new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + formData.periodMonths);

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 業界平均成長率を取得
  const getIndustryAverage = () => {
    if (formData.currentFollowers < 1000) {
      return "1.5〜3.0%";
    } else if (formData.currentFollowers < 10000) {
      return "1.5〜2.5%";
    } else if (formData.currentFollowers < 100000) {
      return "0.8〜1.5%";
    } else {
      return "0.5〜1.0%";
    }
  };


  const colorClasses = {
    green: "bg-green-100 text-green-800 border-green-300",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-300",
    orange: "bg-orange-100 text-orange-800 border-orange-300",
    red: "bg-red-100 text-red-800 border-red-300",
  };

  return (
    <div className="space-y-6">
      {/* メインセクション */}
      <div className="bg-white border-2 border-gray-200 p-8 space-y-8">
        {/* ヘッダー */}
        <div className="text-center pb-6 border-b-2 border-gray-200">
          <h2 className="text-2xl font-light text-gray-900 tracking-wide">
            {userProfile?.name || "あなた"}の{formData.periodMonths}ヶ月プラン
          </h2>
        </div>

        {/* 目標フォロワー数 */}
        <div className="text-center py-6 px-4">
          <div className="inline-flex items-baseline gap-3 mb-3">
            <span className="text-3xl font-light text-gray-900">
              {formData.currentFollowers.toLocaleString()}
            </span>
            <span className="text-gray-400 text-sm">人</span>
            <span className="text-gray-300 mx-2">→</span>
            <span className="text-3xl font-light text-gray-900">
              {formData.targetFollowers.toLocaleString()}
            </span>
            <span className="text-gray-400 text-sm">人</span>
          </div>
          <p className="text-base font-medium text-gray-600 tracking-wide uppercase mt-2">
            業界平均より無理のないペース
          </p>
          <p className="text-base text-gray-700 mt-3">
            {formatDate(startDate)} 〜 {formatDate(endDate)}
          </p>
        </div>

        {/* 達成難易度 */}
        <div className="pt-2">
          <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wider mb-4">
            達成難易度
          </h3>
          <div className="border-2 border-gray-200 p-6 bg-gray-50">
            <div className="mb-4">
              <p className="text-base font-medium text-gray-900">
                {result.difficultyMessage}
              </p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between pb-2 border-b-2 border-gray-200">
                <span className="text-gray-600">あなたの目標</span>
                <span className="font-medium text-gray-900">月{result.requiredMonthlyGrowthRate}%成長</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b-2 border-gray-200">
                <span className="text-gray-600">業界平均</span>
                <span className="font-medium text-gray-900">月{getIndustryAverage()}成長</span>
              </div>
              <div className="pt-2">
                <p className="text-xs text-gray-500 leading-relaxed">
                  {(() => {
                    const industryMin = parseFloat(getIndustryAverage().split("〜")[0]);
                    const isLower = result.requiredMonthlyGrowthRate < industryMin;
                    return (
                      <>
                        業界平均より{isLower ? "低め" : "高め"}のため、{isLower ? "無理なく" : "努力が必要ですが"}達成可能です
                      </>
                    );
                  })()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 週ごとの予測 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📈 週ごとの予測
          </h3>
          <div className="space-y-2 mb-4">
            {result.weeklyPredictions && result.weeklyPredictions.length > 0 ? (
              result.weeklyPredictions.map((prediction, index) => {
                const weekNumber = index + 1;
                const previousFollowers = index === 0 
                  ? formData.currentFollowers 
                  : result.weeklyPredictions[index - 1];
                const gain = Math.round(prediction - previousFollowers);
                const isLastWeek = weekNumber === formData.periodMonths * 4;

                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 border-2 border-gray-200">
                    <span className="text-gray-700">
                      第{weekNumber}週: <strong className="text-gray-900">+{gain}人</strong>（{Math.round(prediction).toLocaleString()}人）
                    </span>
                    {isLastWeek && <span className="text-gray-900">🎉</span>}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500">週ごとの予測データがありません</p>
            )}
          </div>
          <p className="text-sm text-gray-500 italic">
            このペースなら、毎週少しずつ増やせます！
          </p>
        </div>

        {/* 週次フォロワー増加予測グラフ */}
        <div className="bg-white border-2 border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            週次フォロワー増加予測グラフ
          </h3>
          <WeeklyFollowerPredictionChart
            currentFollowers={formData.currentFollowers}
            targetFollowers={formData.targetFollowers}
            periodMonths={formData.periodMonths}
            aiSuggestedTarget={aiSuggestedTarget}
          />
        </div>
        
        {/* この計画で始めるボタン */}
        {onStartPlan && (
          <div className="mt-6 pt-4 border-t-2 border-gray-200">
            <button
              type="button"
              onClick={() => {
                if (onStartPlan) {
                  onStartPlan();
                }
              }}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 border-2 border-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-4 h-4" />
              {isSaving ? "保存中..." : "この計画で始める"}
            </button>
          </div>
        )}
      </div>


      {/* 代替案（非現実的な場合のみ） */}
      {result.alternativePlans && result.alternativePlans.length > 0 && (
        <div className="bg-white border-2 border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            代替案の提示
          </h3>
          <div className="space-y-4">
            {result.alternativePlans.map((plan) => (
              <div key={plan.id} className="border-2 border-gray-200 p-4">
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
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium px-4 py-2 border-2 border-gray-900 transition-colors"
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

