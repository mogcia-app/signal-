"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import SNSLayout from "../../components/sns-layout";
import { useAuth } from "../../contexts/auth-context";
import { authFetch } from "../../utils/authFetch";
import { notify } from "../../lib/ui/notifications";
import { Users, Loader2, Lightbulb, ArrowRight } from "lucide-react";
import { KPISummaryCard } from "./components/KPISummaryCard";
import { MonthlyGoalsCard } from "./components/MonthlyGoalsCard";

export default function HomePage() {
  const { user } = useAuth();
  const isAuthReady = useMemo(() => Boolean(user), [user]);
  const [currentFollowers, setCurrentFollowers] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  interface ActionPlan {
    title: string;
    description: string;
    action: string;
  }

  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [isLoadingActionPlans, setIsLoadingActionPlans] = useState(false);

  // KPIサマリー
  const [kpiBreakdowns, setKpiBreakdowns] = useState<any[]>([]);
  const [isLoadingKPI, setIsLoadingKPI] = useState(false);

  // 今月の目標
  const [targetFollowers, setTargetFollowers] = useState<number | undefined>();
  const [currentFollowersForGoals, setCurrentFollowersForGoals] = useState<number | undefined>();
  const [targetPosts, setTargetPosts] = useState<number | undefined>();
  const [actualPosts, setActualPosts] = useState<number | undefined>();
  const [isLoadingGoals, setIsLoadingGoals] = useState(false);

  // 現在の月を取得
  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);

  // フォロワー数を取得
  const fetchFollowerCount = useCallback(async () => {
    if (!isAuthReady) return;

    setIsLoading(true);
    try {
      const response = await authFetch(`/api/follower-counts?month=${currentMonth}&snsType=instagram`);

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // 入力欄は常に空にするため、値を設定しない
          setLastUpdated(result.data.updatedAt);
        }
      }
    } catch (err) {
      console.error("フォロワー数取得エラー:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthReady, currentMonth]);

  // フォロワー数を保存
  const saveFollowerCount = async () => {
    if (!currentFollowers || parseInt(currentFollowers, 10) < 0) {
      notify({
        type: "error",
        message: "フォロワー数は0以上の数値を入力してください",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await authFetch("/api/follower-counts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          followers: parseInt(currentFollowers, 10),
          month: currentMonth,
          snsType: "instagram",
          source: "manual",
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setLastUpdated(result.data.updatedAt);
          notify({
            type: "success",
            message: "フォロワー数を保存しました",
          });
        }
      } else {
        throw new Error("保存に失敗しました");
      }
    } catch (err) {
      console.error("フォロワー数保存エラー:", err);
      notify({
        type: "error",
        message: "フォロワー数の保存に失敗しました",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // アクションプランを取得（独立したAPIから）
  const fetchActionPlans = useCallback(async () => {
    if (!isAuthReady) return;

    setIsLoadingActionPlans(true);
    try {
      const response = await authFetch(`/api/analytics/monthly-proposals?date=${currentMonth}`);

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.actionPlans) {
          setActionPlans(result.data.actionPlans);
        }
      }
    } catch (err) {
      console.error("アクションプラン取得エラー:", err);
    } finally {
      setIsLoadingActionPlans(false);
    }
  }, [isAuthReady, currentMonth]);

  // KPIサマリーを取得
  const fetchKPISummary = useCallback(async () => {
    if (!isAuthReady) return;

    setIsLoadingKPI(true);
    try {
      const response = await authFetch(`/api/analytics/kpi-breakdown?date=${encodeURIComponent(currentMonth)}`);

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.breakdowns) {
          setKpiBreakdowns(result.data.breakdowns);
        }
      } else {
        console.error("KPIサマリー取得エラー:", response.status, await response.text());
      }
    } catch (err) {
      console.error("KPIサマリー取得例外:", err);
    } finally {
      setIsLoadingKPI(false);
    }
  }, [isAuthReady, currentMonth]);

  // 今月の目標を取得
  const fetchMonthlyGoals = useCallback(async () => {
    if (!isAuthReady) return;

    setIsLoadingGoals(true);
    try {
      // 現在のフォロワー数を取得（/homeで入力された数字）
      let homeFollowersValue: number | undefined;
      try {
        const followerResponse = await authFetch(`/api/follower-counts?month=${currentMonth}&snsType=instagram`);
        if (followerResponse.ok) {
          const followerResult = await followerResponse.json();
          console.log("フォロワー数取得結果:", { 
            success: followerResult.success, 
            data: followerResult.data,
            currentMonth 
          });
          if (followerResult.success && followerResult.data) {
            homeFollowersValue = followerResult.data.followers;
            console.log("フォロワー数（follower_countsから）:", homeFollowersValue);
          } else {
            // データがない場合は、オンボーディングの初期値を取得
            console.log("follower_countsにデータがないため、初期値を取得します");
            const userProfileResponse = await authFetch("/api/user/profile");
            if (userProfileResponse.ok) {
              const userProfile = await userProfileResponse.json();
              if (userProfile.data?.businessInfo?.initialFollowers) {
                homeFollowersValue = userProfile.data.businessInfo.initialFollowers;
                console.log("フォロワー数（初期値から）:", homeFollowersValue);
              }
            }
          }
        } else {
          const errorText = await followerResponse.text();
          console.error("フォロワー数取得エラー:", followerResponse.status, errorText);
        }
      } catch (followerErr) {
        console.error("フォロワー数取得例外:", followerErr);
      }

      // 分析ページで入力されたフォロワー増加数の合計を取得
      // （KPI分解APIから取得するため、後でKPI分解APIを呼び出す際に一緒に取得する）
      let analyticsFollowerIncrease: number = 0;

      // 合計を計算
      const currentFollowersValue = (homeFollowersValue || 0) + analyticsFollowerIncrease;
      console.log("最終的なcurrentFollowersValue（合計）:", {
        homeFollowers: homeFollowersValue || 0,
        analyticsIncrease: analyticsFollowerIncrease,
        total: currentFollowersValue
      });

      // 計画を取得
      let planResponse;
      try {
        const planUrl = `/api/plans?snsType=instagram&status=active&effectiveMonth=${encodeURIComponent(currentMonth)}&limit=1`;
        planResponse = await authFetch(planUrl);
      } catch (planErr) {
        console.error("計画取得例外:", planErr);
        setIsLoadingGoals(false);
        return;
      }

      if (planResponse.ok) {
        const planResult = await planResponse.json();
        if (planResult.success && planResult.plans && planResult.plans.length > 0) {
          const plan = planResult.plans[0];
          
          // 目標フォロワー数を設定
          if (plan.targetFollowers) {
            setTargetFollowers(plan.targetFollowers);
          }
          
          // シミュレーション結果から月間投稿数を取得
          let targetPostsValue: number | undefined;
          if (plan.simulationResult?.monthlyPostCount) {
            targetPostsValue = plan.simulationResult.monthlyPostCount;
          } else if (plan.formData?.monthlyPosts) {
            const monthlyPostsValue = typeof plan.formData.monthlyPosts === "string" 
              ? parseInt(plan.formData.monthlyPosts, 10)
              : plan.formData.monthlyPosts;
            if (!isNaN(monthlyPostsValue)) {
              targetPostsValue = monthlyPostsValue;
            }
          }

          // KPI分解APIから目標達成度を取得（投稿数の実績も含む）
          // また、分析ページで入力されたフォロワー増加数の合計も取得
          let analyticsFollowerIncrease: number = 0;
          try {
            if (!currentMonth) {
              console.error("currentMonthが設定されていません");
              return;
            }
            const kpiUrl = `/api/analytics/kpi-breakdown?date=${encodeURIComponent(currentMonth)}`;
            console.log("KPI分解API呼び出し:", { currentMonth, kpiUrl });
            const kpiResponse = await authFetch(kpiUrl);
            if (kpiResponse.ok) {
              const kpiResult = await kpiResponse.json();
              if (kpiResult.success && kpiResult.data) {
                // 分析ページで入力されたフォロワー増加数の合計を取得
                const followerBreakdown = kpiResult.data.breakdowns?.find((b: any) => b.key === "followers");
                if (followerBreakdown) {
                  analyticsFollowerIncrease = followerBreakdown.value || 0;
                  console.log("分析ページのフォロワー増加数合計:", analyticsFollowerIncrease);
                }

                // 投稿数の実績を取得
                if (kpiResult.data.goalAchievements) {
                  const goalAchievements = kpiResult.data.goalAchievements;
                  const postsGoal = goalAchievements.find((g: any) => g.key === "posts");
                  if (postsGoal) {
                    setActualPosts(postsGoal.actual);
                    // 目標投稿数が設定されていない場合、goalAchievementsから取得
                    if (!targetPostsValue && postsGoal.target) {
                      targetPostsValue = postsGoal.target;
                    }
                  }
                }
              }
            } else {
              const errorText = await kpiResponse.text();
              console.error("KPI分解取得エラー:", {
                status: kpiResponse.status,
                statusText: kpiResponse.statusText,
                error: errorText,
                url: kpiUrl,
                currentMonth
              });
            }
          } catch (kpiErr) {
            console.error("KPI分解取得例外:", kpiErr);
          }

          // /homeで入力された数字と分析ページで入力された数字を足し合わせる
          const totalFollowersValue = (homeFollowersValue || 0) + analyticsFollowerIncrease;
          console.log("フォロワー数合計:", {
            homeFollowers: homeFollowersValue || 0,
            analyticsIncrease: analyticsFollowerIncrease,
            total: totalFollowersValue
          });

          // 現在のフォロワー数を設定（目標表示用）
          setCurrentFollowersForGoals(totalFollowersValue);
          // フォロワー数入力セクション用には設定しない（/homeで入力された値のみを使用）

          // 目標投稿数を設定
          if (targetPostsValue) {
            setTargetPosts(targetPostsValue);
          }
        } else {
          // 計画が存在しない場合、状態をリセット
          setTargetFollowers(undefined);
          setTargetPosts(undefined);
          setActualPosts(undefined);
        }
      } else {
        // 計画取得が失敗した場合
        let errorText = "";
        try {
          errorText = await planResponse.text();
        } catch (e) {
          errorText = "エラーレスポンスの読み取りに失敗しました";
        }
        console.error("計画取得エラー:", {
          status: planResponse.status,
          statusText: planResponse.statusText,
          error: errorText,
          url: `/api/plans?snsType=instagram&status=active&effectiveMonth=${currentMonth}&limit=1`
        });
        // 400エラーの場合は、パラメータの問題の可能性がある
        if (planResponse.status === 400) {
          console.error("400エラー: リクエストパラメータを確認してください", {
            currentMonth,
            encodedMonth: encodeURIComponent(currentMonth),
            url: `/api/plans?snsType=instagram&status=active&effectiveMonth=${encodeURIComponent(currentMonth)}&limit=1`
          });
        }
      }
    } catch (err) {
      console.error("今月の目標取得エラー:", err);
    } finally {
      setIsLoadingGoals(false);
    }
  }, [isAuthReady, currentMonth]);

  useEffect(() => {
    if (isAuthReady) {
      fetchFollowerCount();
      fetchActionPlans();
      fetchKPISummary();
      fetchMonthlyGoals();
    }
  }, [isAuthReady, fetchFollowerCount, fetchActionPlans, fetchKPISummary, fetchMonthlyGoals]);

  return (
    <SNSLayout customTitle="ホーム" customDescription="今月の目標とKPIサマリー">
      <div className="w-full p-6 sm:p-8 bg-gray-50 min-h-screen">

        {/* KPIサマリーカード */}
        <KPISummaryCard breakdowns={kpiBreakdowns} isLoading={isLoadingKPI} />

        {/* 今月の目標 */}
        <MonthlyGoalsCard
          targetFollowers={targetFollowers}
          currentFollowers={currentFollowersForGoals}
          targetPosts={targetPosts}
          actualPosts={actualPosts}
          isLoading={isLoadingGoals}
        />

        {/* フォロワー数入力セクション */}
        <div className="bg-white rounded-xl p-6 mb-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center border border-orange-100">
              <Users className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">現在のフォロワー数</h2>
              <p className="text-xs text-gray-500 mt-0.5">月間のフォロワー数を記録</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              <p className="ml-3 text-sm text-gray-500">読み込み中...</p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-3">
                {currentMonth}のフォロワー数
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={currentFollowers}
                  onChange={(e) => setCurrentFollowers(e.target.value)}
                  placeholder="フォロワー数を入力"
                  min="0"
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  disabled={isSaving}
                />
                <button
                  onClick={saveFollowerCount}
                  disabled={isSaving || !currentFollowers}
                  className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                      保存中
                    </>
                  ) : (
                    "保存"
                  )}
                </button>
              </div>
              {lastUpdated && (
                <p className="text-xs text-gray-400 mt-3">
                  最終更新: {new Date(lastUpdated).toLocaleString("ja-JP")}
                </p>
              )}
            </div>
          )}
        </div>


        {/* 今月のアクションプラン */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center border border-orange-100">
                <Lightbulb className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">今月のアクションプラン</h2>
                <p className="text-xs text-gray-500 mt-0.5">AIが提案する改善アクション</p>
              </div>
            </div>
            <a
              href="/instagram/report"
              className="text-xs text-gray-600 hover:text-orange-600 font-medium flex items-center gap-1 transition-colors"
            >
              詳細を見る
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {isLoadingActionPlans ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              <p className="ml-3 text-sm text-gray-500">読み込み中...</p>
            </div>
          ) : actionPlans.length > 0 ? (
            <div className="space-y-3">
              {actionPlans.map((plan, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-100"
                >
                  <h3 className="text-sm font-semibold text-gray-900 mb-1.5">
                    {index + 1}. {plan.title}
                  </h3>
                  {plan.description && (
                    <p className="text-xs text-gray-600 mb-2 leading-relaxed">{plan.description}</p>
                  )}
                  {plan.action && (
                    <div className="flex items-start gap-2 mt-2 pt-2 border-t border-gray-100">
                      <ArrowRight className="w-3.5 h-3.5 text-orange-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-600 leading-relaxed">{plan.action}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">アクションプランがありません</p>
              <p className="text-xs mt-1">月次レポートページで生成できます</p>
            </div>
          )}
        </div>
      </div>
    </SNSLayout>
  );
}

