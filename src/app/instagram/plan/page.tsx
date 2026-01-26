"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../contexts/auth-context";
import { useUserProfile } from "@/hooks/useUserProfile";
import { canAccessFeature } from "@/lib/plan-access";
import { authFetch } from "../../../utils/authFetch";
import SNSLayout from "../../../components/sns-layout";
import { usePlanForm } from "./hooks/usePlanForm";
import { useSimulation } from "./hooks/useSimulation";
import { useAIDiagnosis } from "./hooks/useAIDiagnosis";
import { useAIStrategy } from "./hooks/useAIStrategy";
import { PlanFormThreeColumn } from "./components/PlanFormThreeColumn";
import { SimulationPanel } from "./components/SimulationPanel";
import { AIDiagnosisPanel } from "./components/AIDiagnosisPanel";
import { SimulationRequest, SimulationResult } from "./types/plan";
import { CheckCircle, X } from "lucide-react";
import { TIMEOUT_MS, DELAY_MS } from "./constants/plan";
import { logger } from "./utils/logger";
import { validateFollowerInputs, prepareSimulationRequest } from "./utils/planGeneration";

export default function InstagramPlanPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { userProfile, loading: profileLoading } = useUserProfile();

  // すべてのHooksを早期リターンの前に定義
  const [activeTab, setActiveTab] = useState<"simulation" | "ai">("simulation");
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<boolean>(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planGenerated, setPlanGenerated] = useState(false);

  // カスタムフックの使用
  const {
    formData,
    selectedStrategies,
    selectedCategories,
    isSaving,
    isLoadingPlan,
    loadedPlanId,
    planStartDate,
    planEndDate,
    isPlanExpired,
    generatedStrategy,
    setGeneratedStrategy,
    handleInputChange,
    handleStrategyToggle,
    handleCategoryToggle,
    setSelectedStrategiesDirect,
    setSelectedCategoriesDirect,
    savePlan,
    setSimulationResultData,
    updateSimulationResultInPlan,
    resetPlan,
    simulationResult: savedSimulationResult, // 保存されたシミュレーション結果
  } = usePlanForm();

  const {
    simulationResult: newSimulationResult,
    isSimulating,
    simulationError,
    setSimulationError,
    runSimulation,
  } = useSimulation();

  // 保存されたシミュレーション結果を優先、なければ新しく実行した結果を使用
  const simulationResult = savedSimulationResult || newSimulationResult;

  const { isAiLoading, handleStartAiDiagnosis, handleSaveAdviceAndContinue } = useAIDiagnosis();
  const { generateStrategy: generateAIStrategy, strategyState: aiStrategyState } = useAIStrategy();
  
  // 計画生成の進捗状態
  const [generationProgress, setGenerationProgress] = useState<{
    simulation: 'pending' | 'running' | 'completed' | 'error';
    aiStrategy: 'pending' | 'running' | 'completed' | 'error';
    overallProgress: number; // 0-100
  }>({
    simulation: 'pending',
    aiStrategy: 'pending',
    overallProgress: 0,
  });
  
  // AI戦略が生成されたら、setGeneratedStrategyに反映
  React.useEffect(() => {
    if (aiStrategyState.strategy) {
      setGeneratedStrategy(aiStrategyState.strategy);
    }
  }, [aiStrategyState.strategy, setGeneratedStrategy]);

  // 計画期間が終了した場合、自動的にリセット（リアルタイムチェック）
  useEffect(() => {
    if (!planEndDate || !loadedPlanId) return;

    const checkAndReset = async () => {
      const now = new Date();
      const endDate = new Date(planEndDate);
      
      if (endDate < now) {
        logger.log("計画期間が終了しました。自動リセットを実行します。", {
          endDate: endDate.toISOString(),
          now: now.toISOString(),
        });
        await resetPlan();
        setSimulationError("");
      }
    };

    // 定期的に期間切れをチェック（1分ごと）
    const checkInterval = setInterval(checkAndReset, TIMEOUT_MS.PLAN_EXPIRY_CHECK);

    // 初回チェック
    checkAndReset();

    return () => clearInterval(checkInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planEndDate, loadedPlanId]);

  const isAuthReady = useMemo(() => Boolean(user), [user]);

  // 分析データを取得
  const fetchAnalytics = useCallback(async () => {
    if (!isAuthReady) {return;}

    try {
      await authFetch("/api/analytics");
      // const result = await response.json();
      // setAnalyticsData(result.analytics || []);
    } catch (error) {
      console.error("Analytics fetch error:", error);
    }
  }, [isAuthReady]);

  // コンポーネントマウント時にanalyticsデータを取得
  useEffect(() => {
    if (isAuthReady) {
      fetchAnalytics();
    }
  }, [fetchAnalytics, isAuthReady]);

  // URLパラメータから初期値を設定（初回のみ）
  useEffect(() => {
    if (typeof window === "undefined" || !isAuthReady) return;

    const params = new URLSearchParams(window.location.search);
    const currentFollowers = params.get("currentFollowers");
    const followerGain = params.get("followerGain");
    const planPeriod = params.get("planPeriod");
    const monthlyPostCount = params.get("monthlyPostCount");

    if (currentFollowers || followerGain || planPeriod) {
      // フォームデータを直接更新（usePlanFormのsetFormDataを使う）
      if (currentFollowers) {
        handleInputChange({
          target: { name: "currentFollowers", value: currentFollowers },
        } as React.ChangeEvent<HTMLInputElement>);
      }
      if (followerGain) {
        handleInputChange({
          target: { name: "followerGain", value: followerGain },
        } as React.ChangeEvent<HTMLInputElement>);
      }
      if (planPeriod) {
        handleInputChange({
          target: { name: "planPeriod", value: planPeriod },
        } as React.ChangeEvent<HTMLSelectElement>);
      }

      // URLパラメータをクリア（再読み込み時に再度設定されないように）
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthReady]); // 初回のみ実行

  // シミュレーション実行ハンドラー
  const handleRunSimulation = async () => {
    if (!user) {
      console.error("ユーザーがログインしていません");
      return;
    }

    logger.log("=== シミュレーション実行デバッグ ===");
    logger.log("formData:", formData);
    logger.log("selectedStrategies:", selectedStrategies);
    logger.log("selectedCategories:", selectedCategories);
    logger.log("followerGain:", formData.followerGain, "type:", typeof formData.followerGain);
    logger.log(
      "currentFollowers:",
      formData.currentFollowers,
      "type:",
      typeof formData.currentFollowers
    );
    logger.log("planPeriod:", formData.planPeriod, "type:", typeof formData.planPeriod);

    // バリデーションチェック
    const currentFollowersNum = parseInt(formData.currentFollowers || "0", 10);
    const targetFollowersNum = formData.targetFollowers 
      ? parseInt(formData.targetFollowers, 10)
      : formData.followerGain
      ? currentFollowersNum + parseInt(formData.followerGain, 10)
      : currentFollowersNum;
    const followerGainNum = targetFollowersNum - currentFollowersNum;
    
    if (
      isNaN(followerGainNum) || 
      followerGainNum <= 0 ||
      !formData.currentFollowers || 
      isNaN(currentFollowersNum) || 
      currentFollowersNum <= 0 ||
      !formData.planPeriod
    ) {
      console.error("必須項目が未入力です:", {
        followerGain: formData.followerGain,
        targetFollowers: formData.targetFollowers,
        followerGainNum,
        currentFollowers: formData.currentFollowers,
        currentFollowersNum,
        planPeriod: formData.planPeriod,
      });
      // エラーメッセージを表示
      setSimulationError(
        "必須項目（現在のフォロワー数、目標フォロワー数、期間）を入力してください"
      );
      return;
    }

    const requestData: SimulationRequest = {
      followerGain: followerGainNum,
      currentFollowers: currentFollowersNum,
      planPeriod: formData.planPeriod,
      goalCategory: formData.goalCategory || formData.mainGoal || "",
      strategyValues: selectedStrategies,
      postCategories: selectedCategories,
      hashtagStrategy: formData.tone || "",
      referenceAccounts: formData.brandConcept || "",
    };

    logger.log("requestData:", requestData);
    await runSimulation(requestData);
  };

  // 新しくシミュレーションを実行した結果をusePlanFormにも設定し、planに保存
  React.useEffect(() => {
    if (newSimulationResult) {
      setSimulationResultData(newSimulationResult);
      // 既存のplanがある場合は、simulationResultを更新
      if (loadedPlanId) {
        updateSimulationResultInPlan(newSimulationResult);
      }
    }
  }, [newSimulationResult, setSimulationResultData, updateSimulationResultInPlan, loadedPlanId]);

  // 現在の計画編集
  const handleEditCurrentPlan = () => {
    logger.log("現在の計画を編集");
    // フォームを編集可能な状態にする
    // 現在は保存された計画をフォームに反映するだけ
    setToastMessage({ message: "編集機能は開発中です。現在は計画を再設定して新しく作成してください。", type: 'error' });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // 現在の計画削除
  const handleDeleteCurrentPlan = async () => {
    logger.log("現在の計画を削除");
    setDeleteConfirm(true);
  };

  // 削除実行
  const confirmDelete = async () => {
    try {
      if (!user) {
        // ログイン画面に自動リダイレクト
        router.push("/login");
        return;
      }

      const response = await authFetch(`/api/plans/${loadedPlanId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setToastMessage({ message: "計画が削除されました", type: 'success' });
        // 計画をリセット（シミュレーション結果とAI戦略もクリア）
        resetPlan();
        setSimulationError("");
        setTimeout(() => {
          setToastMessage(null);
        }, 2000);
      } else {
        setToastMessage({ message: "削除に失敗しました", type: 'error' });
        setTimeout(() => setToastMessage(null), 5000);
      }
    } catch (error) {
      console.error("削除エラー:", error);
      setToastMessage({ message: "削除中にエラーが発生しました", type: 'error' });
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setDeleteConfirm(false);
    }
  };

  // 計画保存ハンドラー
  const handleSavePlan = async (): Promise<boolean> => {
    logger.log("[PlanPage] 計画保存を開始します");
    const success = await savePlan();
    if (success) {
      // 保存成功時の処理
      logger.log("[PlanPage] 計画が正常に保存されました。月次レポートページで計画が反映されるまで数秒かかる場合があります。");
      // 保存後は計画IDが設定されるため、シミュレーション結果は保持される
      // ページリロードは行わない（表示を維持）
      
      // 保存後に少し待ってから計画の存在を確認
      setTimeout(async () => {
        try {
          const checkResponse = await authFetch(`/api/plans?snsType=instagram&status=active&limit=1`);
          if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            logger.log("[PlanPage] 保存後の計画確認:", {
              plansFound: checkData.plans?.length || 0,
              planIds: checkData.plans?.map((p: { id: string }) => p.id) || [],
            });
          } else {
            logger.error("[PlanPage] 計画確認API エラー:", checkResponse.status);
          }
        } catch (error) {
          logger.error("[PlanPage] 計画確認エラー:", error);
        }
      }, 2000);
    } else {
      logger.error("[PlanPage] 計画の保存に失敗しました");
    }
    return success;
  };

  return (
    <>
      {/* トースト通知 */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg min-w-[300px] max-w-md ${
            toastMessage.type === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            {toastMessage.type === 'success' ? (
              <CheckCircle size={20} className="flex-shrink-0" />
            ) : (
              <X size={20} className="flex-shrink-0" />
            )}
            <p className="font-medium flex-1">{toastMessage.message}</p>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-2 text-white hover:text-gray-200 transition-colors flex-shrink-0"
              aria-label="閉じる"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              計画を削除
            </h3>
            <p className="text-gray-700 mb-6">
              この計画を削除しますか？この操作は取り消せません。
            </p>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      <SNSLayout
        customTitle="Instagram 運用計画"
        customDescription="強みを活かす、実行可能なSNS計画を立てましょう"
      >
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 bg-white min-h-screen">
        {/* 計画期間切れアラート */}
        {isPlanExpired && planEndDate && (
          <div className="mb-8 bg-white border border-gray-200 p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900 mb-2">計画期間が終了しました</h3>
              <p className="text-sm text-gray-600">
                計画終了日: {planEndDate.toLocaleDateString("ja-JP")}
              </p>
            </div>
            <p className="text-sm text-gray-700">
              新しい運用計画を立てて、さらなる成長を目指しませんか？
            </p>
          </div>
        )}



        <main>
          <PlanFormThreeColumn
                  formData={formData}
                  onInputChange={handleInputChange}
                  planGenerated={planGenerated}
                  simulationResult={simulationResult}
                  generatedStrategy={generatedStrategy || undefined}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  onRunSimulation={handleRunSimulation}
                  isSimulating={isSimulating}
                  simulationError={simulationError}
                  onSave={handleSavePlan}
                  isSaving={isSaving}
                  planEndDate={planEndDate}
                  selectedStrategies={selectedStrategies}
                  selectedCategories={selectedCategories}
                  onStartAiDiagnosis={handleStartAiDiagnosis}
                  onSaveAdvice={handleSaveAdviceAndContinue}
                  setGeneratedStrategy={setGeneratedStrategy}
                  isAiLoading={isAiLoading}
                  isGeneratingPlan={isGeneratingPlan}
                  onComplete={async () => {
                    setIsGeneratingPlan(true);
                    setGenerationProgress({
                      simulation: 'pending',
                      aiStrategy: 'pending',
                      overallProgress: 0,
                    });
                    
                    try {
                      // 1. データ準備とバリデーション
                      const postContentTypes = formData.postContentTypes || [];
                      setSelectedStrategiesDirect(postContentTypes);
                      setSelectedCategoriesDirect(postContentTypes);
                      
                      const { requestData, current, target, mappedFormData } = prepareSimulationRequest(
                        formData,
                        postContentTypes
                      );
                      
                      const validation = validateFollowerInputs(current, target);
                      if (!validation.isValid) {
                        logger.warn("シミュレーション実行条件を満たしていません:", { current, target });
                        setToastMessage({ 
                          message: validation.error || "現在のフォロワー数と目標フォロワー数を正しく入力してください", 
                          type: 'error' 
                        });
                        setIsGeneratingPlan(false);
                        setGenerationProgress({
                          simulation: 'error',
                          aiStrategy: 'error',
                          overallProgress: 0,
                        });
                        return;
                      }
                      
                      logger.log("ウィザード完了: シミュレーションとAI戦略を並列実行", requestData);
                      
                      // 2. シミュレーション実行
                      setGenerationProgress({
                        simulation: 'running',
                        aiStrategy: 'pending',
                        overallProgress: 10,
                      });
                      
                      let finalSimulationResult: SimulationResult | null = null;
                      try {
                        setGenerationProgress(prev => ({ 
                          ...prev, 
                          simulation: 'running',
                          overallProgress: 20 
                        }));
                        
                        finalSimulationResult = await runSimulation(requestData);
                        
                        setGenerationProgress(prev => ({ ...prev, overallProgress: 40 }));
                        
                        if (!finalSimulationResult) {
                          if (simulationError) {
                            throw new Error(`シミュレーションエラー: ${simulationError}`);
                          }
                          throw new Error("シミュレーション結果が取得できませんでした");
                        }
                        
                        logger.log("シミュレーション結果を取得:", finalSimulationResult);
                        
                        setSimulationResultData(finalSimulationResult);
                        if (loadedPlanId) {
                          updateSimulationResultInPlan(finalSimulationResult);
                        }
                        
                        setGenerationProgress(prev => ({ 
                          ...prev, 
                          simulation: 'completed',
                          overallProgress: 60,
                        }));
                      } catch (error) {
                        logger.error("シミュレーションエラー:", error);
                        setGenerationProgress(prev => ({ ...prev, simulation: 'error' }));
                        throw error;
                      }
                      
                      // フォールバック
                      if (!finalSimulationResult) {
                        finalSimulationResult = savedSimulationResult;
                      }
                      
                      // 3. AI戦略生成
                      setGenerationProgress(prev => ({ 
                        ...prev, 
                        aiStrategy: 'running',
                        overallProgress: 70,
                      }));
                      
                      try {
                        setGenerationProgress(prev => ({ ...prev, overallProgress: 75 }));
                        
                        const generatedStrategyResult: string | null = await generateAIStrategy(
                          mappedFormData,
                          postContentTypes,
                          postContentTypes,
                          finalSimulationResult
                        );
                        
                        setGenerationProgress(prev => ({ ...prev, overallProgress: 85 }));
                        
                        if (!generatedStrategyResult) {
                          if (aiStrategyState.error) {
                            throw new Error(`AI戦略生成エラー: ${aiStrategyState.error}`);
                          }
                          logger.warn("AI戦略が生成されませんでした");
                        } else {
                          setGeneratedStrategy(generatedStrategyResult);
                        }
                        
                        setGenerationProgress(prev => ({ 
                          ...prev, 
                          aiStrategy: 'completed',
                          overallProgress: 95,
                        }));
                      } catch (error) {
                        logger.error("AI戦略生成エラー:", error);
                        setGenerationProgress(prev => ({ ...prev, aiStrategy: 'error' }));
                        // AI戦略生成エラーでも続行
                      }
                      
                      // 4. 計画保存と完了
                      setGenerationProgress(prev => ({ ...prev, overallProgress: 98 }));
                      const saveSuccess = await handleSavePlan();
                      
                      if (saveSuccess) {
                        setGenerationProgress(prev => ({ ...prev, overallProgress: 100 }));
                        await new Promise(resolve => setTimeout(resolve, DELAY_MS.UI_TRANSITION));
                        setIsGeneratingPlan(false);
                        setPlanGenerated(true);
                        setActiveTab("simulation");
                      } else {
                        throw new Error("計画の保存に失敗しました");
                      }
                      
                    } catch (error) {
                      logger.error("計画生成エラー:", error);
                      setIsGeneratingPlan(false);
                      setGenerationProgress({
                        simulation: 'error',
                        aiStrategy: 'error',
                        overallProgress: 0,
                      });
                      setToastMessage({ 
                        message: error instanceof Error ? error.message : "計画の生成に失敗しました", 
                        type: 'error' 
                      });
                    }
                  }}
                  generationProgress={generationProgress}
                />
        </main>
      </div>
      </SNSLayout>
    </>
  );
}
