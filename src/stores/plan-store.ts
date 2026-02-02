/**
 * 運用計画ページの状態管理ストア
 * Zustandを使用して状態を一元管理
 */

import { create } from "zustand";
import { authFetch } from "@/utils/authFetch";
import { parseFirestoreDate } from "@/app/api/ai/monthly-analysis/utils/date-utils";
import type {
  PlanFormData,
  SimulationResult,
  AIPlanSuggestion,
} from "@/app/instagram/plan/types/plan";

// APIレスポンスの型定義
interface PlanResponse {
  success?: boolean;
  plans?: Array<{
    id: string;
    formData?: PlanFormData | Record<string, unknown>;
    simulationResult?: SimulationResult | Record<string, unknown> | null;
    aiSuggestion?: AIPlanSuggestion | null;
    startDate?: Date | string | { toDate?: () => Date } | null;
    endDate?: Date | string | { toDate?: () => Date } | null;
    createdAt?: Date | string | { toDate?: () => Date };
    planPeriod?: string;
  }>;
  total?: number;
}

interface PlanStore {
  // 計画データ
  formData: PlanFormData | null;
  simulationResult: SimulationResult | null;
  aiSuggestion: AIPlanSuggestion | null;
  aiSuggestedTarget: number | undefined;
  savedPlanId: string | null;
  planEndDate: Date | null;

  // UI状態
  activeTab: "form" | "simulation";
  error: string | null;
  isLoading: boolean;
  isSaving: boolean;

