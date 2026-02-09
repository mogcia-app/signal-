"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../../contexts/auth-context";
import { useUserProfile } from "@/hooks/useUserProfile";
import { canAccessFeature } from "@/lib/plan-access";
import { authFetch } from "../../../utils/authFetch";
import { handleError } from "../../../utils/error-handling";
import { ERROR_MESSAGES } from "../../../constants/error-messages";
import SNSLayout from "../../../components/sns-layout";
import { PlanForm } from "./components/PlanForm";
import { SimulationResult } from "./components/SimulationResult";
import { PlanFormData, SimulationResult as SimulationResultType, AIPlanSuggestion } from "./types/plan";
import { isValidPlanData } from "./utils/type-guards";
import type { PlanData } from "../../../hooks/usePlanData";
import { Loader2, Edit2, Trash2 } from "lucide-react";

export default function InstagramPlanPage() {
  const { user } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const [isLoading, setIsLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResultType | null>(null);
  const [formData, setFormData] = useState<PlanFormData | null>(null);
  const [aiSuggestedTarget, setAiSuggestedTarget] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null);
  const [planEndDate, setPlanEndDate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<"form" | "simulation">("form");

  const isAuthReady = Boolean(user);

  // 直近で保存された計画を読み込む
  // 重要: stateは信用しない。毎回DBから復元する
  useEffect(() => {
    if (!isAuthReady || profileLoading) return;

    const loadLatestPlan = async () => {
      try {
        console.log("[Plan Page] 計画読み込み開始");
        const response = await authFetch("/api/plans?snsType=instagram&status=active&limit=1");
        if (!response.ok) {
          console.log("[Plan Page] 計画取得失敗:", response.status, response.statusText);
          // 計画がない場合は状態をクリア
          setSimulationResult(null);
          setFormData(null);
          setSavedPlanId(null);
          setPlanEndDate(null);
          return;
        }
        
        const data = await response.json();
        console.log("[Plan Page] 計画取得結果:", {
          hasPlans: !!data.plans,
          plansCount: data.plans?.length || 0,
        });
        
        if (!data.plans || data.plans.length === 0) {
          console.log("[Plan Page] 計画がありません");
          // 計画がない場合は状態をクリア
          setSimulationResult(null);
          setFormData(null);
          setSavedPlanId(null);
          setPlanEndDate(null);
          return;
        }
        
        const plan = data.plans[0];
        console.log("[Plan Page] 計画データ:", {
          planId: plan.id,
          hasFormData: !!plan.formData,
          hasSimulationResult: !!plan.simulationResult,
          hasStartDate: !!plan.startDate,
          hasEndDate: !!plan.endDate,
          formDataKeys: plan.formData ? Object.keys(plan.formData) : [],
          simulationResultKeys: plan.simulationResult ? Object.keys(plan.simulationResult) : [],
        });
        
        // 計画データの完全性をチェック（型ガード関数を使用）
        if (!isValidPlanData(plan)) {
          console.warn("[Plan Page] 計画データが不完全です", {
            hasFormData: !!plan.formData,
            hasSimulationResult: !!plan.simulationResult,
            planId: plan.id,
          });
          // 不完全な計画は状態をクリア
          setSimulationResult(null);
          setFormData(null);
          setSavedPlanId(null);
          setPlanEndDate(null);
          setError(ERROR_MESSAGES.PLAN_DATA_INCOMPLETE);
          return;
        }
        
        // 計画期間が終了していないかチェック
            const now = new Date();
            let planEnd: Date | null = null;
            let planStart: Date | null = null;
            
            // planをPlanDataとして扱う（型アサーション）
            const planData = plan as unknown as PlanData;
            
            // startDateを取得（複数の場所から確認）
            try {
              if (planData.startDate) {
                const startDateValue = planData.startDate instanceof Date 
                  ? planData.startDate 
                  : planData.startDate && typeof planData.startDate === "object" && "toDate" in planData.startDate
                    ? (planData.startDate as { toDate: () => Date }).toDate() 
                    : new Date(planData.startDate as string);
                // 有効な日付かチェック
                if (!isNaN(startDateValue.getTime())) {
                  planStart = startDateValue;
                }
              } else if (planData.formData && typeof planData.formData === "object" && "startDate" in planData.formData) {
                const startDateValue = new Date(planData.formData.startDate as string);
                if (!isNaN(startDateValue.getTime())) {
                  planStart = startDateValue;
                }
              } else if (planData.createdAt) {
                const startDateValue = planData.createdAt instanceof Date 
                  ? planData.createdAt 
                  : planData.createdAt && typeof planData.createdAt === "object" && "toDate" in planData.createdAt
                    ? (planData.createdAt as { toDate: () => Date }).toDate() 
                    : new Date(planData.createdAt as string);
                if (!isNaN(startDateValue.getTime())) {
                  planStart = startDateValue;
                }
              }
            } catch (e) {
              console.warn("開始日の取得に失敗しました", e);
            }
            
            // endDateを取得または計算
            try {
              if (planData.endDate) {
                const endDateValue = planData.endDate instanceof Date 
                  ? planData.endDate 
                  : planData.endDate && typeof planData.endDate === "object" && "toDate" in planData.endDate
                    ? (planData.endDate as { toDate: () => Date }).toDate() 
                    : new Date(planData.endDate as string);
                // 有効な日付かチェック
                if (!isNaN(endDateValue.getTime())) {
                  planEnd = endDateValue;
                }
              } else if (planStart && !isNaN(planStart.getTime())) {
                // periodMonthsまたはplanPeriodから期間を取得
                let periodMonths = 1; // デフォルトは1ヶ月
                
                if (planData.formData && typeof planData.formData === "object" && "periodMonths" in planData.formData) {
                  // formDataから直接取得
                  periodMonths = Number(planData.formData.periodMonths) || 1;
                } else if (planData.planPeriod) {
                  // planPeriodから抽出（"1ヶ月"形式）
                  const period = String(planData.planPeriod);
                  if (period.includes("1年")) {
                    periodMonths = 12;
                  } else if (period.includes("6ヶ月")) {
                    periodMonths = 6;
                  } else if (period.includes("3ヶ月")) {
                    periodMonths = 3;
                  } else if (period.includes("1ヶ月")) {
                    periodMonths = 1;
                  } else {
                    // 数値を抽出を試みる（例："2ヶ月" → 2）
                    const match = period.match(/(\d+)/);
                    if (match) {
                      periodMonths = Number(match[1]) || 1;
                    }
                  }
                }
                
                planEnd = new Date(planStart);
                planEnd.setMonth(planEnd.getMonth() + periodMonths);
                // 有効な日付かチェック
                if (isNaN(planEnd.getTime())) {
                  planEnd = null;
                }
              }
            } catch (e) {
              console.warn("終了日の計算に失敗しました", e);
              planEnd = null;
            }
            
            // 期間終了日の翌日をチェック
            if (planEnd && !isNaN(planEnd.getTime())) {
              try {
                const resetDate = new Date(planEnd);
                resetDate.setDate(resetDate.getDate() + 1);
                resetDate.setHours(0, 0, 0, 0);
                
                // 期間が終了していない場合のみ表示
                if (now < resetDate) {
                  // 計画データの完全性をチェック（型ガード関数を使用）
                  if (!isValidPlanData(planData)) {
                    console.warn("[Plan Page] 計画データが不完全です（期間内）", {
                      hasFormData: !!planData.formData,
                      hasSimulationResult: !!planData.simulationResult,
                      planId: planData.id,
                    });
                    setError(ERROR_MESSAGES.PLAN_DATA_INCOMPLETE);
                    return;
                  }
                  
                  console.log("[Plan Page] 計画データを復元します", {
                    planId: planData.id,
                    planEnd: planEnd.toISOString(),
                  });
                  
                  // 計画データを復元（型ガードにより型安全）
                  const validPlan = planData as PlanData & { formData: PlanFormData; simulationResult: SimulationResultType };
                  
                  // formDataのtargetFollowersが保存された値と一致するように修正
                  if (validPlan.formData && validPlan.targetFollowers) {
                    validPlan.formData.targetFollowers = validPlan.targetFollowers;
                  }
                  if (validPlan.formData && validPlan.currentFollowers) {
                    validPlan.formData.currentFollowers = validPlan.currentFollowers;
                  }
                  
                  setFormData(validPlan.formData);
                  setSimulationResult(validPlan.simulationResult);
                  setSavedPlanId(validPlan.id);
                  setPlanEndDate(planEnd);
                  setError(null); // エラーをクリア
                } else {
                  // 有効な日付の場合のみログ出力
                  try {
                    const planEndStr = planEnd.toISOString();
                    const resetDateStr = resetDate.toISOString();
                    console.log("計画期間が終了しています", {
                      planEnd: planEndStr,
                      resetDate: resetDateStr,
                      now: now.toISOString(),
                    });
                  } catch (e) {
                    console.log("計画期間が終了しています（日付の変換に失敗）");
                  }
                }
              } catch (e) {
                console.warn("期間チェックに失敗しました", e);
                const errorMessage = handleError(
                  e,
                  ERROR_MESSAGES.PLAN_DATE_CALCULATION_FAILED
                );
                setError(errorMessage);
                // エラーが発生した場合は計画を表示しない（状態をクリア）
                setSimulationResult(null);
                setFormData(null);
                setSavedPlanId(null);
                setPlanEndDate(null);
                return;
              }
            } else {
              // 終了日が計算できない場合は計画を表示しない
              console.warn("[Plan Page] 計画の終了日が計算できません", {
                hasEndDate: !!planData.endDate,
                endDateValue: planData.endDate,
                hasPlanStart: !!planStart,
                planStartValid: planStart ? !isNaN(planStart.getTime()) : false,
                planStartValue: planStart ? planStart.toISOString() : null,
                hasFormData: !!planData.formData,
                hasPeriodMonths: planData.formData && typeof planData.formData === "object" && "periodMonths" in planData.formData,
                periodMonths: planData.formData && typeof planData.formData === "object" && "periodMonths" in planData.formData ? planData.formData.periodMonths : undefined,
                periodMonthsType: planData.formData && typeof planData.formData === "object" && "periodMonths" in planData.formData ? typeof planData.formData.periodMonths : undefined,
                hasPlanPeriod: !!planData.planPeriod,
                planPeriod: planData.planPeriod,
                startDate: planData.startDate,
                formDataStartDate: planData.formData && typeof planData.formData === "object" && "startDate" in planData.formData ? planData.formData.startDate : undefined,
                createdAt: planData.createdAt,
              });
              
              // 終了日が計算できない場合でも、計画データがあれば表示を試みる
              // （endDateがなくても、startDateとperiodMonthsがあれば計算できる）
              if (planStart && !isNaN(planStart.getTime())) {
                let periodMonths = 1; // デフォルトは1ヶ月
                
                // periodMonthsを取得（複数の場所から確認）
                if (planData.formData && typeof planData.formData === "object" && "periodMonths" in planData.formData) {
                  periodMonths = Number(planData.formData.periodMonths) || 1;
                } else if (planData.planPeriod) {
                  // planPeriodから抽出（"1ヶ月"形式）
                  const period = String(planData.planPeriod);
                  if (period.includes("1年")) {
                    periodMonths = 12;
                  } else if (period.includes("6ヶ月")) {
                    periodMonths = 6;
                  } else if (period.includes("3ヶ月")) {
                    periodMonths = 3;
                  } else if (period.includes("1ヶ月")) {
                    periodMonths = 1;
                  } else {
                    // 数値を抽出を試みる（例："2ヶ月" → 2）
                    const match = period.match(/(\d+)/);
                    if (match) {
                      periodMonths = Number(match[1]) || 1;
                    }
                  }
                }
                
                const calculatedEndDate = new Date(planStart);
                calculatedEndDate.setMonth(calculatedEndDate.getMonth() + periodMonths);
                
                if (!isNaN(calculatedEndDate.getTime())) {
                  console.log("[Plan Page] 終了日を計算しました", {
                    planStart: planStart.toISOString(),
                    periodMonths,
                    calculatedEndDate: calculatedEndDate.toISOString(),
                  });
                  
                  // 計画データの完全性をチェック（型ガード関数を使用）
                  if (!isValidPlanData(planData)) {
                    setError(ERROR_MESSAGES.PLAN_DATA_INCOMPLETE);
                    return;
                  }
                  
                  // 計画データを復元（型ガードにより型安全）
                  const validPlan = planData as PlanData & { formData: PlanFormData; simulationResult: SimulationResultType };
                  setFormData(validPlan.formData);
                  setSimulationResult(validPlan.simulationResult);
                  setSavedPlanId(validPlan.id);
                  setPlanEndDate(calculatedEndDate);
                  setError(null); // エラーをクリア
                  return;
                } else {
                  console.warn("[Plan Page] 終了日の計算に失敗しました", {
                    planStart: planStart.toISOString(),
                    periodMonths,
                  });
                  setError(ERROR_MESSAGES.PLAN_DATE_CALCULATION_FAILED);
                }
              }
              
              // どうしても計算できない場合は状態をクリア
              console.error("[Plan Page] 計画を表示できません。必要なデータが不足しています。");
              setError(ERROR_MESSAGES.PLAN_DATA_INCOMPLETE);
              setSimulationResult(null);
              setFormData(null);
              setSavedPlanId(null);
              setPlanEndDate(null);
              return;
            }
      } catch (error) {
        console.error("計画読み込みエラー:", error);
        const errorMessage = handleError(
          error,
          ERROR_MESSAGES.PLAN_LOAD_FAILED
        );
        // 計画がない場合もあるため、エラーはログのみ（ユーザーには表示しない）
        // ただし、明らかなエラーの場合はユーザーに表示
        if (error instanceof Error && !error.message.includes("not found")) {
          setError(errorMessage);
        }
        console.error(errorMessage);
      }
    };

    loadLatestPlan();
  }, [isAuthReady, profileLoading]);

  // 計画期間終了日の翌日に自動リセット
  useEffect(() => {
    if (!planEndDate || !savedPlanId) return;

    const checkAndReset = () => {
      const now = new Date();
      const resetDate = new Date(planEndDate);
      resetDate.setDate(resetDate.getDate() + 1);
      resetDate.setHours(0, 0, 0, 0); // 終了日の翌日の0時

      if (now >= resetDate) {
        // 期間終了日の翌日になったらリセット
        setSimulationResult(null);
        setFormData(null);
        setAiSuggestedTarget(undefined);
        setSavedPlanId(null);
        setPlanEndDate(null);
        setIsLoading(false);
        
        toast("計画期間が終了しました。新しい計画を作成できます。", {
          duration: 5000,
          position: "top-right",
          icon: "ℹ️",
        });
      }
    };

    // 初回チェック
    checkAndReset();

    // 1時間ごとにチェック
    const interval = setInterval(checkAndReset, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [planEndDate, savedPlanId]);

  // プランアクセス権限チェック
  if (!isAuthReady || profileLoading) {
    return (
      <SNSLayout customTitle="Instagram 運用計画" customDescription="強みを活かす、実行可能なSNS計画を立てましょう">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 text-[#FF8A15] animate-spin" />
        </div>
      </SNSLayout>
    );
  }

  if (!canAccessFeature(userProfile, "canAccessPlan")) {
    return (
      <SNSLayout customTitle="Instagram 運用計画" customDescription="強みを活かす、実行可能なSNS計画を立てましょう">
        <div className="max-w-2xl mx-auto p-6">
          <div className="bg-yellow-50 border border-yellow-200 p-6 text-center">
            <h2 className="text-lg font-semibold text-yellow-900 mb-2">
              運用計画機能は、現在のプランではご利用いただけません
            </h2>
            <p className="text-sm text-yellow-700">
              松プランにアップグレードすると、この機能をご利用いただけます。
            </p>
          </div>
        </div>
      </SNSLayout>
    );
  }

  const handleSubmit = async (data: PlanFormData, aiSuggested?: number) => {
    setIsLoading(true);
    setError(null);
    
    // 最低5秒はローディングを表示
    const minLoadingTime = 5000;
    const startTime = Date.now();
    
    try {
      // バリデーション
      if (data.currentFollowers <= 0 || data.targetFollowers <= 0) {
        setError("現在のフォロワー数と目標フォロワー数は1以上である必要があります");
        setIsLoading(false);
        return;
      }
      
      if (data.targetFollowers <= data.currentFollowers) {
        setError("目標フォロワー数は現在のフォロワー数より大きい必要があります");
        setIsLoading(false);
        return;
      }

      // シミュレーション計算（API経由）
      const response = await authFetch("/api/instagram/plan-simulation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formData: data,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "シミュレーションの計算に失敗しました";
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      const result = responseData.result;
      
      // 最低表示時間を確保
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
      
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
      // フォームデータとシミュレーション結果を設定
      setFormData(data);
      setSimulationResult(result);
      setAiSuggestedTarget(aiSuggested);
      
      // シミュレーションタブに切り替え
      setActiveTab("simulation");
    } catch (err) {
      const errorMessage = handleError(
        err,
        "シミュレーションの計算に失敗しました"
      );
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 計画を編集（フォームで変更後、再度保存する）
  const handleEditPlan = () => {
    toast("計画を編集できます。左側のフォームで変更後、「この計画で始める」ボタンで更新できます。", {
      duration: 4000,
      position: "top-right",
      icon: "ℹ️",
    });
  };

  // 計画を削除
  const handleDeletePlan = async () => {
    if (!savedPlanId) return;

    if (!confirm("この計画を削除してもよろしいですか？")) {
      return;
    }

    try {
      const response = await authFetch(`/api/plans/${savedPlanId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = handleError(
          errorData.error || ERROR_MESSAGES.PLAN_DELETE_FAILED,
          ERROR_MESSAGES.PLAN_DELETE_FAILED
        );
        throw new Error(errorMessage);
      }

      // 状態を完全にリセット（削除成功時）
      setSimulationResult(null);
      setFormData(null);
      setAiSuggestedTarget(undefined);
      setSavedPlanId(null);
      setPlanEndDate(null);
      setIsLoading(false);

      toast.success("計画を削除しました", {
        duration: 2000,
        position: "top-right",
      });
      
      // 即座にページをリロードして確実に状態をクリア
      window.location.href = "/instagram/plan";
    } catch (err) {
      console.error("計画削除エラー:", err);
      const errorMessage = handleError(
        err,
        "計画の削除に失敗しました"
      );
      toast.error(errorMessage, {
        duration: 3000,
        position: "top-right",
      });
    }
  };

  const handleSelectAlternative = async (planId: string) => {
    if (!formData || !simulationResult?.alternativePlans) return;
    
    const selectedPlan = simulationResult.alternativePlans.find(p => p.id === planId);
    if (!selectedPlan) return;

    // 選択した代替案でフォームデータを更新
    const updatedFormData: PlanFormData = {
      ...formData,
      targetFollowers: selectedPlan.targetFollowers,
      weeklyFeedPosts: selectedPlan.weeklyFeedPosts,
      weeklyReelPosts: selectedPlan.weeklyReelPosts,
      weeklyStoryPosts: selectedPlan.weeklyStoryPosts,
    };

    // 再計算（API経由）
    try {
      const response = await authFetch("/api/instagram/plan-simulation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formData: updatedFormData,
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        setSimulationResult(responseData.result);
        setFormData(updatedFormData);
      }
    } catch (error) {
      console.error("シミュレーション再計算エラー:", error);
    }
  };

  const handleStartPlan = async () => {
    if (!formData || !simulationResult) {
      setError("フォームデータまたはシミュレーション結果がありません");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // 開始日をformDataから取得
      const startDate = formData.startDate || new Date().toISOString().split("T")[0];
      
      // 終了日を計算
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(startDateObj);
      endDateObj.setMonth(endDateObj.getMonth() + formData.periodMonths);
      const endDate = endDateObj.toISOString().split("T")[0];

      // 計画データを準備
      const planData = {
        snsType: "instagram",
        status: "active",
        title: "Instagram成長計画",
        targetFollowers: formData.targetFollowers,
        currentFollowers: formData.currentFollowers,
        planPeriod: `${formData.periodMonths}ヶ月`,
        targetAudience: formData.targetAudience || "未設定",
        category: formData.mainGoal || "未設定",
        strategies: [],
        postCategories: formData.contentTypes || [],
        formData: formData,
        simulationResult: simulationResult,
        startDate: startDate,
        endDate: endDate, // 終了日も明示的に送信
      };

      // 既存の計画がある場合は更新、ない場合は新規作成
      const response = savedPlanId
        ? await authFetch(`/api/plans/${savedPlanId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(planData),
          })
        : await authFetch("/api/plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(planData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = handleError(
          errorData.error || ERROR_MESSAGES.PLAN_SAVE_FAILED,
          ERROR_MESSAGES.PLAN_SAVE_FAILED
        );
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // 保存された計画IDと終了日を保持
      const planId = savedPlanId || result.id;
      setSavedPlanId(planId);
      
      // 終了日を計算して保存
      if (formData.startDate) {
        const startDate = new Date(formData.startDate);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + formData.periodMonths);
        setPlanEndDate(endDate);
      }
      
      // フォームデータを確実に更新（保存内容を反映）
      // formDataは既にstateに保持されているが、念のため明示的に更新
      setFormData(formData);

      // 成功メッセージをトースト通知で表示
      toast.success(
        savedPlanId ? "計画を更新しました！" : "計画を保存しました！ホーム画面で確認できます。",
        {
          duration: 4000,
          position: "top-right",
        }
      );

      // 状態はリセットせず、そのまま表示を維持
      // フォームタブに切り替えて保存内容を確認できるようにする
      setActiveTab("form");
    } catch (err) {
      console.error("計画保存エラー:", err);
      const errorMessage = handleError(
        err,
        "計画の保存に失敗しました"
      );
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SNSLayout customTitle="Instagram 運用計画" customDescription="強みを活かす、実行可能なSNS計画を立てましょう">
      <div className="w-full px-4 sm:px-6 md:px-8 py-6 bg-gray-50 min-h-screen">
        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* タブUI */}
        <div className="mb-6 bg-white border-2 border-gray-200 p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <nav className="flex space-x-1" aria-label="Tabs">
              <button
                onClick={() => setActiveTab("form")}
                className={`
                  px-6 py-3 font-medium text-sm transition-colors border-2
                  ${
                    activeTab === "form"
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }
                `}
              >
                新しく計画を立てる
              </button>
              <button
                onClick={() => setActiveTab("simulation")}
                className={`
                  px-6 py-3 font-medium text-sm transition-colors relative border-2
                  ${
                    activeTab === "simulation"
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }
                `}
              >
                シミュレーション
                {simulationResult && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold leading-none text-gray-900 bg-white border border-gray-900">
                    ✓
                  </span>
                )}
              </button>
            </nav>
            
            {/* 計画保存後の編集・削除ボタン（タブの横に配置） */}
            {savedPlanId && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleEditPlan}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border-2 border-gray-300 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  計画を編集
                </button>
                <button
                  type="button"
                  onClick={handleDeletePlan}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 border-2 border-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  計画を削除
                </button>
              </div>
            )}
          </div>
        </div>

        {/* タブコンテンツ */}
        <div className="bg-white border-2 border-gray-200 p-6 min-h-[600px]">
          {activeTab === "form" ? (
            <PlanForm onSubmit={handleSubmit} isLoading={isLoading} initialData={formData} />
          ) : (
            <div>
              {simulationResult && formData ? (
                <SimulationResult
                  result={simulationResult}
                  formData={{
                    currentFollowers: formData.currentFollowers,
                    targetFollowers: formData.targetFollowers,
                    periodMonths: formData.periodMonths,
                    startDate: formData.startDate,
                  }}
                  fullFormData={formData}
                  aiSuggestedTarget={aiSuggestedTarget}
                  onSelectAlternative={handleSelectAlternative}
                  onStartPlan={handleStartPlan}
                  isSaving={isSaving}
                />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-sm mb-4">フォームに入力して、シミュレーションを実行してください</p>
                  <button
                    onClick={() => setActiveTab("form")}
                    className="px-6 py-3 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border-2 border-gray-300 transition-colors"
                  >
                    計画を立てるタブに戻る
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </SNSLayout>
  );
}

