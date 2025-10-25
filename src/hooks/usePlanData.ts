import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/auth-context';

// 統一された計画データの型定義
interface PlanData {
  id: string;
  userId: string;
  snsType: string;
  status: string;
  title: string;
  targetFollowers: number;
  currentFollowers: number;
  planPeriod: string;
  targetAudience: string;
  category: string;
  strategies: string[];
  postCategories: string[];
  createdAt: string | { toDate?: () => Date };
  updatedAt: string | { toDate?: () => Date };
  
  // シミュレーション結果（APIから返された完全なデータ）
  simulationResult?: Record<string, unknown> | null;
  
  // フォームデータ全体
  formData?: Record<string, unknown>;
  
  // AI戦略
  generatedStrategy?: string | null;
}

export const usePlanData = (snsType: 'instagram' | 'x' | 'tiktok' | 'youtube' = 'instagram') => {
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchPlanData = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/plans?userId=${user.uid}&snsType=${snsType}&status=active`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      // plansまたはdataのどちらかに対応
      const plansArray = result.plans || result.data || [];
      
      if (plansArray.length > 0) {
        // 最新の計画をそのまま使用（型変換なし）
        const latestPlan = plansArray[0];
        setPlanData(latestPlan as PlanData);
      } else {
        setPlanData(null);
      }
    } catch (err) {
      // 404エラーは計画が存在しないという意味なので、エラーとして扱わない
      if (err instanceof Error && err.message.includes('404')) {
        console.log('計画データが見つかりません。新規作成が必要です。');
        setPlanData(null);
        setError(null);
      } else {
        console.error('計画データ取得エラー:', err);
        setError('計画データの取得に失敗しました');
        setPlanData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [user, snsType]);

  useEffect(() => {
    fetchPlanData();
  }, [user?.uid, fetchPlanData, snsType]);

  // 手動でデータを再取得する関数
  const refetchPlanData = () => {
    fetchPlanData();
  };

  return { planData, loading, error, refetchPlanData };
};