  // セッター
  setFormData: (data: PlanFormData | null) => void;
  setSimulationResult: (result: SimulationResult | null) => void;
  setAiSuggestion: (suggestion: AIPlanSuggestion | null) => void;
  setAiSuggestedTarget: (target: number | undefined) => void;
  setSavedPlanId: (id: string | null) => void;
  setPlanEndDate: (date: Date | null) => void;
  setActiveTab: (tab: "form" | "simulation") => void;
  setError: (error: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setIsSaving: (saving: boolean) => void;

  // データ取得・操作関数
  loadLatestPlan: (isAuthReady: boolean, profileLoading: boolean) => Promise<void>;
  submitPlan: (data: PlanFormData, aiSuggested?: number) => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
  selectAlternative: (planId: string) => Promise<void>;
  startPlan: (suggestion: AIPlanSuggestion) => Promise<void>;

  // リセット
  reset: () => void;
  clearPlan: () => void;
}

const initialState = {
  formData: null,
  simulationResult: null,
  aiSuggestion: null,
  aiSuggestedTarget: undefined,
  savedPlanId: null,
  planEndDate: null,
  activeTab: "form" as const,
  error: null,
  isLoading: false,
  isSaving: false,
};

// 計画期間（文字列）を月数に変換するヘルパー関数
const parsePeriodMonths = (
  period: string | undefined,
  formData?: PlanFormData | Record<string, unknown>
): number => {
  // 型ガード: formDataがPlanFormData型かどうかを確認
  if (formData && typeof formData === "object" && "periodMonths" in formData) {
    const periodMonths = Number(formData.periodMonths);
    if (!isNaN(periodMonths) && periodMonths > 0) {
      return periodMonths;
    }
  }

  if (!period) return 1;

  const periodStr = String(period);
  if (periodStr.includes("1年")) return 12;
  if (periodStr.includes("6ヶ月")) return 6;
  if (periodStr.includes("3ヶ月")) return 3;
  if (periodStr.includes("1ヶ月")) return 1;

  // 数値を抽出を試みる（例："2ヶ月" → 2）
  const match = periodStr.match(/(\d+)/);
  if (match) {
    const months = Number(match[1]);
    if (!isNaN(months) && months > 0) {
      return months;
    }
  }

  return 1; // デフォルトは1ヶ月
};

export const usePlanStore = create<PlanStore>((set, get) => ({
  ...initialState,

  // セッター
  setFormData: (data) => set({ formData: data }),
  setSimulationResult: (result) => set({ simulationResult: result }),
  setAiSuggestion: (suggestion) => set({ aiSuggestion: suggestion }),
  setAiSuggestedTarget: (target) => set({ aiSuggestedTarget: target }),
  setSavedPlanId: (id) => set({ savedPlanId: id }),
  setPlanEndDate: (date) => set({ planEndDate: date }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setError: (error) => set({ error }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setIsSaving: (saving) => set({ isSaving: saving }),

  // 計画をクリア
  clearPlan: () => {
    set({
      formData: null,
      simulationResult: null,
      aiSuggestion: null,
      aiSuggestedTarget: undefined,
      savedPlanId: null,
      planEndDate: null,
      error: null,
      isLoading: false,
    });
  },

  // 直近で保存された計画を読み込む
  loadLatestPlan: async (isAuthReady: boolean, profileLoading: boolean) => {
    if (!isAuthReady || profileLoading) return;

    try {
      console.log("[Plan Store] 計画読み込み開始");
      const response = await authFetch("/api/plans?snsType=instagram&status=active&limit=1");
      if (!response.ok) {
        console.log("[Plan Store] 計画取得失敗:", response.status, response.statusText);
        get().clearPlan();
        return;
      }

      const data = await response.json() as PlanResponse;
      console.log("[Plan Store] 計画取得結果:", {
        hasPlans: !!data.plans,
        plansCount: data.plans?.length || 0,
      });

      if (!data.plans || data.plans.length === 0) {
        console.log("[Plan Store] 計画がありません");
        get().clearPlan();
        return;
      }

      const plan = data.plans[0];
      console.log("[Plan Store] 計画データ:", {
        planId: plan.id,
        hasFormData: !!plan.formData,
        hasSimulationResult: !!plan.simulationResult,
        hasAiSuggestion: !!plan.aiSuggestion,
      });

      // 計画データの完全性をチェック
      if (!plan.formData || !plan.simulationResult) {
        console.warn("[Plan Store] 計画データが不完全です", {
          hasFormData: !!plan.formData,
          hasSimulationResult: !!plan.simulationResult,
          planId: plan.id,
        });
        get().clearPlan();
        return;
      }

      // 計画期間が終了していないかチェック
      const now = new Date();
      let planEnd: Date | null = null;
      let planStart: Date | null = null;

      // startDateを取得（複数の場所から確認）
      try {
        planStart =
          parseFirestoreDate(plan.startDate) ||
          (plan.formData &&
          typeof plan.formData === "object" &&
          "startDate" in plan.formData
            ? parseFirestoreDate(plan.formData.startDate)
            : null) ||
          parseFirestoreDate(plan.createdAt);
      } catch (e) {
        console.warn("開始日の取得に失敗しました", e);
      }

      // endDateを取得または計算
      try {
        planEnd = parseFirestoreDate(plan.endDate);

        if (!planEnd && planStart && !isNaN(planStart.getTime())) {
          const periodMonths = parsePeriodMonths(
            plan.planPeriod,
            plan.formData as PlanFormData | Record<string, unknown> | undefined
          );

          planEnd = new Date(planStart);
          planEnd.setMonth(planEnd.getMonth() + periodMonths);
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
            // 計画データを復元（型チェック付き）
            if (
              plan.formData &&
              typeof plan.formData === "object" &&
              "currentFollowers" in plan.formData
            ) {
              set({ formData: plan.formData as PlanFormData });
            } else {
              console.warn("[Plan Store] formDataの型が不正です", plan.formData);
              return;
            }

            if (
              plan.simulationResult &&
              typeof plan.simulationResult === "object" &&
              "difficultyLevel" in plan.simulationResult
            ) {
              set({ simulationResult: plan.simulationResult as SimulationResult });
            } else {
              console.warn("[Plan Store] simulationResultの型が不正です", plan.simulationResult);
              return;
            }

            if (plan.aiSuggestion && typeof plan.aiSuggestion === "object") {
              set({ aiSuggestion: plan.aiSuggestion as AIPlanSuggestion });
            }
            set({ savedPlanId: plan.id, planEndDate: planEnd });
          }
        } catch (e) {
          console.warn("期間チェックに失敗しました", e);
          get().clearPlan();
        }
      } else {
        // 終了日が計算できない場合でも、計画データがあれば表示を試みる
        if (planStart && !isNaN(planStart.getTime())) {
          const periodMonths = parsePeriodMonths(
            plan.planPeriod,
            plan.formData as PlanFormData | Record<string, unknown> | undefined
          );

          const calculatedEndDate = new Date(planStart);
          calculatedEndDate.setMonth(calculatedEndDate.getMonth() + periodMonths);

          if (!isNaN(calculatedEndDate.getTime())) {
            console.log("[Plan Store] 終了日を計算しました", {
              planStart: planStart.toISOString(),
              periodMonths,
              calculatedEndDate: calculatedEndDate.toISOString(),
            });

            if (
              plan.formData &&
              typeof plan.formData === "object" &&
              "currentFollowers" in plan.formData
            ) {
              set({ formData: plan.formData as PlanFormData });
            } else {
              console.warn("[Plan Store] formDataの型が不正です", plan.formData);
              return;
            }

            if (
              plan.simulationResult &&
              typeof plan.simulationResult === "object" &&
              "difficultyLevel" in plan.simulationResult
            ) {
              set({ simulationResult: plan.simulationResult as SimulationResult });
            } else {
              console.warn("[Plan Store] simulationResultの型が不正です", plan.simulationResult);
              return;
            }

            if (plan.aiSuggestion && typeof plan.aiSuggestion === "object") {
              set({ aiSuggestion: plan.aiSuggestion as AIPlanSuggestion });
            }
            set({ savedPlanId: plan.id, planEndDate: calculatedEndDate });
            return;
          }
        }

        // どうしても計算できない場合は状態をクリア
        console.error("[Plan Store] 計画を表示できません。必要なデータが不足しています。");
        get().clearPlan();
      }
    } catch (error) {
      console.error("計画読み込みエラー:", error);
      // エラーは無視（計画がない場合もあるため）
    }
  },

  // 計画を送信（シミュレーション実行）
  submitPlan: async (data: PlanFormData, aiSuggested?: number) => {
    set({ isLoading: true, error: null });

    try {
      // バリデーション
      if (data.currentFollowers <= 0 || data.targetFollowers <= 0) {
        set({
          error: "現在のフォロワー数と目標フォロワー数は1以上である必要があります",
          isLoading: false,
        });
        return;
      }

      if (data.targetFollowers <= data.currentFollowers) {
        set({
          error: "目標フォロワー数は現在のフォロワー数より大きい必要があります",
          isLoading: false,
        });
        return;
      }

      // シミュレーション計算（バックエンドAPI経由）
      const simulationResponse = await authFetch("/api/instagram/plan-simulation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formData: data,
        }),
      });

      if (!simulationResponse.ok) {
        const errorData = await simulationResponse.json();
        set({
          error: errorData.error || "シミュレーションの計算に失敗しました",
          isLoading: false,
        });
        return;
      }

      const simulationData = await simulationResponse.json();
      const result = simulationData.result;

      // フォームデータとシミュレーション結果を設定
      set({
        formData: data,
        simulationResult: result,
        aiSuggestedTarget: aiSuggested,
      });

      // AI提案を取得
      try {
        const response = await authFetch("/api/instagram/plan-suggestion", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            formData: data,
            simulationResult: result,
          }),
        });

        if (response.ok) {
          const responseData = await response.json();
          set({ aiSuggestion: responseData.suggestion });
        }
      } catch (error) {
        console.error("AI提案取得エラー:", error);
      }

