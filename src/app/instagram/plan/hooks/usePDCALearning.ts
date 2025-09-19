import { useState, useEffect } from 'react';
import { PDCARecord, TrendAnalysis, LearningModel } from '../types/plan';
import { useAuth } from '../../../../contexts/auth-context';

export const usePDCALearning = () => {
  const { user } = useAuth();
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysis | null>(null);
  const [learningModel, setLearningModel] = useState<LearningModel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 傾向分析を取得
  const fetchTrendAnalysis = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/instagram/pdca-learning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get_trends',
          userId: user.uid
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '傾向分析の取得に失敗しました');
      }

      const trends: TrendAnalysis = await response.json();
      setTrendAnalysis(trends);
    } catch (error) {
      console.error('傾向分析エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '傾向分析の取得に失敗しました';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 学習モデルを取得
  const fetchLearningModel = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/instagram/pdca-learning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get_learning_model',
          userId: user.uid
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '学習モデルの取得に失敗しました');
      }

      const model: LearningModel = await response.json();
      setLearningModel(model);
    } catch (error) {
      console.error('学習モデルエラー:', error);
      const errorMessage = error instanceof Error ? error.message : '学習モデルの取得に失敗しました';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // PDCAレコードを保存
  const savePDCARecord = async (record: Omit<PDCARecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return null;
    
    setIsLoading(true);
    setError('');
    
    try {
      const fullRecord: PDCARecord = {
        ...record,
        id: '', // API側で生成される
        userId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const response = await fetch('/api/instagram/pdca-learning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'save_record',
          data: fullRecord
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'PDCAレコードの保存に失敗しました');
      }

      const savedRecord: PDCARecord = await response.json();
      
      // 保存後に傾向分析と学習モデルを更新
      await Promise.all([
        fetchTrendAnalysis(),
        fetchLearningModel()
      ]);
      
      return savedRecord;
    } catch (error) {
      console.error('PDCAレコード保存エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'PDCAレコードの保存に失敗しました';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // 予測を改善
  const improvePrediction = async (predictionRequest: Record<string, unknown>) => {
    if (!user) return null;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/instagram/pdca-learning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_prediction',
          userId: user.uid,
          predictionRequest
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '予測の改善に失敗しました');
      }

      const improvedPrediction = await response.json();
      return improvedPrediction;
    } catch (error) {
      console.error('予測改善エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '予測の改善に失敗しました';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // 初期化時にデータを取得
  useEffect(() => {
    if (user) {
      fetchTrendAnalysis();
      fetchLearningModel();
    }
  }, [user, fetchTrendAnalysis, fetchLearningModel]);

  // エラーをクリア
  const clearError = () => {
    setError('');
  };

  return {
    trendAnalysis,
    learningModel,
    isLoading,
    error,
    fetchTrendAnalysis,
    fetchLearningModel,
    savePDCARecord,
    improvePrediction,
    clearError
  };
};
