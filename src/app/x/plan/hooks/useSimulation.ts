import { useState } from 'react';
import { SimulationResult, SimulationRequest, DebugInfo } from '../types/plan';
import { authFetch } from '../../../../utils/authFetch';

export const useSimulation = () => {
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState('');
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  // シミュレーション実行
  const runSimulation = async (requestData: SimulationRequest & { userId?: string }) => {
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
      const response = await authFetch('/api/x/simulation', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      console.log('APIレスポンス受信:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('APIエラー:', response.status, errorText);
        throw new Error(`シミュレーションAPIエラー: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('シミュレーション結果:', result);

      if (result.success && result.data) {
        setSimulationResult(result.data);
        setDebugInfo({
          step: 'シミュレーション完了',
          requestData: requestData,
          timestamp: new Date().toLocaleTimeString(),
          status: response.status,
          details: {
            improvementTipsCount: result.data.improvementTips?.length || 0,
            improvementTips: result.data.improvementTips || []
          }
        });
      } else {
        throw new Error(result.error || 'シミュレーション結果の取得に失敗しました');
      }

    } catch (error) {
      console.error('シミュレーション実行エラー:', error);
      setSimulationError(error instanceof Error ? error.message : 'シミュレーションの実行に失敗しました');
      setDebugInfo({
        step: 'エラー発生',
        requestData: requestData,
        timestamp: new Date().toLocaleTimeString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsSimulating(false);
    }
  };

  return {
    simulationResult,
    isSimulating,
    simulationError,
    debugInfo,
    runSimulation
  };
};
