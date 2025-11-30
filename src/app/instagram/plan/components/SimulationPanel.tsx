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
}

interface PreviousMonthData {
  followerIncrease: number;
  totalPosts: number;
  lowKPIs: Array<{
    key: string;
    label: string;
    value: number;
    changePct?: number;
  }>;
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
}) => {
  const { user } = useAuth();
  const [previousMonthData, setPreviousMonthData] = useState<PreviousMonthData | null>(null);
  const [isLoadingPreviousMonth, setIsLoadingPreviousMonth] = useState(false);

  // 期間に基づく固定日数を取得
  const getPeriodDays = (planPeriod: string): number => {
    switch (planPeriod) {
      case "1ヶ月":
        return 31;
      case "3ヶ月":
        return 90;
      case "6ヶ月":
        return 180;
      case "1年":
        return 365;
      default:
        return 31;
    }
  };

  // 期間と残り日数を計算（固定値を使用）
  const periodInfo = useMemo(() => {
    if (!result) return null;

    const periodMultiplier = getPeriodMultiplier(formData.planPeriod);
    const daysRemaining = getPeriodDays(formData.planPeriod);
    
    // 表示用の日付（現在の日付を使用、ただし計算には使わない）
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(1);
    
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
    targetDate.setDate(1);

    return {
      startDate,
      targetDate,
      daysRemaining,
      periodMultiplier,
    };
  }, [result, formData.planPeriod]);

  // 1日あたりの必要ペースを計算
  const dailyPace = useMemo(() => {
    if (!result || !periodInfo) return 0;
    const followerGain = parseInt(formData.followerGain, 10);
    return periodInfo.daysRemaining > 0 ? Math.ceil(followerGain / periodInfo.daysRemaining) : followerGain;
  }, [result, periodInfo, formData.followerGain]);

  // 投稿頻度を分かりやすい形式に変換
  const formatPostFrequency = (postsPerWeek: number) => {
    if (postsPerWeek === 0) return "投稿なし";
    if (postsPerWeek === 1) return "週1回";
    if (postsPerWeek === 2) return "週2回";
    if (postsPerWeek === 3) return "週3回";
    if (postsPerWeek === 4) return "週4回";
    if (postsPerWeek === 5) return "週5回";
    if (postsPerWeek === 6) return "週6回";
    if (postsPerWeek >= 7) return "毎日";
    // 小数点がある場合（例：0.5回/週）
    return `週${postsPerWeek}回`;
  };

  // 期間に基づく週数を取得
  const getWeeksForPeriod = (planPeriod: string): number => {
    switch (planPeriod) {
      case "1ヶ月":
        return 4;
      case "3ヶ月":
        return 12;
      case "6ヶ月":
        return 24;
      case "1年":
        return 52;
      default:
        return 4;
    }
  };

  // 投稿内訳を残り日数で計算
  const postBreakdown = useMemo(() => {
    if (!result || !periodInfo) return null;

    const daysRemaining = periodInfo.daysRemaining;
    const weeksRemaining = getWeeksForPeriod(formData.planPeriod);
    
    // 期間全体の投稿数
    const reelTotal = Math.round(result.postsPerWeek.reel * weeksRemaining);
    const feedTotal = Math.round(result.postsPerWeek.feed * weeksRemaining);
    const storyTotal = daysRemaining;
    
    // 1週間分の予測増加数
    const reelWeeklyExpected = `${result.postsPerWeek.reel * 4}〜${result.postsPerWeek.reel * 7}人`;
    const feedWeeklyExpected = `${result.postsPerWeek.feed * 1}〜${result.postsPerWeek.feed * 3}人`;
    const storyWeeklyExpected = `2〜8人`; // 毎日1回 × 7日 = 0.3×7〜1.2×7 ≈ 2〜8人
    
    return {
      reel: {
        frequency: formatPostFrequency(result.postsPerWeek.reel),
        countTotal: reelTotal,
        effect: "4〜7人",
        expected: reelWeeklyExpected,
      },
      feed: {
        frequency: formatPostFrequency(result.postsPerWeek.feed),
        countTotal: feedTotal,
        effect: "1〜3人",
        expected: feedWeeklyExpected,
      },
      story: {
        frequency: "毎日",
        countTotal: storyTotal,
        effect: "0.3〜1.2人",
        expected: storyWeeklyExpected,
      },
    };
  }, [result, periodInfo]);

  // 合計期待値を計算
  const totalExpected = useMemo(() => {
    if (!postBreakdown) return { min: 0, max: 0 };
    
    const reelMin = parseInt(postBreakdown.reel.expected.split("〜")[0]);
    const reelMax = parseInt(postBreakdown.reel.expected.split("〜")[1].replace("人", ""));
    const feedMin = parseInt(postBreakdown.feed.expected.split("〜")[0]);
    const feedMax = parseInt(postBreakdown.feed.expected.split("〜")[1].replace("人", ""));
    const storyMin = parseInt(postBreakdown.story.expected.split("〜")[0]);
    const storyMax = parseInt(postBreakdown.story.expected.split("〜")[1].replace("人", ""));

    return {
      min: reelMin + feedMin + storyMin,
      max: reelMax + feedMax + storyMax,
    };
  }, [postBreakdown]);

  // 目標到達率を判定（5段階）
  const goalAchievementRate = useMemo(() => {
    if (!totalExpected) return { label: "不明", showAdSuggestion: false };
    const target = parseInt(formData.followerGain, 10);
    
    // 達成率を計算（最小値と最大値の平均で判定）
    const avgExpected = (totalExpected.min + totalExpected.max) / 2;
    const achievementRate = (avgExpected / target) * 100;
    
    if (totalExpected.min >= target) {
      // 最小値でも目標を超える → 達成可能
      return { label: "達成可能", showAdSuggestion: false };
    } else if (totalExpected.max >= target && achievementRate >= 80) {
      // 最大値で目標を超え、達成率80%以上 → 頑張れば達成可能
      return { label: "頑張れば達成可能", showAdSuggestion: true };
    } else if (achievementRate >= 60) {
      // 達成率60%以上 → やや困難
      return { label: "やや困難", showAdSuggestion: true };
    } else if (achievementRate >= 30) {
      // 達成率30%以上 → 困難
      return { label: "困難", showAdSuggestion: true };
    } else {
      // 達成率30%未満 → 非常に困難
      return { label: "非常に困難", showAdSuggestion: true };
    }
  }, [totalExpected, formData.followerGain]);

  // 先月のデータを取得
  useEffect(() => {
    const fetchPreviousMonthData = async () => {
      if (!user) return;

      setIsLoadingPreviousMonth(true);
      try {
        const now = new Date();
        const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonthStr = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, "0")}`;

        const kpiResponse = await authFetch(
          `/api/analytics/kpi-breakdown?date=${encodeURIComponent(previousMonthStr)}`
        );
        const kpiResult = await kpiResponse.json();

        if (kpiResult.success && kpiResult.data) {
          const breakdowns = kpiResult.data.breakdowns || [];
          
          const followerBreakdown = breakdowns.find((b: any) => b.key === "current_followers");
          const followerIncrease = followerBreakdown?.value || 0;

          const lowKPIs = breakdowns
            .filter((b: any) => {
              if (b.key === "current_followers") return false;
              if (b.changePct === undefined || isNaN(b.changePct)) return false;
              return b.changePct < 0 || (b.changePct < 10 && b.value > 0);
            })
            .sort((a: any, b: any) => {
              const aChange = a.changePct || 0;
              const bChange = b.changePct || 0;
              return aChange - bChange;
            })
            .slice(0, 2);

          const analyticsResponse = await authFetch(`/api/analytics`);
          const analyticsResult = await analyticsResponse.json();
          const analytics = analyticsResult.analytics || analyticsResult.data || [];
          
          const previousMonthStart = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1);
          const previousMonthEnd = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0, 23, 59, 59);
          
          const totalPosts = analytics.filter((item: any) => {
            if (!item.publishedAt) return false;
            const publishedAt = item.publishedAt instanceof Date 
              ? item.publishedAt 
              : new Date(item.publishedAt);
            return publishedAt >= previousMonthStart && publishedAt <= previousMonthEnd;
          }).length;

          setPreviousMonthData({
            followerIncrease,
            totalPosts,
            lowKPIs,
          });
        }
      } catch (error) {
        console.error("先月のデータ取得エラー:", error);
      } finally {
        setIsLoadingPreviousMonth(false);
      }
    };

    fetchPreviousMonthData();
  }, [user]);

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
          <span className="mr-2">📊</span>目標達成シミュレーション
        </h3>
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-black mb-4">
            左側で目標を入力し、シミュレーションを実行してください
          </p>
          {onRunSimulation && (
            <button
              onClick={onRunSimulation}
              disabled={isSimulating}
              className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSimulating ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  シミュレーション実行中...
                </div>
              ) : (
                "🎯 シミュレーション実行"
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
    <section className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-light text-gray-900 tracking-tight">
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
              {parseInt(formData.currentFollowers).toLocaleString()}人
            </div>
            <div className="text-sm text-gray-500 mb-4">現在のフォロワー数</div>
            <div className="flex items-center justify-center space-x-2 text-gray-400 mb-4">
              <div className="h-px bg-gray-300 flex-1"></div>
              <span className="text-xs">目標</span>
              <div className="h-px bg-gray-300 flex-1"></div>
            </div>
            <div className="text-2xl font-light text-orange-600 mb-1">
              {parseInt(formData.currentFollowers) + parseInt(formData.followerGain)}人
            </div>
            <div className="text-sm text-orange-600 font-medium">
              +{parseInt(formData.followerGain)}人必要
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
                  残り <span className="font-medium text-orange-600">{periodInfo.daysRemaining}日</span> で <span className="font-medium text-orange-600">+{parseInt(formData.followerGain)}人</span> の増加が必要です。
                </p>
                <p className="text-sm text-gray-500">
                  1日あたり <span className="font-medium text-orange-600">+{dailyPace}人</span> のペースで成長を維持する必要があります。
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
        {postBreakdown && periodInfo && (
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
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">投稿数</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">予測増加数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-4 text-sm text-gray-900">リール</td>
                    <td className="px-4 py-4 text-center text-sm font-medium text-gray-900">
                      {postBreakdown.reel.frequency}
                    </td>
                    <td className="px-4 py-4 text-center text-sm font-medium text-orange-600">+{postBreakdown.reel.expected}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-4 text-sm text-gray-900">フィード投稿</td>
                    <td className="px-4 py-4 text-center text-sm font-medium text-gray-900">
                      {postBreakdown.feed.frequency}
                    </td>
                    <td className="px-4 py-4 text-center text-sm font-medium text-orange-600">+{postBreakdown.feed.expected}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-4 text-sm text-gray-900">ストーリー</td>
                    <td className="px-4 py-4 text-center text-sm font-medium text-gray-900">
                      {postBreakdown.story.frequency}
                    </td>
                    <td className="px-4 py-4 text-center text-sm font-medium text-orange-600">+{postBreakdown.story.expected}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  {periodInfo && periodInfo.daysRemaining >= 28 
                    ? "今月の目標投稿数" 
                    : `残り期間の目標投稿数（残り${periodInfo?.daysRemaining || 0}日間）`}
                </span>
                <span className="text-xl font-light text-orange-600">
                  {postBreakdown.reel.countTotal + postBreakdown.feed.countTotal + postBreakdown.story.countTotal}投稿
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                リール {postBreakdown.reel.countTotal}投稿 + フィード {postBreakdown.feed.countTotal}投稿 + ストーリー {postBreakdown.story.countTotal}回
              </div>
            </div>
            {goalAchievementRate.showAdSuggestion && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h5 className="text-sm font-medium text-gray-700 mb-3">広告予算の投入</h5>
                <p className="text-sm text-gray-600 leading-relaxed mb-2">
                  Instagram広告を活用して、オーガニックな成長を補完します。月1-2万円程度の予算で成長ペースを加速できます。
                </p>
                <p className="text-sm font-medium text-orange-600">
                  月間+10-20%の成長促進
                </p>
              </div>
            )}
          </div>
        )}

        {/* 先月の課題 */}
        {previousMonthData && previousMonthData.lowKPIs.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
              先月の課題
            </h4>
            <div className="space-y-3">
              {previousMonthData.lowKPIs.map((kpi) => (
                <div key={kpi.key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-700">{kpi.label}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {kpi.changePct !== undefined && kpi.changePct < 0
                      ? `${kpi.changePct.toFixed(1)}%`
                      : kpi.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 保存ボタン */}
        {onSave && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <button
              onClick={onSave}
              disabled={isSaving}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-md font-medium transition-all duration-200 flex items-center justify-center shadow-sm"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  保存中...
                </>
              ) : (
                <>
                  {hasActivePlan
                    ? "シミュレーションを更新"
                    : "シミュレーションを保存"}
                </>
              )}
            </button>
          </div>
        )}
        </div>
      </div>
    </section>
  );
};
