import { useState } from 'react';
import { MLPredictionRequest, MLPredictionResult } from '../types/plan';

export const useMLPrediction = () => {
  const [mlPredictionResult, setMlPredictionResult] = useState<MLPredictionResult | null>(null);
  const [isRunningMLPrediction, setIsRunningMLPrediction] = useState(false);
  const [mlPredictionError, setMlPredictionError] = useState('');

  // ML予測実行
  const runMLPrediction = async (requestData: MLPredictionRequest) => {
    console.log('=== ML予測実行開始 ===');
    console.log('requestData:', requestData);

    setIsRunningMLPrediction(true);
    setMlPredictionError('');

    try {
      const response = await fetch('/api/instagram/ml-prediction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ML予測処理中にエラーが発生しました');
      }

      const result: MLPredictionResult = await response.json();
      
      setMlPredictionResult(result);
      setIsRunningMLPrediction(false);

    } catch (error) {
      console.error('ML予測エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'ML予測処理中にエラーが発生しました';
      setMlPredictionError(errorMessage);
      setIsRunningMLPrediction(false);
    }
  };

  // ML予測結果をクリア
  const clearMLPrediction = () => {
    setMlPredictionResult(null);
    setMlPredictionError('');
  };

  // エラーをクリア
  const clearError = () => {
    setMlPredictionError('');
  };

  return {
    mlPredictionResult,
    isRunningMLPrediction,
    mlPredictionError,
    runMLPrediction,
    clearMLPrediction,
    clearError
  };
};
