import { useState } from 'react';
import { SimulationResult, SimulationRequest, DebugInfo } from '../types/plan';
import { authFetch } from '../../../../utils/authFetch';

export const useSimulation = () => {
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState('');
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  // シミュレーション実行
  const runSimulation = async (requestData: SimulationRequest) => {
    console.log('=== シミュレーション実行開始 ===');
    console.log('requestData:', requestData);

    // バリデーション
    if (!requestData.followerGain || !requestData.planPeriod) {
      console.error('必要な入力が不足しています:', { 
        followerGain: requestData.followerGain, 
        planPeriod: requestData.planPeriod 
      });
      setSimulationError('目標フォロワー数と期間を入力してください');
      return;
    }

    if (!requestData.currentFollowers) {
      console.error('現在のフォロワー数が未入力です');
      setSimulationError('現在のフォロワー数を入力してください');
      return;
    }

    console.log('バリデーション通過、シミュレーション実行中...');
    setIsSimulating(true);
    setSimulationError('');
    setDebugInfo(null);

    try {
      // デバッグ情報を画面に表示
      setDebugInfo({
        step: 'リクエスト送信中',
        requestData: requestData,
        timestamp: new Date().toLocaleTimeString()
      });

      // BFF APIを呼び出し
      const response = await authFetch('/api/instagram/simulation', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'シミュレーション処理中にエラーが発生しました');
      }

      const result: SimulationResult = await response.json();
      
      setSimulationResult(result);

      setDebugInfo((prev) => prev ? ({
        ...prev,
        step: '完了',
        status: response.status,
        improvementTipsCount: result.improvementTips.length,
        improvementTips: result.improvementTips
      }) : null);

      setIsSimulating(false);

    } catch (error) {
      console.error('シミュレーションエラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'シミュレーション処理中にエラーが発生しました';
      setSimulationError(errorMessage);
      
      setDebugInfo((prev) => prev ? ({
        ...prev,
        step: 'エラー',
        error: errorMessage,
        timestamp: new Date().toLocaleTimeString()
      }) : null);
      
      setIsSimulating(false);
    }
  };

  // シミュレーション結果をクリア
  const clearSimulation = () => {
    setSimulationResult(null);
    setSimulationError('');
    setDebugInfo(null);
  };

  // エラーをクリア
  const clearError = () => {
    setSimulationError('');
  };

  return {
    simulationResult,
    isSimulating,
    simulationError,
    setSimulationError,
    debugInfo,
    runSimulation,
    clearSimulation,
    clearError
  };
};
