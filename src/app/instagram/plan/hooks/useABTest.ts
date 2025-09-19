import { useState } from 'react';
import { SimulationRequest, ABTestComparison } from '../types/plan';

export const useABTest = () => {
  const [abTestResult, setAbTestResult] = useState<ABTestComparison | null>(null);
  const [isRunningABTest, setIsRunningABTest] = useState(false);
  const [abTestError, setAbTestError] = useState('');

  // A/Bテスト実行
  const runABTest = async (requestData: SimulationRequest) => {
    console.log('=== A/Bテスト実行開始 ===');
    console.log('requestData:', requestData);

    setIsRunningABTest(true);
    setAbTestError('');

    try {
      const response = await fetch('/api/instagram/ab-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'A/Bテスト処理中にエラーが発生しました');
      }

      const result: ABTestComparison = await response.json();
      
      setAbTestResult(result);
      setIsRunningABTest(false);

    } catch (error) {
      console.error('A/Bテストエラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'A/Bテスト処理中にエラーが発生しました';
      setAbTestError(errorMessage);
      setIsRunningABTest(false);
    }
  };

  // A/Bテスト結果をクリア
  const clearABTest = () => {
    setAbTestResult(null);
    setAbTestError('');
  };

  // エラーをクリア
  const clearError = () => {
    setAbTestError('');
  };

  return {
    abTestResult,
    isRunningABTest,
    abTestError,
    runABTest,
    clearABTest,
    clearError
  };
};
