import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/auth-context';

// 統一された計画データの型定義
interface PlanData {
  id: string;
  title: string;
  targetFollowers: number;
  currentFollowers: number;
  planPeriod: string;
  targetAudience: string;
  category: string;
  strategies: string[];
  createdAt: string;
  updatedAt: string;
  
  // 目標達成シミュレーション
  simulation: {
    postTypes: {
      reel: {
        weeklyCount: number;
        followerEffect: number;
      };
      feed: {
        weeklyCount: number;
        followerEffect: number;
      };
      story: {
        weeklyCount: number;
        followerEffect: number;
      };
    };
  };
  
  // AI出力の世界観
  aiPersona: {
    tone: string;
    style: string;
    personality: string;
    interests: string[];
  };
  
  // シミュレーション結果（オプショナル）
  simulationResult?: {
    estimatedFollowers: number;
    estimatedLikes: number;
    estimatedComments: number;
    estimatedShares: number;
    estimatedReach: number;
    successProbability: number;
    improvementTips: string[];
    weeklyBreakdown: {
      week: number;
      followers: number;
      likes: number;
      comments: number;
      shares: number;
      reach: number;
    }[];
    monthlyBreakdown: {
      month: number;
      followers: number;
      likes: number;
      comments: number;
      shares: number;
      reach: number;
    }[];
    riskFactors: string[];
    recommendedActions: string[];
  } | null;
}

export const usePlanData = () => {
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
      const response = await fetch(`/api/plans?userId=${user.uid}&snsType=instagram&status=active`, {
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
        // 最新の計画を取得し、型を変換
        const latestPlan = plansArray[0];
        const convertedPlan: PlanData = {
          id: latestPlan.id,
          title: latestPlan.title || 'Instagram成長計画',
          targetFollowers: latestPlan.targetFollowers || 0,
          currentFollowers: latestPlan.currentFollowers || 0,
          planPeriod: latestPlan.planPeriod || '未設定',
          targetAudience: latestPlan.targetAudience || '未設定',
          category: latestPlan.category || '未設定',
          strategies: latestPlan.strategies || [],
          createdAt: latestPlan.createdAt || new Date().toISOString(),
          updatedAt: latestPlan.updatedAt || new Date().toISOString(),
          simulation: latestPlan.simulation || {
            postTypes: {
              reel: { weeklyCount: 0, followerEffect: 0 },
              feed: { weeklyCount: 0, followerEffect: 0 },
              story: { weeklyCount: 0, followerEffect: 0 }
            }
          },
          aiPersona: latestPlan.aiPersona || {
            tone: '親しみやすい',
            style: 'カジュアル',
            personality: '明るく前向き',
            interests: []
          },
          simulationResult: latestPlan.simulationResult || null
        };
        setPlanData(convertedPlan);
      } else {
        setPlanData(null);
      }
    } catch (err) {
      console.error('計画データ取得エラー:', err);
      setError('計画データの取得に失敗しました');
      setPlanData(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPlanData();
  }, [user?.uid, fetchPlanData]);

  // 手動でデータを再取得する関数
  const refetchPlanData = () => {
    fetchPlanData();
  };

  return { planData, loading, error, refetchPlanData };
};
