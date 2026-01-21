"use client";

import React, { useState, useEffect, useMemo } from "react";
import { SimulationResult, PlanFormData } from "../types/plan";
import { AlertTriangle, Target, TrendingDown, Lightbulb, Calendar } from "lucide-react";
import { useAuth } from "../../../../contexts/auth-context";
import { authFetch } from "../../../../utils/authFetch";

interface SimulationPanelProps {
  result: SimulationResult | null;
  formData: PlanFormData;
  onRunSimulation?: () => void;
  isSimulating?: boolean;
  simulationError?: string;
  hasActivePlan?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
  planEndDate?: Date | null;
}

interface SimulationCalculationData {
  weeksRemaining: number;
  daysRemaining: number;
  postBreakdown: {
    reel: { frequency: string; countTotal: number; expected: { min: number; max: number } };
    feed: { frequency: string; countTotal: number; expected: { min: number; max: number } };
    story: { frequency: string; countTotal: number; expected: { min: number; max: number } };
  };
  totalExpected: { min: number; max: number };
  goalAchievementRate: { label: string; showAdSuggestion: boolean };
  dailyPace: number;
  workload: {
    weeklyHours: number;
    monthlyHours: number;
    breakdown: {
      reel: { hours: number; perPost: number };
      feed: { hours: number; perPost: number };
      story: { hours: number; perPost: number };
    };
  };
}

