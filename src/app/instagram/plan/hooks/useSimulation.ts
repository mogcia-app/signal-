import { useState } from 'react';
import { SimulationResult, SimulationRequest, DebugInfo } from '../types/plan';

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

      // 一時的にモックデータを使用
      setTimeout(() => {
        const mockResult: SimulationResult = {
          targetDate: '2024年2月15日',
          monthlyTarget: Math.ceil(requestData.followerGain / 1),
          weeklyTarget: Math.ceil(requestData.followerGain / 4),
          feasibilityLevel: 'realistic',
          feasibilityBadge: '現実的',
          postsPerWeek: {
            reel: 2,
            feed: 3,
            story: 5
          },
          monthlyPostCount: 20,
          workloadMessage: '適度な負荷で継続可能',
          mainAdvice: 'リール中心の運用でフォロワー獲得を効率化しましょう。週2回のリール投稿と週3回のフィード投稿で目標達成が可能です。',
          improvementTips: [
            'ハッシュタグを15-20個使用してリーチを拡大',
            'ストーリーで日常的な交流を促進',
            '投稿時間を午後2-4時、夜8-10時に集中'
          ]
        };

        setSimulationResult(mockResult);

        setDebugInfo((prev) => prev ? ({
          ...prev,
          step: '完了',
          improvementTipsCount: mockResult.improvementTips.length,
          improvementTips: mockResult.improvementTips
        }) : null);

        setIsSimulating(false);
      }, 2000);

    } catch (error) {
      console.error('シミュレーションエラー:', error);
      setSimulationError('シミュレーション処理中にエラーが発生しました');
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
    debugInfo,
    runSimulation,
    clearSimulation,
    clearError
  };
};
