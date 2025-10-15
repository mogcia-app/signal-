'use client'

import React, { useState } from 'react'
import { useAuth } from '../../../contexts/auth-context'
import SNSLayout from '../../../components/sns-layout'
import { AIChatWidget } from '../../../components/ai-chat-widget'
import { usePlanForm } from './hooks/usePlanForm'
import { useSimulation } from './hooks/useSimulation'
import { useAIDiagnosis } from './hooks/useAIDiagnosis'
import { PlanForm } from './components/PlanForm'
import { CurrentGoalPanel } from './components/CurrentGoalPanel'
import { SimulationPanel } from './components/SimulationPanel'
import { AIDiagnosisPanel } from './components/AIDiagnosisPanel'
import { SimulationRequest } from './types/plan'

export default function InstagramPlanPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'goal' | 'simulation' | 'ai'>('goal')
  
  // カスタムフックの使用
  const { 
    formData, 
    selectedStrategies, 
    selectedCategories, 
    isSaving,
    saveError,
    saveSuccess,
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
    resetPlan
  } = usePlanForm()

  const { 
    simulationResult, 
    isSimulating, 
    simulationError, 
    runSimulation 
  } = useSimulation()

  const { 
    showAiAdvice, 
    isAiLoading, 
    handleStartAiDiagnosis, 
    handleSaveAdviceAndContinue 
  } = useAIDiagnosis()


  // シミュレーション実行ハンドラー
  const handleRunSimulation = async () => {
    if (!user) {
      console.error('ユーザーがログインしていません')
      return
    }

    const requestData: SimulationRequest = {
      followerGain: parseInt(formData.followerGain, 10),
      currentFollowers: parseInt(formData.currentFollowers, 10) || 0,
      planPeriod: formData.planPeriod,
      goalCategory: formData.goalCategory,
      strategyValues: selectedStrategies,
      postCategories: selectedCategories,
      hashtagStrategy: formData.tone,
      referenceAccounts: formData.brandConcept
    }

    await runSimulation(requestData)
  }

  // シミュレーション結果が更新されたらusePlanFormにも設定
  React.useEffect(() => {
    if (simulationResult) {
      setSimulationResultData(simulationResult)
    }
  }, [simulationResult, setSimulationResultData])

  // 現在の計画編集
  const handleEditCurrentPlan = () => {
    console.log('現在の計画を編集')
    // TODO: 編集モードの切り替え
  }

  // 現在の計画削除
  const handleDeleteCurrentPlan = () => {
    console.log('現在の計画を削除')
    // TODO: 削除確認と実行
  }


  // 計画保存ハンドラー
  const handleSavePlan = async (): Promise<boolean> => {
    const success = await savePlan()
    if (success) {
      // 保存成功時の処理（必要に応じてページ遷移など）
      console.log('計画が正常に保存されました')
    }
    return success
  }

  return (
    <SNSLayout 
      currentSNS="instagram"
      customTitle="Instagram 運用計画"
      customDescription="強みを活かす、実行可能なSNS計画を立てましょう"
    >
      <div className="max-w-7xl mx-auto">
        {/* 計画期間切れアラート */}
        {isPlanExpired && planEndDate && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-2xl">⏰</span>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-semibold text-yellow-800">
                  計画期間が終了しました
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  計画終了日: {planEndDate.toLocaleDateString('ja-JP')}
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
          <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-lg text-center">
            <p className="text-blue-700">📂 保存された計画を読み込んでいます...</p>
          </div>
        )}

        {/* 既存の計画がある場合の情報表示 */}
        {loadedPlanId && !isPlanExpired && planStartDate && planEndDate && (
          <div className="mb-6 bg-white border border-gray-200 border-l-4 border-l-[#FF8A15] p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="text-2xl">📋</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    運用計画実行中
                  </h3>
                  <p className="text-sm text-gray-700 mt-1">
                    期間: {planStartDate.toLocaleDateString('ja-JP')} 〜 {planEndDate.toLocaleDateString('ja-JP')}
                  </p>
                  <p className="text-xs text-[#FF8A15] font-medium mt-1">
                    残り {Math.ceil((planEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} 日
                  </p>
                </div>
              </div>
              <button
                onClick={resetPlan}
                className="text-sm bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium py-2 px-3 transition-colors"
              >
                🔄 計画を再設定
              </button>
            </div>
          </div>
        )}

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左カラム：計画作成フォーム */}
          <PlanForm
            formData={formData}
            selectedStrategies={selectedStrategies}
            selectedCategories={selectedCategories}
            onInputChange={handleInputChange}
            onStrategyToggle={handleStrategyToggle}
            onCategoryToggle={handleCategoryToggle}
          />

          {/* 右カラム：タブ式UI */}
          <div className="space-y-4">
            {/* タブヘッダー */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('goal')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'goal'
                      ? 'bg-[#FF8A15] text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  📋 現在の目標
                </button>
                <button
                  onClick={() => setActiveTab('simulation')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-l border-gray-200 ${
                    activeTab === 'simulation'
                      ? 'bg-[#FF8A15] text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  📊 シミュレーション
                </button>
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-l border-gray-200 ${
                    activeTab === 'ai'
                      ? 'bg-[#FF8A15] text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  🤖 AI戦略
                </button>
              </div>

              {/* タブコンテンツ */}
              <div className="p-0">
                {activeTab === 'goal' && (
                  <CurrentGoalPanel
                    formData={formData}
                    selectedStrategies={selectedStrategies}
                    onEditPlan={handleEditCurrentPlan}
                    onDeletePlan={handleDeleteCurrentPlan}
                    onSavePlan={handleSavePlan}
                    isSaving={isSaving}
                    saveError={saveError}
                    saveSuccess={saveSuccess}
                  />
                )}

                {activeTab === 'simulation' && (
                  <SimulationPanel
                    result={simulationResult}
                    formData={formData}
                    onRunSimulation={handleRunSimulation}
                    isSimulating={isSimulating}
                    simulationError={simulationError}
                    hasActivePlan={!!loadedPlanId}
                  />
                )}

                {activeTab === 'ai' && (
                  <AIDiagnosisPanel
                    showAdvice={showAiAdvice}
                    isLoading={isAiLoading}
                    onStartDiagnosis={() => handleStartAiDiagnosis(formData)}
                    onSaveAdvice={handleSaveAdviceAndContinue}
                    formData={formData}
                    simulationResult={simulationResult}
                    generatedStrategy={generatedStrategy}
                    setGeneratedStrategy={setGeneratedStrategy}
                  />
                )}
              </div>
            </div>
          </div>
        </main>

        {/* AIチャットウィジェット */}
        <AIChatWidget 
          contextData={{
            formData: formData as unknown as Record<string, unknown>,
            selectedStrategies,
            selectedCategories,
            simulationResult: simulationResult as unknown as Record<string, unknown>,
          }}
        />
      </div>
    </SNSLayout>
  )
}
