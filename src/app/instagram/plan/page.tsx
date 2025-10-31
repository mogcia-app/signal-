'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../../contexts/auth-context'
import SNSLayout from '../../../components/sns-layout'
import { usePlanForm } from './hooks/usePlanForm'
import { useSimulation } from './hooks/useSimulation'
import { useAIDiagnosis } from './hooks/useAIDiagnosis'
import { PlanForm } from './components/PlanForm'
// import { CurrentGoalPanel } from './components/CurrentGoalPanel'
import { SimulationPanel } from './components/SimulationPanel'
import { AIDiagnosisPanel } from './components/AIDiagnosisPanel'
import { SimulationRequest } from './types/plan'

export default function InstagramPlanPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'simulation' | 'ai'>('simulation')
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
    resetPlan
  } = usePlanForm()

  const { 
    simulationResult, 
    isSimulating, 
    simulationError, 
    setSimulationError,
    runSimulation 
  } = useSimulation()

  const { 
    showAiAdvice, 
    isAiLoading, 
    handleStartAiDiagnosis, 
    handleSaveAdviceAndContinue 
  } = useAIDiagnosis()

  // 分析データを取得
  const fetchAnalytics = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/analytics?userId=${user.uid}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'x-user-id': user.uid,
        },
      });
      
      if (response.ok) {
        // const result = await response.json();
        // setAnalyticsData(result.analytics || []);
      }
    } catch (error) {
      console.error('Analytics fetch error:', error);
    }
  }, [user]);

  // コンポーネントマウント時にanalyticsデータを取得
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);


  // シミュレーション実行ハンドラー
  const handleRunSimulation = async () => {
    if (!user) {
      console.error('ユーザーがログインしていません')
      return
    }

    console.log('=== シミュレーション実行デバッグ ===')
    console.log('formData:', formData)
    console.log('selectedStrategies:', selectedStrategies)
    console.log('selectedCategories:', selectedCategories)
    console.log('followerGain:', formData.followerGain, 'type:', typeof formData.followerGain)
    console.log('currentFollowers:', formData.currentFollowers, 'type:', typeof formData.currentFollowers)
    console.log('planPeriod:', formData.planPeriod, 'type:', typeof formData.planPeriod)

    // バリデーションチェック
    if (!formData.followerGain || !formData.currentFollowers || !formData.planPeriod) {
      console.error('必須項目が未入力です:', {
        followerGain: formData.followerGain,
        currentFollowers: formData.currentFollowers,
        planPeriod: formData.planPeriod
      });
      // エラーメッセージを表示
      setSimulationError('必須項目（現在のフォロワー数、フォロワー増加目標、期間）を入力してください');
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
      referenceAccounts: formData.brandConcept
    }

    console.log('requestData:', requestData)
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
    // フォームを編集可能な状態にする
    // 現在は保存された計画をフォームに反映するだけ
    alert('編集機能は開発中です。現在は計画を再設定して新しく作成してください。')
  }

  // 現在の計画削除
  const handleDeleteCurrentPlan = async () => {
    console.log('現在の計画を削除')
    
    // 削除確認
    const confirmed = window.confirm('この計画を削除しますか？この操作は取り消せません。')
    if (!confirmed) return
    
    try {
      if (!user) {
        alert('ログインが必要です')
        return
      }
      
      const idToken = await user.getIdToken()
      const response = await fetch(`/api/plans/${loadedPlanId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        alert('計画が削除されました')
        // ページをリロードして削除を反映
        window.location.reload()
      } else {
        alert('削除に失敗しました')
      }
    } catch (error) {
      console.error('削除エラー:', error)
      alert('削除中にエラーが発生しました')
    }
  }


  // 計画保存ハンドラー
  const handleSavePlan = async (): Promise<boolean> => {
    const success = await savePlan()
    if (success) {
      // 保存成功時の処理
      console.log('計画が正常に保存されました')
      // ページをリロードして保存された計画を表示
      window.location.reload()
    }
    return success
  }

  return (
    <SNSLayout 
      customTitle="Instagram 運用計画"
      customDescription="強みを活かす、実行可能なSNS計画を立てましょう"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
          <div className="mb-6 bg-orange-50 border border-orange-200 p-4 rounded-lg text-center">
            <p className="text-orange-700">📂 保存された計画を読み込んでいます...</p>
          </div>
        )}

        {/* 運用計画実行中 */}
        {(loadedPlanId || (formData.planPeriod && formData.currentFollowers && formData.followerGain)) && (
          <div className="mb-6 bg-white border border-gray-200 border-l-4 border-l-[#FF8A15] p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="text-2xl">📋</span>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-semibold text-black">
                    {loadedPlanId ? '運用計画実行中' : 'Instagram運用計画'}
                  </h3>
                  <p className="text-sm text-black mt-1">
                    {planStartDate && planEndDate 
                      ? `期間: ${planStartDate.toLocaleDateString('ja-JP')} 〜 ${planEndDate.toLocaleDateString('ja-JP')}`
                      : `期間: ${formData.planPeriod}`
                    }
                  </p>
                  {planStartDate && planEndDate && (
                    <p className="text-xs text-[#FF8A15] font-medium mt-1">
                      残り {Math.ceil((planEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} 日
                    </p>
                  )}
                  
                  {/* 計画の詳細表示 */}
                  <div className="mt-3 space-y-3">
                    {/* 目標 */}
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">目標:</span>
                      <span className="ml-2 text-black">
                        {formData.currentFollowers && formData.followerGain 
                          ? `現在${formData.currentFollowers}人 → ${parseInt(formData.currentFollowers) + parseInt(formData.followerGain)}人`
                          : '未設定'
                        }
                      </span>
                    </div>
                    
                    {/* 重視する指標 */}
                    {formData.goalCategory && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700">KPI:</span>
                        <span className="ml-2 text-black">
                          {formData.goalCategory === 'follower' ? 'フォロワー獲得' :
                           formData.goalCategory === 'engagement' ? 'エンゲージ促進' :
                           formData.goalCategory === 'like' ? 'いいねを増やす' :
                           formData.goalCategory === 'save' ? '保存率向上' :
                           formData.goalCategory === 'reach' ? 'リーチを増やす' :
                           formData.goalCategory === 'impressions' ? 'インプレッションを増やす' :
                           formData.goalCategory === 'branding' ? 'ブランド認知を広める' :
                           formData.goalCategory === 'profile' ? 'プロフィール誘導' :
                           formData.goalCategory === 'other' ? formData.otherGoal || 'その他' :
                           formData.goalCategory}
                        </span>
                      </div>
                    )}
                    
                    {/* ターゲット層 */}
                    {formData.targetAudience && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700">ターゲット層:</span>
                        <span className="ml-2 text-black">{formData.targetAudience}</span>
                      </div>
                    )}
                    
                    {/* 取り組みたいこと */}
                    {selectedStrategies.length > 0 && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700">取り組みたいこと:</span>
                        <div className="ml-2 mt-1 flex flex-wrap gap-1">
                          {selectedStrategies.map((strategy, index) => (
                            <span key={index} className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                              {strategy}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* 投稿したい内容 */}
                    {selectedCategories.length > 0 && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700">投稿したい内容:</span>
                        <div className="ml-2 mt-1 flex flex-wrap gap-1">
                          {selectedCategories.map((category, index) => (
                            <span key={index} className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                              {category}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleEditCurrentPlan}
                  className="p-2 text-gray-600 hover:bg-gray-100 hover:text-blue-600 rounded-md transition-colors"
                  title="編集"
                >
                  ✏️
                </button>
                <button
                  onClick={handleDeleteCurrentPlan}
                  className="p-2 text-gray-600 hover:bg-gray-100 hover:text-red-600 rounded-md transition-colors"
                  title="削除"
                >
                  🗑️
                </button>
                {!loadedPlanId && (
                  <button
                    onClick={handleSavePlan}
                    disabled={isSaving}
                    className="p-2 text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                    title="保存"
                  >
                    💾
                  </button>
                )}
                <button
                  onClick={resetPlan}
                  className="p-2 text-gray-600 hover:bg-gray-100 hover:text-orange-600 rounded-md transition-colors"
                  title="再設定"
                >
                  🔄
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
              <div className="flex flex-col sm:flex-row border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('simulation')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'simulation'
                      ? 'bg-[#FF8A15] text-white'
                      : 'text-black hover:bg-gray-50'
                  }`}
                >
                  📊 シミュレーション
                </button>
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-t sm:border-t-0 sm:border-l border-gray-200 ${
                    activeTab === 'ai'
                      ? 'bg-[#FF8A15] text-white'
                      : 'text-black hover:bg-gray-50'
                  }`}
                >
                  🤖 AI戦略
                </button>
              </div>

              {/* タブコンテンツ */}
              <div className="p-0">
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
  )
}
