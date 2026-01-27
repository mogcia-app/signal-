"use client";

import React, { useState } from "react";
import { useAuth } from "../../../contexts/auth-context";
import { useUserProfile } from "@/hooks/useUserProfile";
import { canAccessFeature } from "@/lib/plan-access";
import { authFetch } from "../../../utils/authFetch";
import SNSLayout from "../../../components/sns-layout";
import { PlanForm } from "./components/PlanForm";
import { SimulationResult } from "./components/SimulationResult";
import { PlanFormData, SimulationResult as SimulationResultType, AIPlanSuggestion } from "./types/plan";
import { calculateSimulation } from "./utils/calculations";
import { Loader2 } from "lucide-react";

export default function InstagramPlanPage() {
  const { user } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const [isLoading, setIsLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResultType | null>(null);
  const [formData, setFormData] = useState<PlanFormData | null>(null);
  const [aiSuggestedTarget, setAiSuggestedTarget] = useState<number | undefined>(undefined);
  const [aiSuggestion, setAiSuggestion] = useState<AIPlanSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isAuthReady = Boolean(user);

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

  const handleSubmit = async (data: PlanFormData, aiSuggested?: number) => {
    setIsLoading(true);
    setError(null);
    
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

      // シミュレーション計算
      const result = calculateSimulation(data);
      setSimulationResult(result);
      setFormData(data);
      setAiSuggestedTarget(aiSuggested);
    } catch (err) {
      setError(err instanceof Error ? err.message : "シミュレーションの計算に失敗しました");
    } finally {
      setIsLoading(false);
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

    // 再計算
    const result = calculateSimulation(updatedFormData);
    setSimulationResult(result);
    setFormData(updatedFormData);
  };

  const handleStartPlan = async (suggestion: AIPlanSuggestion) => {
    if (!formData || !simulationResult) {
      setError("フォームデータまたはシミュレーション結果がありません");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // 開始日を設定（今日）
      const startDate = new Date().toISOString().split("T")[0];

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
        aiSuggestion: suggestion, // AI提案データを保存
        startDate: startDate,
      };

      const response = await authFetch("/api/plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(planData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "計画の保存に失敗しました");
      }

      const result = await response.json();
      setAiSuggestion(suggestion);

      // 成功メッセージを表示（オプション）
      alert("計画を保存しました！ホーム画面で確認できます。");

      // ホーム画面にリダイレクト（オプション）
      // window.location.href = "/home";
    } catch (err) {
      console.error("計画保存エラー:", err);
      setError(err instanceof Error ? err.message : "計画の保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SNSLayout customTitle="Instagram 運用計画" customDescription="強みを活かす、実行可能なSNS計画を立てましょう">
      <div className="w-full h-full min-h-screen p-6">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* 左カラム: 入力フォーム */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 h-full overflow-y-auto">
            <PlanForm onSubmit={handleSubmit} isLoading={isLoading} />
          </div>

          {/* 右カラム: シミュレーション結果 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 h-full overflow-y-auto">
            {simulationResult && formData ? (
              <SimulationResult
                result={simulationResult}
                formData={{
                  currentFollowers: formData.currentFollowers,
                  targetFollowers: formData.targetFollowers,
                  periodMonths: formData.periodMonths,
                }}
                fullFormData={formData}
                aiSuggestedTarget={aiSuggestedTarget}
                onSelectAlternative={handleSelectAlternative}
                onStartPlan={handleStartPlan}
                isSaving={isSaving}
              />
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">左側のフォームに入力して、シミュレーションを実行してください</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </SNSLayout>
  );
}

