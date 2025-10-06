'use client';

import React from 'react';
import { useAuth } from '../../../contexts/auth-context';
import SNSLayout from '../../../components/sns-layout';
import { AIChatWidget } from '../../../components/ai-chat-widget';
import { usePlanForm } from './hooks/usePlanForm';
import { useSimulation } from './hooks/useSimulation';
import { useAIDiagnosis } from './hooks/useAIDiagnosis';
import { PlanForm } from './components/PlanForm';
import { CurrentGoalPanel } from './components/CurrentGoalPanel';
import { SimulationPanel } from './components/SimulationPanel';
import { AIDiagnosisPanel } from './components/AIDiagnosisPanel';
import { SimulationRequest } from './types/plan';

export default function XPlanPage() {
  const { user } = useAuth();
  
  // カスタムフックの使用
  const { 
    formData, 
    selectedStrategies, 
    selectedCategories, 
    isSaving,
    saveError,
    saveSuccess,
    handleInputChange, 
    handleStrategyToggle, 
    handleCategoryToggle,
    savePlan,
    setSimulationResultData
  } = usePlanForm();

  const { 
    simulationResult, 
    isSimulating, 
    simulationError, 
    debugInfo, 
    runSimulation 
  } = useSimulation();

  const { 
    showAiAdvice, 
    isAiLoading, 
    handleStartAiDiagnosis, 
    handleSaveAdviceAndContinue 
  } = useAIDiagnosis();

  // シミュレーション実行ハンドラー
  const handleRunSimulation = async () => {
    if (!user) {
      console.error('ユーザーがログインしていません');
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
    };

    await runSimulation(requestData);
  };

  // シミュレーション結果が更新されたらusePlanFormにも設定
  React.useEffect(() => {
    if (simulationResult) {
      setSimulationResultData(simulationResult);
    }
  }, [simulationResult, setSimulationResultData]);

  // 現在の計画編集
  const handleEditCurrentPlan = () => {
    console.log('現在の計画を編集');
    // TODO: 編集モードの切り替え
  };

  // 現在の計画削除
  const handleDeleteCurrentPlan = () => {
    console.log('現在の計画を削除');
    // TODO: 削除確認と実行
  };

  // 計画保存ハンドラー
  const handleSavePlan = async (): Promise<boolean> => {
    const success = await savePlan();
    if (success) {
      // 保存成功時の処理（必要に応じてページ遷移など）
      console.log('計画が正常に保存されました');
    }
    return success;
  };

  return (
    <SNSLayout 
      currentSNS="x"
      customTitle="X運用計画"
      customDescription="強みを活かす、実行可能なSNS計画を立てましょう"
    >
      <div className="max-w-7xl mx-auto">
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左カラム：計画作成フォーム */}
          <PlanForm
            formData={formData}
            selectedStrategies={selectedStrategies}
            selectedCategories={selectedCategories}
            onInputChange={handleInputChange}
            onStrategyToggle={handleStrategyToggle}
            onCategoryToggle={handleCategoryToggle}
            debugInfo={debugInfo}
          />

          {/* 右カラム：KPI・AIアドバイス */}
          <div className="space-y-4">
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

            <SimulationPanel
              result={simulationResult}
              formData={formData}
              onRunSimulation={handleRunSimulation}
              isSimulating={isSimulating}
              simulationError={simulationError}
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
          }}
        />
      </div>
    </SNSLayout>
  );
}
