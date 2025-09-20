'use client'

import React from 'react'
import { useAuth } from '../../../contexts/auth-context'
import SNSLayout from '../../../components/sns-layout'
import { AIChatWidget } from '../../../components/ai-chat-widget'
import { usePlanForm } from './hooks/usePlanForm'
import { useSimulation } from './hooks/useSimulation'
import { useAIDiagnosis } from './hooks/useAIDiagnosis'
import { useABTest } from './hooks/useABTest'
import { PlanForm } from './components/PlanForm'
import { CurrentGoalPanel } from './components/CurrentGoalPanel'
import { SimulationPanel } from './components/SimulationPanel'
import { AIDiagnosisPanel } from './components/AIDiagnosisPanel'
import { ABTestPanel } from './components/ABTestPanel'
import { SimulationRequest } from './types/plan'

export default function InstagramPlanPage() {
  const { user } = useAuth()
  
  // カスタムフックの使用
  const { 
    formData, 
    selectedStrategies, 
    selectedCategories, 
    handleInputChange, 
    handleStrategyToggle, 
    handleCategoryToggle 
  } = usePlanForm()

  const { 
    simulationResult, 
    isSimulating, 
    simulationError, 
    debugInfo, 
    runSimulation 
  } = useSimulation()

  const { 
    showAiAdvice, 
    isAiLoading, 
    handleStartAiDiagnosis, 
    handleSaveAdviceAndContinue 
  } = useAIDiagnosis()

  const { 
    abTestResult, 
    isRunningABTest, 
    abTestError, 
    runABTest 
  } = useABTest()

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

  // A/Bテスト実行ハンドラー
  const handleRunABTest = async () => {
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
      referenceAccounts: formData.brandConcept,
      // 拡張要素（デフォルト値）
      accountAge: 6,
      currentEngagementRate: 0.03,
      avgPostsPerWeek: 3,
      contentQuality: 'medium' as const,
      niche: 'ライフスタイル',
      budget: 0,
      teamSize: 1
    }

    await runABTest(requestData)
  }


  return (
    <SNSLayout currentSNS="instagram">
      <div className="max-w-7xl mx-auto">
        {/* ページヘッダー */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Instagram 運用計画</h1>
          <p className="text-lg text-gray-600">
            強みを活かす、実行可能なSNS計画を立てましょう
          </p>
        </div>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左カラム：計画作成フォーム */}
          <PlanForm
            formData={formData}
            selectedStrategies={selectedStrategies}
            selectedCategories={selectedCategories}
            onInputChange={handleInputChange}
            onStrategyToggle={handleStrategyToggle}
            onCategoryToggle={handleCategoryToggle}
            onRunSimulation={handleRunSimulation}
            isSimulating={isSimulating}
            simulationError={simulationError}
            debugInfo={debugInfo}
          />

          {/* 右カラム：KPI・AIアドバイス */}
          <div className="space-y-4">
            <CurrentGoalPanel
              formData={formData}
              selectedStrategies={selectedStrategies}
              onEditPlan={handleEditCurrentPlan}
              onDeletePlan={handleDeleteCurrentPlan}
            />

            <SimulationPanel
              result={simulationResult}
              formData={formData}
            />

             <ABTestPanel
              result={abTestResult}
              isRunning={isRunningABTest}
              error={abTestError}
              onRunTest={handleRunABTest}
            />

            <AIDiagnosisPanel
              showAdvice={showAiAdvice}
              isLoading={isAiLoading}
              onStartDiagnosis={() => handleStartAiDiagnosis(formData)}
              onSaveAdvice={handleSaveAdviceAndContinue}
              formData={formData}
              simulationResult={simulationResult}
            />
          
          </div>
        </main>

        {/* AIチャットウィジェット */}
        <AIChatWidget 
          contextData={{
            formData: formData as unknown as Record<string, unknown>,
            selectedStrategies,
            selectedCategories,
            simulationResult: simulationResult as unknown as Record<string, unknown>,
            abTestResult: abTestResult as unknown as Record<string, unknown>
          }}
        />
      </div>
    </SNSLayout>
  )
}