export const SimulationPanel: React.FC<SimulationPanelProps> = ({
  result,
  formData,
  onRunSimulation,
  isSimulating = false,
  simulationError,
  hasActivePlan = false,
  onSave,
  isSaving = false,
  planEndDate,
}) => {
  const { user } = useAuth();
  const [calculationData, setCalculationData] = useState<SimulationCalculationData | null>(null);
  const [isLoadingCalculation, setIsLoadingCalculation] = useState(false);

  // 期待値のラベルフォーマット
  const formatExpectedLabel = (e: { min: number; max: number }) => `${e.min}〜${e.max}人`;

  // BFF APIからシミュレーション計算データを取得
  useEffect(() => {
    const fetchCalculationData = async () => {
      if (!result || !formData.followerGain || !formData.currentFollowers || !formData.planPeriod) {
        setCalculationData(null);
        return;
      }

      setIsLoadingCalculation(true);
      try {
        const requestBody = {
          followerGain: Number(formData.followerGain),
          currentFollowers: Number(formData.currentFollowers),
          planPeriod: formData.planPeriod,
          postsPerWeek: result.postsPerWeek || { reel: 0, feed: 0, story: 0 },
          planEndDate: planEndDate ? planEndDate.toISOString() : undefined,
        };

        const response = await authFetch("/api/plan/simulation", {
          method: "POST",
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error("シミュレーション計算に失敗しました");
        }

        const data: SimulationCalculationData = await response.json();
        setCalculationData(data);
      } catch (error) {
        console.error("シミュレーション計算エラー:", error);
        setCalculationData(null);
      } finally {
        setIsLoadingCalculation(false);
      }
    };

    fetchCalculationData();
  }, [result, formData.followerGain, formData.currentFollowers, formData.planPeriod, planEndDate]);

  // 期間と残り日数を計算（実際の日付を使用）
  const periodInfo = useMemo(() => {
    if (!result) return null;

    const periodMultiplier = getPeriodMultiplier(formData.planPeriod);
    
    // 実際の現在日時から計算
    const now = new Date();
    const startDate = new Date(now);
    
    // 計画終了日を計算
    const targetDate = new Date(now);
    switch (formData.planPeriod) {
      case "1ヶ月":
        targetDate.setMonth(targetDate.getMonth() + 1);
        break;
      case "3ヶ月":
        targetDate.setMonth(targetDate.getMonth() + 3);
        break;
      case "6ヶ月":
        targetDate.setMonth(targetDate.getMonth() + 6);
        break;
      case "1年":
        targetDate.setFullYear(targetDate.getFullYear() + 1);
        break;
      default:
        targetDate.setMonth(targetDate.getMonth() + 1);
    }

    // 実際の残り日数を計算（ミリ秒から日数に変換、切り上げ）
    const timeDiff = targetDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    return {
      startDate,
      targetDate,
      daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
      periodMultiplier,
    };
  }, [result, formData.planPeriod, planEndDate]);

  // APIから取得した計算データを使用（フォールバックは計算値を保持）
  const weeksRemaining = calculationData?.weeksRemaining ?? (periodInfo ? Math.max(1, Math.ceil(periodInfo.daysRemaining / 7)) : 0);
  const dailyPace = calculationData?.dailyPace ?? 0;
  const postBreakdown = calculationData?.postBreakdown ?? null;
  const totalExpected = calculationData?.totalExpected ?? { min: 0, max: 0 };
  const goalAchievementRate = calculationData?.goalAchievementRate ?? { label: "不明", showAdSuggestion: false };

  // 代替プラン提示ロジック（ステップ2でBFFに移行予定）
  // TODO: 代替プラン生成をBFF APIに移行
  const alternativePlans = null;

  // 期間乗数を取得
  function getPeriodMultiplier(planPeriod: string): number {
    switch (planPeriod) {
      case "1ヶ月":
        return 1;
      case "3ヶ月":
        return 3;
      case "6ヶ月":
        return 6;
      case "1年":
        return 12;
      default:
        return 1;
    }
  }

  // 難易度のラベルを取得
  const getDifficultyLabel = (level: string) => {
    switch (level) {
      case "very_realistic":
        return "非常に現実的";
      case "realistic":
        return "現実的";
      case "moderate":
        return "挑戦的";
      case "challenging":
        return "困難";
      case "very_challenging":
        return "非常に困難";
      default:
        return "高め";
    }
  };

  // 結果がない場合は初期表示
  if (!result) {
    return (
      <section className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <span className="mr-2 font-bold">目標達成シミュレーション</span>
        </h3>
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-black mb-4">
            左側で目標を入力し、シミュレーションを実行してください
          </p>
          {onRunSimulation && (
            <button
              onClick={onRunSimulation}
              disabled={isSimulating}
              className="w-full bg-orange-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSimulating ? (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    <span>シミュレーション実行中...</span>
                  </div>
                  <p className="text-xs text-orange-100">
                    AIが戦略を生成しています。しばらくお待ちください...
                  </p>
                </div>
              ) : (
                "シミュレーション実行"
              )}
            </button>
          )}
        </div>
        {simulationError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{simulationError}</p>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="p-8 bg-white min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
            目標達成シミュレーション
          </h3>
          {onRunSimulation && (
            <button
              onClick={onRunSimulation}
              disabled={isSimulating}
              className="text-sm bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-md font-medium transition-all duration-200 flex items-center shadow-sm"
            >
              {isSimulating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  実行中...
                </>
              ) : (
                <>
                  <span className="mr-2">↻</span>
                  再実行
                </>
              )}
            </button>
          )}
        </div>

        {simulationError && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-md">
            <p className="text-red-700 text-sm">{simulationError}</p>
          </div>
        )}

        <div className="space-y-5">
        {/* 期間表示 */}
        {periodInfo && (
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
              <span>
                期間：{periodInfo.startDate.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" })} → {periodInfo.targetDate.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" })}
              </span>
            </div>
          </div>
        )}

        {/* 現在→目標 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="text-center">
            <div className="text-2xl font-light text-gray-900 mb-1">
              {formData.currentFollowers ? parseInt(formData.currentFollowers).toLocaleString() : "0"}人
            </div>
            <div className="text-sm text-gray-500 mb-4">現在のフォロワー数</div>
            <div className="flex items-center justify-center space-x-2 text-gray-400 mb-4">
              <div className="h-px bg-gray-300 flex-1"></div>
              <span className="text-xs">目標</span>
              <div className="h-px bg-gray-300 flex-1"></div>
            </div>
            <div className="text-2xl font-light text-orange-600 mb-1">
              {formData.currentFollowers && formData.followerGain 
                ? (parseInt(formData.currentFollowers) + parseInt(formData.followerGain)).toLocaleString() 
                : "0"}人
            </div>
            <div className="text-sm text-orange-600 font-medium">
              {formData.followerGain ? `+${parseInt(formData.followerGain)}人必要` : "0人必要"}
            </div>
          </div>
        </div>

        {/* 達成可能性評価 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-5">
            達成可能性評価
          </h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <span className="text-sm text-gray-600">達成難易度</span>
              <span className="text-base font-medium text-orange-600">{getDifficultyLabel(result.feasibilityLevel)}</span>
            </div>
            {periodInfo && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 leading-relaxed">
                  残り <span className="font-medium text-orange-600">{periodInfo.daysRemaining}日</span> で <span className="font-medium text-orange-600">{formData.followerGain ? `+${parseInt(formData.followerGain)}人` : "目標未設定"}</span> の増加が必要です。
                </p>
                <p className="text-sm text-gray-500">
                  1日あたり <span className="font-medium text-orange-600">+{typeof dailyPace === 'number' ? dailyPace.toFixed(1) : dailyPace}人</span> のペースで成長を維持する必要があります。
                </p>
              </div>
            )}
          </div>
        </div>

        {/* KPIに基づく成長戦略 */}
        {result.mainAdvice && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
              成長戦略
            </h4>
            <div className="border-l-2 border-gray-900 pl-4">
              <p className="text-sm font-light text-gray-900 leading-relaxed">
                {result.mainAdvice}
              </p>
            </div>
          </div>
        )}

        {/* 投稿計画 */}
        {postBreakdown && postBreakdown.reel && postBreakdown.feed && postBreakdown.story && periodInfo && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="mb-5">
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                投稿計画
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                この投稿計画は、Signal.の独自ロジックで計算された最低限の投稿数を示しています。
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">投稿タイプ</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">週あたりの投稿頻度</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">週あたりの予測増加数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-4 text-sm text-gray-900">リール</td>
                    <td className="px-4 py-4 text-center text-sm font-medium text-gray-900">
                      {postBreakdown.reel?.frequency || "投稿なし"}
                    </td>
                    <td className="px-4 py-4 text-center text-sm font-medium text-orange-600">
                      +{postBreakdown.reel?.expected ? formatExpectedLabel(postBreakdown.reel.expected) : "0人"}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-4 text-sm text-gray-900">フィード投稿</td>
                    <td className="px-4 py-4 text-center text-sm font-medium text-gray-900">
                      {postBreakdown.feed?.frequency || "投稿なし"}
                    </td>
                    <td className="px-4 py-4 text-center text-sm font-medium text-orange-600">
                      +{postBreakdown.feed?.expected ? formatExpectedLabel(postBreakdown.feed.expected) : "0人"}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-4 text-sm text-gray-900">ストーリー</td>
                    <td className="px-4 py-4 text-center text-sm font-medium text-gray-900">
                      {postBreakdown.story?.frequency || "投稿なし"}
                    </td>
                    <td className="px-4 py-4 text-center text-sm font-medium text-orange-600">
                      +{postBreakdown.story?.expected ? formatExpectedLabel(postBreakdown.story.expected) : "0人"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  期間全体の目標投稿数（4週間）
                </span>
                <span className="text-xl font-light text-orange-600">
                  {(postBreakdown.reel?.countTotal || 0) + (postBreakdown.feed?.countTotal || 0) + (postBreakdown.story?.countTotal || 0)}投稿
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-2 space-y-1">
                <div className="flex justify-between">
                  <span>リール: {postBreakdown.reel?.countTotal || 0}投稿</span>
                  <span className="text-gray-400">
                    （{postBreakdown.reel?.frequency || "0"} × 4週）
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>フィード: {postBreakdown.feed?.countTotal || 0}投稿</span>
                  <span className="text-gray-400">
                    （{postBreakdown.feed?.frequency || "0"} × 4週）
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>ストーリー: {postBreakdown.story?.countTotal || 0}回</span>
                  <span className="text-gray-400">
                    （{postBreakdown.story?.frequency || "0"} × 4週）
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 代替プラン提示（目標未達時） */}
        {/* TODO: ステップ2でBFF APIから取得して実装 */}
        {/* {alternativePlans && Array.isArray(alternativePlans) && alternativePlans.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                目標達成のための代替プラン
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed mb-4">
                この条件では <span className="font-medium text-orange-600">+{Math.round(totalExpected.max)}人前後</span> が現実的です。
                <br />
                目標の <span className="font-medium text-orange-600">+{Number(formData.followerGain)}人</span> に近づけるには、以下のいずれかが必要です：
              </p>
            </div>
            <div className="space-y-4">
              {alternativePlans.map((plan, index) => (
                <div
                  key={index}
                  className="border border-gray-200 p-4 hover:border-[#FF8A15] transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="text-sm font-medium text-gray-900">{plan.title}</h5>
                    {plan.type === "ad" && (
                      <span className="px-2 py-1 text-xs font-medium bg-[#FF8A15] text-white">
                        推奨
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{plan.description}</p>
                  <p className="text-sm font-medium text-orange-600">{plan.expectedGain}</p>
                </div>
              ))}
            </div>
          </div>
        )} */}

        {/* 実行負荷（工数）シミュレーション */}
        {calculationData?.workload && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
              実行負荷
            </h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">週あたり制作時間</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {calculationData.workload.weeklyHours.toFixed(1)}
                    <span className="text-base font-medium text-gray-600 ml-1">時間</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">期間全体の合計時間</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {calculationData.workload.monthlyHours.toFixed(1)}
                    <span className="text-base font-medium text-gray-600 ml-1">時間</span>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-500 mb-2">内訳（週あたり）</div>
                <div className="space-y-2">
                  {calculationData.workload.breakdown.reel.hours > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">リール</span>
                      <span className="text-gray-900 font-medium">
                        {calculationData.workload.breakdown.reel.hours.toFixed(1)}時間
                        <span className="text-xs text-gray-500 ml-1">
                          ({calculationData.workload.breakdown.reel.perPost.toFixed(1)}時間/本)
                        </span>
                      </span>
                    </div>
                  )}
                  {calculationData.workload.breakdown.feed.hours > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">フィード</span>
                      <span className="text-gray-900 font-medium">
                        {calculationData.workload.breakdown.feed.hours.toFixed(1)}時間
                        <span className="text-xs text-gray-500 ml-1">
                          ({calculationData.workload.breakdown.feed.perPost.toFixed(2)}時間/本)
                        </span>
                      </span>
                    </div>
                  )}
                  {calculationData.workload.breakdown.story.hours > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">ストーリー</span>
                      <span className="text-gray-900 font-medium">
                        {calculationData.workload.breakdown.story.hours.toFixed(1)}時間
                        <span className="text-xs text-gray-500 ml-1">
                          ({calculationData.workload.breakdown.story.perPost.toFixed(1)}時間/本)
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 保存ボタン */}
        {onSave && result && (
          <div className="mt-6">
            <button
              onClick={onSave}
              disabled={isSaving}
              className="w-full bg-[#FF8A15] hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 font-medium transition-all duration-200 flex items-center justify-center border border-[#FF8A15]"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  保存中...
                </>
              ) : (
                "この計画を保存する"
              )}
            </button>
          </div>
        )}
        </div>
      </div>
    </section>
  );
};
