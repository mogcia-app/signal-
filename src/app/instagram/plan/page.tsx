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
import { PlanForm } from "./components/PlanForm";
// import { CurrentGoalPanel } from './components/CurrentGoalPanel'
import { SimulationPanel } from "./components/SimulationPanel";
import { AIDiagnosisPanel } from "./components/AIDiagnosisPanel";
import { SimulationRequest } from "./types/plan";
import { CheckCircle, X } from "lucide-react";

export default function InstagramPlanPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { userProfile, loading: profileLoading } = useUserProfile();

  // すべてのHooksを早期リターンの前に定義
  const [activeTab, setActiveTab] = useState<"simulation" | "ai">("simulation");
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<boolean>(false);
  // const [analyticsData, setAnalyticsData] = useState<Array<{
  //   followerIncrease?: number;
  //   [key: string]: unknown;
  // }>>([])

  // カスタムフックの使用
  const {
    formData,
    selectedStrategies,
    selectedCategories,
    isSaving,
    // saveError,
    // saveSuccess,
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

    console.log("=== シミュレーション実行デバッグ ===");
    console.log("formData:", formData);
    console.log("selectedStrategies:", selectedStrategies);
    console.log("selectedCategories:", selectedCategories);
    console.log("followerGain:", formData.followerGain, "type:", typeof formData.followerGain);
    console.log(
      "currentFollowers:",
      formData.currentFollowers,
      "type:",
      typeof formData.currentFollowers
    );
    console.log("planPeriod:", formData.planPeriod, "type:", typeof formData.planPeriod);

    // バリデーションチェック
    if (!formData.followerGain || !formData.currentFollowers || !formData.planPeriod) {
      console.error("必須項目が未入力です:", {
        followerGain: formData.followerGain,
        currentFollowers: formData.currentFollowers,
        planPeriod: formData.planPeriod,
      });
      // エラーメッセージを表示
      setSimulationError(
        "必須項目（現在のフォロワー数、フォロワー増加目標、期間）を入力してください"
      );
      return;
    }

    const requestData: SimulationRequest = {
      followerGain: parseInt(formData.followerGain, 10),
      currentFollowers: parseInt(formData.currentFollowers, 10) || 0,
      planPeriod: formData.planPeriod,
      goalCategory: formData.goalCategory,
      strategyValues: selectedStrategies,
      postCategories: selectedCategories,
      hashtagStrategy: formData.tone,
      referenceAccounts: formData.brandConcept,
    };

    console.log("requestData:", requestData);
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
    console.log("現在の計画を編集");
    // フォームを編集可能な状態にする
    // 現在は保存された計画をフォームに反映するだけ
    setToastMessage({ message: "編集機能は開発中です。現在は計画を再設定して新しく作成してください。", type: 'error' });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // 現在の計画削除
  const handleDeleteCurrentPlan = async () => {
    console.log("現在の計画を削除");
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
        setTimeout(() => {
          setToastMessage(null);
          // ページをリロードして削除を反映
          window.location.reload();
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
    const success = await savePlan();
    if (success) {
      // 保存成功時の処理
      console.log("計画が正常に保存されました");
      // 保存後は計画IDが設定されるため、シミュレーション結果は保持される
      // ページリロードは行わない（表示を維持）
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
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* 計画期間切れアラート */}
        {isPlanExpired && planEndDate && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-2xl">⏰</span>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-semibold text-yellow-800">計画期間が終了しました</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  計画終了日: {planEndDate.toLocaleDateString("ja-JP")}
                </p>
                <p className="text-sm text-yellow-700 mt-2">
                  新しい運用計画を立てて、さらなる成長を目指しませんか？
                </p>
                <button
                  onClick={resetPlan}
                  className="mt-3 bg-[#FF8A15] hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  🆕 新しい計画を立てる
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 計画読み込み中 */}
        {isLoadingPlan && (
          <div className="mb-6 bg-orange-50 border border-orange-200 p-4 rounded-lg text-center">
            <p className="text-orange-700">📂 保存された計画を読み込んでいます...</p>
          </div>
        )}

        {/* 運用計画実行中 */}
        {!isPlanExpired &&
          (loadedPlanId ||
            (formData.planPeriod && formData.currentFollowers && formData.followerGain)) && (
          <div className="mb-8 bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-light text-gray-900 tracking-tight">
                    {loadedPlanId ? "運用計画実行中" : "Instagram運用計画"}
                  </h3>
                  {loadedPlanId && (
                    <span className="px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                      実行中
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {planStartDate && planEndDate
                      ? `${planStartDate.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })} 〜 ${planEndDate.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}`
                      : `期間: ${formData.planPeriod}`}
                  </span>
                  {planStartDate && planEndDate && (
                    <span className="px-2.5 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                      残り {Math.ceil(
                        (planEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                      )} 日
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleEditCurrentPlan}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="編集"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={handleDeleteCurrentPlan}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="削除"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                {!loadedPlanId && (
                  <button
                    onClick={handleSavePlan}
                    disabled={isSaving}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    title="保存"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={resetPlan}
                  className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                  title="再設定"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 計画の詳細表示 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
              {/* 目標 */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">目標</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formData.currentFollowers && formData.followerGain
                    ? (
                        <>
                          <span className="text-gray-600">{parseInt(formData.currentFollowers).toLocaleString()}人</span>
                          <span className="mx-2 text-gray-400">→</span>
                          <span className="text-[#FF8A15]">{(parseInt(formData.currentFollowers) + parseInt(formData.followerGain)).toLocaleString()}人</span>
                        </>
                      )
                    : "未設定"}
                </div>
              </div>

              {/* 重視する指標 */}
              {formData.goalCategory && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">KPI</div>
                  <div className="text-base font-light text-gray-900">
                    {formData.goalCategory === "follower"
                      ? "フォロワー獲得"
                      : formData.goalCategory === "engagement"
                        ? "エンゲージ促進"
                        : formData.goalCategory === "like"
                          ? "いいねを増やす"
                          : formData.goalCategory === "save"
                            ? "保存率向上"
                            : formData.goalCategory === "reach"
                              ? "リーチを増やす"
                              : formData.goalCategory === "impressions"
                                ? "インプレッションを増やす"
                                : formData.goalCategory === "branding"
                                  ? "ブランド認知を広める"
                                  : formData.goalCategory === "profile"
                                    ? "プロフィール誘導"
                                    : formData.goalCategory === "other"
                                      ? formData.otherGoal || "その他"
                                      : formData.goalCategory}
                  </div>
                </div>
              )}

              {/* ターゲット層 */}
              {formData.targetAudience && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">ターゲット層</div>
                  <div className="text-base font-light text-gray-900">{formData.targetAudience}</div>
                </div>
              )}

              {/* 取り組みたいこと */}
              {selectedStrategies.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">取り組みたいこと</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedStrategies.map((strategy, index) => (
                      <span
                        key={index}
                        className="inline-block bg-white border border-gray-200 text-gray-700 text-xs px-3 py-1.5 rounded-md font-medium"
                      >
                        {strategy}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 投稿したい内容 */}
              {selectedCategories.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">投稿したい内容</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedCategories.map((category, index) => (
                      <span
                        key={index}
                        className="inline-block bg-white border border-gray-200 text-gray-700 text-xs px-3 py-1.5 rounded-md font-medium"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <main className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:gap-8 items-start">
          {/* 左カラム：計画作成フォーム */}
          <div className="space-y-6">
            <PlanForm
              formData={formData}
              selectedStrategies={selectedStrategies}
              selectedCategories={selectedCategories}
              onInputChange={handleInputChange}
              onStrategyToggle={handleStrategyToggle}
              onCategoryToggle={handleCategoryToggle}
            />
          </div>

          {/* 右カラム：タブ式UI */}
          <div className="space-y-4 xl:sticky xl:top-6">
            {/* タブヘッダー */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="flex flex-col sm:flex-row border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("simulation")}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === "simulation"
                      ? "bg-[#FF8A15] text-white"
                      : "text-black hover:bg-gray-50"
                  }`}
                >
                  📊 シミュレーション
                </button>
                <button
                  onClick={() => setActiveTab("ai")}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-t sm:border-t-0 sm:border-l border-gray-200 ${
                    activeTab === "ai" ? "bg-[#FF8A15] text-white" : "text-black hover:bg-gray-50"
                  }`}
                >
                  🤖 AI戦略
                </button>
              </div>

              {/* タブコンテンツ */}
              <div className="p-0">
                {activeTab === "simulation" && (
                  <SimulationPanel
                    result={simulationResult}
                    formData={formData}
                    onRunSimulation={handleRunSimulation}
                    isSimulating={isSimulating}
                    simulationError={simulationError}
                    hasActivePlan={!!loadedPlanId}
                    onSave={handleSavePlan}
                    isSaving={isSaving}
                  />
                )}

                {activeTab === "ai" && (
                  <AIDiagnosisPanel
                    isLoading={isAiLoading}
                    onStartDiagnosis={() => handleStartAiDiagnosis(formData)}
                    onSaveAdvice={handleSaveAdviceAndContinue}
                    formData={formData}
                    selectedStrategies={selectedStrategies}
                    selectedCategories={selectedCategories}
                    simulationResult={simulationResult}
                    generatedStrategy={generatedStrategy}
                    setGeneratedStrategy={setGeneratedStrategy}
                  />
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
      </SNSLayout>
    </>
  );
}
