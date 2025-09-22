import { useState, useEffect } from 'react';

interface PlanData {
  id: string;
  goalName: string;
  planPeriod: string;
  currentFollowers: number;
  followerGain: number;
  goalCategory: string;
  targetAudience: string;
  brandConcept: string;
  weeklyFocus: string;
  feedFreq: number;
  reelFreq: number;
  storyFreq: number;
  likeGoal: number;
  reachGoal: number;
  createdAt: string;
  updatedAt: string;
}

export const usePlanData = () => {
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlanData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/plans');
        const result = await response.json();
        
        if (result.success && result.data.length > 0) {
          // 最新の計画を取得
          const latestPlan = result.data[0];
          setPlanData(latestPlan);
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
    };

    fetchPlanData();
  }, []);

  return { planData, loading, error };
};
