"use client";

import React, { useState, useEffect, useMemo } from "react";
import { SimulationResult, PlanFormData } from "../types/plan";
import { AlertTriangle, Target, TrendingDown, Lightbulb, Calendar, TrendingUp, AlertCircle } from "lucide-react";
import { useAuth } from "../../../../contexts/auth-context";
import { authFetch } from "../../../../utils/authFetch";
import { TargetFollowerInput } from "../../../../components/TargetFollowerInput";
import { calculateFeasibilityScore, getGrowthRateForAccountSize, calculateRecommendedPostingFrequency } from "../../../../lib/instagram-benchmarks";
import { logger } from "../utils/logger";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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
  onTargetChange?: (value: string) => void;
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
  onTargetChange,
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
        logger.error("シミュレーション計算エラー:", error);
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
  }, [result, formData.planPeriod]);

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

  // プレビューデータを計算（TargetFollowerInput用）
  const targetFollowerPreviewData = useMemo(() => {
    const current = parseInt(formData.currentFollowers || "0", 10);
    const followerGain = parseInt(formData.followerGain || "0", 10);
    const target = current + followerGain;
    const periodMonths = getPeriodMultiplier(formData.planPeriod || "1ヶ月");

    if (current > 0 && periodMonths > 0) {
      const growthBenchmark = getGrowthRateForAccountSize(current);
      
      // 予測フォロワー数（業界平均成長率を使用）
      const realisticGrowthRate = growthBenchmark.monthly.max / 100;
      const realisticTarget = Math.round(current * Math.pow(1 + realisticGrowthRate, periodMonths));
      
      // targetがcurrentより大きい場合のみfeasibilityを計算
      const feasibility = target > current 
        ? calculateFeasibilityScore(current, target, periodMonths)
        : undefined;
      
      // 目標の増加数と月間成長率を計算
      const followerGain = target > current ? target - current : 0;
      const totalGrowthRate = current > 0 ? ((followerGain / current) * 100) : 0;
      const monthlyGrowthRate = periodMonths > 0 ? (totalGrowthRate / periodMonths) : 0;
      
      // 投稿頻度の推奨を計算（feasibilityがある場合のみ）
      const recommendedPosting = feasibility
        ? calculateRecommendedPostingFrequency(
            current,
            target,
            periodMonths,
            feasibility.difficultyRatio
          )
        : undefined;
      
      return {
        current,
        target: target > current ? target : realisticTarget,
        realisticTarget,
        feasibility,
        growthRate: growthBenchmark.monthly,
        recommendedPosting,
        monthlyGrowthRate,
        followerGain,
      };
    }
    return null;
  }, [formData.currentFollowers, formData.followerGain, formData.planPeriod]);

  // スライダーの範囲を計算
  const current = parseInt(formData.currentFollowers || "0", 10);
  const followerGain = parseInt(formData.followerGain || "0", 10);
  const target = current + followerGain;
  const minTarget = current > 0 ? current : 0;
  const maxTarget = current > 0 ? Math.round(current * 2) : 1000;
  const sliderTarget = target > 0 ? target : (targetFollowerPreviewData?.realisticTarget || minTarget);
  const periodMonths = getPeriodMultiplier(formData.planPeriod || "1ヶ月");

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

  // 成長戦略の文章を初心者向けに簡潔化
  const simplifyAdviceText = (text: string): string => {
    // 専門用語を置き換え
    let simplified = text
      .replace(/エンゲージメント向上/g, "いいねやコメントを増やす")
      .replace(/ロイヤルティ/g, "ファン")
      .replace(/ブランディング/g, "あなたらしさ")
      .replace(/一貫性/g, "統一感")
      .replace(/カスタマージャーニー/g, "お客さんが購入するまでの流れ")
      .replace(/KPI/g, "目標")
      .replace(/コンバージョン/g, "行動してもらう")
      .replace(/リーチ/g, "見てもらう")
      .replace(/バイラル/g, "拡散")
      .replace(/オーガニック/g, "自然な")
      .replace(/アルゴリズム/g, "Instagramの仕組み");

    // 長すぎる文章を分割
    if (simplified.length > 200) {
      const sentences = simplified.split(/[。！？]/).filter(s => s.trim().length > 0);
      if (sentences.length > 2) {
        simplified = sentences.slice(0, 2).join("。") + "。";
      }
    }

    return simplified;
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

        {/* 現在→目標（TargetFollowerInputコンポーネント） */}
        {current > 0 && targetFollowerPreviewData && (
          <TargetFollowerInput
            current={current}
            target={target > current ? target : targetFollowerPreviewData.realisticTarget}
            previewData={targetFollowerPreviewData}
            periodMonths={periodMonths}
            onTargetChange={onTargetChange ? (value) => {
              const newTarget = parseInt(value, 10);
              const newGain = newTarget - current;
              if (!isNaN(newGain) && newGain >= 0) {
                // followerGainを更新
                onTargetChange(newGain.toString());
              }
            } : () => {}}
            minTarget={minTarget}
            maxTarget={maxTarget}
            sliderTarget={sliderTarget}
            placeholder={targetFollowerPreviewData ? `例: ${targetFollowerPreviewData.realisticTarget}` : "例: 570"}
          />
        )}
        {(!current || !targetFollowerPreviewData) && (
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
        )}

        {/* 達成可能性評価 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-5">
            達成可能性評価
          </h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <span className="text-sm text-gray-600">達成難易度</span>
              <span className={`text-base font-medium ${
                result.feasibilityLevel === "very_realistic" || result.feasibilityLevel === "realistic" ? "text-green-600" :
                result.feasibilityLevel === "moderate" ? "text-orange-600" :
                result.feasibilityLevel === "challenging" || result.feasibilityLevel === "very_challenging" ? "text-red-600" :
                "text-orange-600"
              }`}>
                {getDifficultyLabel(result.feasibilityLevel)}
              </span>
            </div>
            {/* 達成難易度の説明 */}
            <div className="pb-4 border-b border-gray-100">
              <p className="text-sm text-gray-600 leading-relaxed">
                {result.feasibilityLevel === "very_realistic" || result.feasibilityLevel === "realistic" ? (
                  <>✅ この目標は現実的です。継続的な投稿で達成できます。</>
                ) : result.feasibilityLevel === "moderate" ? (
                  <>⚠️ この目標は挑戦的です。努力次第で達成可能ですが、より現実的な代替案も検討できます。</>
                ) : (
                  <>❌ この目標は困難です。より現実的な代替案を検討することをおすすめします。</>
                )}
              </p>
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
            {/* 月間成長率(必要 vs 平均) */}
            {result.graphData?.growthRateComparison && (
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">必要月間成長率</span>
                  <span className="text-base font-semibold text-orange-600">
                    {(result.graphData.growthRateComparison.userTarget * 4).toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">業界平均月間成長率</span>
                  <span className="text-base font-semibold text-gray-700">
                    {(result.graphData.growthRateComparison.realistic * 4).toFixed(2)}%
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">達成難易度スコア</span>
                    <span className="text-sm font-medium text-gray-900">
                      {result.graphData.growthRateComparison.userTarget > 0 && result.graphData.growthRateComparison.realistic > 0
                        ? ((result.graphData.growthRateComparison.userTarget / result.graphData.growthRateComparison.realistic) * 100).toFixed(0)
                        : "0"}%
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-orange-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(0, (result.graphData.growthRateComparison.userTarget / result.graphData.growthRateComparison.realistic) * 100))}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    達成難易度スコアが100%を超える場合、目標は業界平均を上回る挑戦的な目標です。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* リスク警告(非現実的な場合) */}
        {result.onePointAdvice && result.onePointAdvice.type === "warning" && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-6 shadow-sm">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-yellow-900 mb-2">
                  {result.onePointAdvice.title}
                </h4>
                <p className="text-sm text-yellow-800 mb-2">
                  {result.onePointAdvice.message}
                </p>
                <p className="text-sm text-yellow-700">
                  {result.onePointAdvice.advice}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 週次フォロワー増加予測グラフ */}
        {result.graphData && result.graphData.data && result.graphData.data.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-5">
              週次フォロワー増加予測
            </h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={result.graphData.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="week"
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}人`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      padding: "8px 12px",
                    }}
                    formatter={(value: number) => [`${value.toLocaleString()}人`, ""]}
                    labelFormatter={(label) => `週: ${label}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="realistic"
                    name="現実的な成長"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#10b981" }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="userTarget"
                    name="目標成長"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#f97316" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
              <div>
                <span className="text-gray-600">現実的な最終フォロワー数: </span>
                <span className="font-semibold text-green-600">
                  {result.graphData.realisticFinal.toLocaleString()}人
                </span>
              </div>
              <div>
                <span className="text-gray-600">目標最終フォロワー数: </span>
                <span className="font-semibold text-orange-600">
                  {result.graphData.userTargetFinal.toLocaleString()}人
                </span>
              </div>
            </div>
          </div>
        )}

        {/* KPIに基づく成長戦略 */}
        {result.mainAdvice && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
              成長戦略
            </h4>
            <div className="space-y-3">
              {/* 専門用語を避けた簡潔な説明 */}
              <p className="text-sm text-gray-900 leading-relaxed">
                {simplifyAdviceText(result.mainAdvice)}
              </p>
            </div>
          </div>
        )}

        {/* この目標を達成するには（必要な取り組み） */}
        {targetFollowerPreviewData?.recommendedPosting && targetFollowerPreviewData.feasibility && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
            <div className="mb-5">
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                この目標を達成するには
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                目標の難易度に基づいて推奨される具体的な取り組みです
              </p>
            </div>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-[#FF8A15] mt-0.5">✅</span>
                <div>
                  <p className="font-medium">{targetFollowerPreviewData.recommendedPosting.feed.description}</p>
                  <p className="text-xs text-gray-500">（週{targetFollowerPreviewData.recommendedPosting.feed.perWeek.min}〜{targetFollowerPreviewData.recommendedPosting.feed.perWeek.max}回）</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#FF8A15] mt-0.5">✅</span>
                <div>
                  <p className="font-medium">{targetFollowerPreviewData.recommendedPosting.story.description}</p>
                  <p className="text-xs text-gray-500">（週{targetFollowerPreviewData.recommendedPosting.story.perWeek.min}〜{targetFollowerPreviewData.recommendedPosting.story.perWeek.max}回）</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#FF8A15] mt-0.5">✅</span>
                <div>
                  <p className="font-medium">{targetFollowerPreviewData.recommendedPosting.reel.description}</p>
                  <p className="text-xs text-gray-500">（週{targetFollowerPreviewData.recommendedPosting.reel.perWeek.min}〜{targetFollowerPreviewData.recommendedPosting.reel.perWeek.max}回）</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#FF8A15] mt-0.5">✅</span>
                <p className="font-medium">コメント返信を必ず行う</p>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#FF8A15] mt-0.5">✅</span>
                <p className="font-medium">ハッシュタグ20〜30個使用</p>
              </li>
              {formData.postingTimePreference && formData.postingTimePreference.length > 0 ? (
                <li className="flex items-start gap-2">
                  <span className="text-[#FF8A15] mt-0.5">✅</span>
                  <p className="font-medium">投稿時間は{formData.postingTimePreference.join("、")}がおすすめ</p>
                </li>
              ) : (
                <li className="flex items-start gap-2">
                  <span className="text-[#FF8A15] mt-0.5">✅</span>
                  <p className="font-medium">投稿時間は15時がおすすめ</p>
                </li>
              )}
            </ul>
            <p className="text-sm text-gray-600 mt-4">
              上記の取り組みを継続することで、目標達成の可能性が高まります。
            </p>
          </div>
        )}

        {/* 推定所要時間 */}
        {result?.postsPerWeek && (
          <div className="bg-white border-b border-gray-200 pb-8 mb-6">
            <div className="mb-6">
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                推定所要時間
              </h4>
              <p className="text-xs text-gray-400 font-light">
                Signal.での投稿文生成に必要な時間
              </p>
            </div>
            {(() => {
              // Signal.でできること：投稿文生成時間のみ
              const feedTime = (result.postsPerWeek.feed || 0) * 1; // フィード: 1分/投稿
              const reelTime = (result.postsPerWeek.reel || 0) * 1; // リール: 1分/投稿
              const storyTime = (result.postsPerWeek.story || 0) * 0.5; // ストーリーズ: 0.5分/投稿
              const engagementTime = 5; // コメント返信: 週5分（Signal.での返信文生成）
              const weeklyMinutes = Math.round(feedTime + reelTime + storyTime + engagementTime);
              const dailyMinutes = Math.round(weeklyMinutes / 7);
              
              return (
                <>
                  <div className="mb-6">
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl font-light text-gray-900 tracking-tight">
                        {weeklyMinutes}
                      </span>
                      <span className="text-lg font-light text-gray-500">分</span>
                      <span className="text-sm font-light text-gray-400 ml-2">/ 週</span>
                    </div>
                    <div className="mt-1 ml-1">
                      <span className="text-sm font-light text-gray-400">
                        1日約{dailyMinutes}分
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm">
                    {feedTime > 0 && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-50">
                        <span className="text-gray-500 font-light">フィード投稿</span>
                        <div className="text-right">
                          <span className="text-gray-900 font-light">
                            {Math.round(feedTime)}分
                          </span>
                          <span className="text-xs text-gray-400 ml-2 font-light">
                            {result.postsPerWeek.feed}回
                          </span>
                        </div>
                      </div>
                    )}
                    {reelTime > 0 && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-50">
                        <span className="text-gray-500 font-light">リール投稿</span>
                        <div className="text-right">
                          <span className="text-gray-900 font-light">
                            {Math.round(reelTime)}分
                          </span>
                          <span className="text-xs text-gray-400 ml-2 font-light">
                            {result.postsPerWeek.reel}回
                          </span>
                        </div>
                      </div>
                    )}
                    {storyTime > 0 && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-50">
                        <span className="text-gray-500 font-light">ストーリーズ</span>
                        <div className="text-right">
                          <span className="text-gray-900 font-light">
                            {Math.round(storyTime)}分
                          </span>
                          <span className="text-xs text-gray-400 ml-2 font-light">
                            {result.postsPerWeek.story}回
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-500 font-light">コメント返信</span>
                      <span className="text-gray-900 font-light">
                        {engagementTime}分
                      </span>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* 代替プラン提示（挑戦的以上の場合） */}
        {result.alternativeOptions && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="mb-5">
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                💡 現実的な代替案
              </h4>
              {result.alternativeOptions.whyDifficult && (
                <p className="text-sm text-gray-700 leading-relaxed mb-4">
                  {result.alternativeOptions.whyDifficult}
                </p>
              )}
            </div>
            <div className="space-y-4">
              {/* 保守的プラン（案1） */}
              {result.alternativeOptions.realistic && (
                <div className="border border-gray-200 rounded-lg p-4 hover:border-[#FF8A15] transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="text-sm font-semibold text-gray-900">【案1】保守的プラン</h5>
                    <div className="flex items-center gap-2">
                      {result.alternativeOptions.realistic.probability && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                          達成確率 {result.alternativeOptions.realistic.probability}
                        </span>
                      )}
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                        推奨
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 mb-3">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">目標: </span>
                      {result.alternativeOptions.realistic.targetFollowers.toLocaleString()}人
                      <span className="text-orange-600 font-medium">
                        {" "}(+{result.alternativeOptions.realistic.followerGain.toLocaleString()}人、+{result.alternativeOptions.realistic.monthlyGrowthRate.toFixed(1)}%)
                      </span>
                    </p>
                    <p className="text-sm text-gray-700">{result.alternativeOptions.realistic.recommendation}</p>
                    {calculationData?.workload && (
                      <p className="text-xs text-gray-600">
                        週あたり約{Math.round(calculationData.workload.weeklyHours * 60)}分（1日約{Math.round((calculationData.workload.weeklyHours * 60) / 7)}分）
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      // TODO: 代替案を選択した場合の処理
                      logger.log("代替案1を選択");
                    }}
                    className="w-full mt-3 px-4 py-2 bg-[#FF8A15] text-white text-sm font-medium rounded-md hover:bg-[#E67A0A] transition-colors"
                  >
                    この案を選ぶ
                  </button>
                </div>
              )}

              {/* 現実的プラン（案2） */}
              {result.alternativeOptions.moderate && (
                <div className="border border-gray-200 rounded-lg p-4 hover:border-[#FF8A15] transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="text-sm font-semibold text-gray-900">【案2】現実的プラン（推奨）</h5>
                    <div className="flex items-center gap-2">
                      {result.alternativeOptions.moderate.probability && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          達成確率 {result.alternativeOptions.moderate.probability}
                        </span>
                      )}
                      <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded">
                        挑戦
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 mb-3">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">目標: </span>
                      {result.alternativeOptions.moderate.targetFollowers.toLocaleString()}人
                      <span className="text-orange-600 font-medium">
                        {" "}(+{result.alternativeOptions.moderate.followerGain.toLocaleString()}人、+{result.alternativeOptions.moderate.monthlyGrowthRate.toFixed(1)}%)
                      </span>
                    </p>
                    <p className="text-sm text-gray-700">{result.alternativeOptions.moderate.recommendation}</p>
                    {calculationData?.workload && (
                      <p className="text-xs text-gray-600">
                        週あたり約{Math.round(calculationData.workload.weeklyHours * 60 * 1.5)}分（1日約{Math.round((calculationData.workload.weeklyHours * 60 * 1.5) / 7)}分）
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      // TODO: 代替案を選択した場合の処理
                      logger.log("代替案2を選択");
                    }}
                    className="w-full mt-3 px-4 py-2 bg-[#FF8A15] text-white text-sm font-medium rounded-md hover:bg-[#E67A0A] transition-colors"
                  >
                    この案を選ぶ
                  </button>
                </div>
              )}

              {/* 挑戦的プラン（案3） */}
              {result.alternativeOptions.phased && (
                <div className="border border-gray-200 rounded-lg p-4 hover:border-[#FF8A15] transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="text-sm font-semibold text-gray-900">【案3】挑戦的プラン</h5>
                    <div className="flex items-center gap-2">
                      {result.alternativeOptions.phased.probability && (
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                          達成確率 {result.alternativeOptions.phased.probability}
                        </span>
                      )}
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                        上級者向け
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 mb-3">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">目標: </span>
                      {result.alternativeOptions.phased.phase2.targetFollowers.toLocaleString()}人
                      <span className="text-orange-600 font-medium">
                        {" "}(+{result.alternativeOptions.phased.phase2.followerGain.toLocaleString()}人、+{((result.alternativeOptions.phased.phase2.followerGain / (parseInt(formData.currentFollowers) || 1)) * 100 / getPeriodMultiplier(formData.planPeriod)).toFixed(1)}%)
                      </span>
                    </p>
                    <p className="text-sm text-gray-700">{result.alternativeOptions.phased.recommendation}</p>
                    {calculationData?.workload && (
                      <p className="text-xs text-gray-600">
                        週あたり約{Math.round(calculationData.workload.weeklyHours * 60 * 2)}分（1日約{Math.round((calculationData.workload.weeklyHours * 60 * 2) / 7)}分）、広告投資も必要
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      // TODO: 代替案を選択した場合の処理
                      logger.log("代替案3を選択");
                    }}
                    className="w-full mt-3 px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 transition-colors"
                  >
                    この案を選ぶ
                  </button>
                </div>
              )}
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