      // 3秒後にシミュレーションタブに切り替え
      setTimeout(() => {
        set({ activeTab: "simulation" });
      }, 3000);
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "シミュレーションの計算に失敗しました",
        isLoading: false,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  // 計画を削除
  deletePlan: async (planId: string) => {
    if (!planId) return;

    try {
      const response = await authFetch(`/api/plans/${planId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "計画の削除に失敗しました");
      }

      // 状態を完全にリセット（削除成功時）
      get().clearPlan();
      set({ isLoading: false });
    } catch (err) {
      console.error("計画削除エラー:", err);
      set({
        error: err instanceof Error ? err.message : "計画の削除に失敗しました",
      });
      throw err;
    }
  },

  // 代替案を選択
  selectAlternative: async (planId: string) => {
    const { formData, simulationResult } = get();
    if (!formData || !simulationResult?.alternativePlans) return;

    const selectedPlan = simulationResult.alternativePlans.find((p) => p.id === planId);
    if (!selectedPlan) return;

    // 選択した代替案でフォームデータを更新
    const updatedFormData: PlanFormData = {
      ...formData,
      targetFollowers: selectedPlan.targetFollowers,
      weeklyFeedPosts: selectedPlan.weeklyFeedPosts,
      weeklyReelPosts: selectedPlan.weeklyReelPosts,
      weeklyStoryPosts: selectedPlan.weeklyStoryPosts,
    };

    // 再計算（バックエンドAPI経由）
    try {
      const simulationResponse = await authFetch("/api/instagram/plan-simulation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formData: updatedFormData,
        }),
      });

      if (simulationResponse.ok) {
        const simulationData = await simulationResponse.json();
        const result = simulationData.result;
        set({
          simulationResult: result,
          formData: updatedFormData,
        });
      } else {
        const errorData = await simulationResponse.json();
        set({
          error: errorData.error || "シミュレーションの再計算に失敗しました",
        });
      }
    } catch (error) {
      console.error("シミュレーション再計算エラー:", error);
      set({ error: "シミュレーションの再計算に失敗しました" });
    }
  },

  // 計画を開始・保存
  startPlan: async (suggestion: AIPlanSuggestion) => {
    const { formData, simulationResult, savedPlanId } = get();
    if (!formData || !simulationResult) {
      set({ error: "フォームデータまたはシミュレーション結果がありません" });
      return;
    }

    set({ isSaving: true, error: null });

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
        aiSuggestion: suggestion,
        startDate: startDate,
        endDate: endDate,
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
        throw new Error(errorData.error || "計画の保存に失敗しました");
      }

      const result = await response.json();

      // 保存された計画IDと終了日を保持
      const planId = savedPlanId || result.id;
      const calculatedEndDate = formData.startDate
        ? (() => {
            const start = new Date(formData.startDate);
            const end = new Date(start);
            end.setMonth(end.getMonth() + formData.periodMonths);
            return end;
          })()
        : null;

      set({
        savedPlanId: planId,
        planEndDate: calculatedEndDate,
        formData: formData,
        activeTab: "form",
      });
    } catch (err) {
      console.error("計画保存エラー:", err);
      set({
        error: err instanceof Error ? err.message : "計画の保存に失敗しました",
      });
    } finally {
      set({ isSaving: false });
    }
  },

  // リセット
  reset: () => set(initialState),
}));

