"use client";

import React, { useEffect } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../../contexts/auth-context";
import { useUserProfile } from "@/hooks/useUserProfile";
import { canAccessFeature } from "@/lib/plan-access";
import SNSLayout from "../../../components/sns-layout";
import { PlanForm } from "./components/PlanForm";
import { SimulationResult } from "./components/SimulationResult";
import { PlanTabs } from "./components/PlanTabs";
import { PlanErrorDisplay } from "./components/PlanErrorDisplay";
import { usePlanStore } from "@/stores/plan-store";
import { Loader2 } from "lucide-react";
import type { AIPlanSuggestion } from "./types/plan";

export default function InstagramPlanPage() {
  const { user } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const isAuthReady = Boolean(user);

  // Zustandストアから状態を取得
  const formData = usePlanStore((state) => state.formData);
  const simulationResult = usePlanStore((state) => state.simulationResult);
  const aiSuggestion = usePlanStore((state) => state.aiSuggestion);
  const aiSuggestedTarget = usePlanStore((state) => state.aiSuggestedTarget);
  const activeTab = usePlanStore((state) => state.activeTab);
  const planEndDate = usePlanStore((state) => state.planEndDate);
  const savedPlanId = usePlanStore((state) => state.savedPlanId);
  const isLoading = usePlanStore((state) => state.isLoading);
  const isSaving = usePlanStore((state) => state.isSaving);
  const loadLatestPlan = usePlanStore((state) => state.loadLatestPlan);
  const submitPlan = usePlanStore((state) => state.submitPlan);
  const deletePlan = usePlanStore((state) => state.deletePlan);
  const selectAlternative = usePlanStore((state) => state.selectAlternative);
  const startPlan = usePlanStore((state) => state.startPlan);
  const clearPlan = usePlanStore((state) => state.clearPlan);
  const setActiveTab = usePlanStore((state) => state.setActiveTab);
  const setError = usePlanStore((state) => state.setError);

  // 計画を読み込む
  useEffect(() => {
    loadLatestPlan(isAuthReady, profileLoading);
  }, [isAuthReady, profileLoading, loadLatestPlan]);

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
        clearPlan();
        setError(null);
        
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
  }, [planEndDate, savedPlanId, clearPlan, setError]);

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
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
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
      await deletePlan(savedPlanId);
      toast.success("計画を削除しました", {
        duration: 2000,
        position: "top-right",
      });
      // 即座にページをリロードして確実に状態をクリア
      window.location.href = "/instagram/plan";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "計画の削除に失敗しました", {
        duration: 3000,
        position: "top-right",
      });
    }
  };

  const handleStartPlan = async (suggestion: AIPlanSuggestion) => {
    try {
      await startPlan(suggestion);
      toast.success(
        savedPlanId ? "計画を更新しました！" : "計画を保存しました！ホーム画面で確認できます。",
        {
          duration: 4000,
          position: "top-right",
        }
      );
    } catch (err) {
      // エラーはストア内で処理済み
    }
  };

  return (
    <SNSLayout customTitle="Instagram 運用計画" customDescription="強みを活かす、実行可能なSNS計画を立てましょう">
      <div className="w-full h-full min-h-screen p-6">
        <PlanErrorDisplay />

        <PlanTabs onEditPlan={handleEditPlan} onDeletePlan={handleDeletePlan} />

        {/* タブコンテンツ */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 h-full overflow-y-auto">
          {activeTab === "form" ? (
            <PlanForm onSubmit={submitPlan} isLoading={isLoading} initialData={formData} />
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
                  aiSuggestion={aiSuggestion}
                  onSelectAlternative={selectAlternative}
                  onStartPlan={handleStartPlan}
                  isSaving={isSaving}
                />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-sm mb-4">フォームに入力して、シミュレーションを実行してください</p>
                  <button
                    onClick={() => setActiveTab("form")}
                    className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
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

