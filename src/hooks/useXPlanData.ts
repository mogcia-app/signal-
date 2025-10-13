import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/auth-context';
import { PlanData } from '../app/instagram/plan/types/plan';

export const useXPlanData = () => {
  const { user } = useAuth();
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchXPlanData = async () => {
      if (!user) {
        setPlanData(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // X版のプランデータを取得
        const plansRef = collection(db, 'xplans');
        const q = query(
          plansRef,
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(1)
        );

        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          const data = doc.data();
          
          // X版のプランデータをPlanData形式に変換
          const xPlanData: PlanData = {
            id: doc.id,
            userId: user.uid,
            snsType: 'x',
            status: data.status || 'active',
            title: data.goalName || 'X成長計画',
            targetFollowers: data.targetFollowers || 1000,
            currentFollowers: data.currentFollowers || 0,
            planPeriod: data.planPeriod || '3ヶ月',
            targetAudience: data.targetAudience || '20-30代',
            category: data.goalCategory || 'フォロワー増加',
            strategies: data.strategies || [],
            postCategories: data.postCategories || [],
            createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
            updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
            simulationResult: data.simulationResult || null,
            formData: data.formData || {},
            generatedStrategy: data.generatedStrategy || null
          };

          setPlanData(xPlanData);
        } else {
          // プランデータがない場合はnullを設定
          setPlanData(null);
        }
      } catch (err) {
        console.error('X版プランデータの取得エラー:', err);
        setError('プランデータの取得に失敗しました');
        setPlanData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchXPlanData();
  }, [user]);

  return { planData, loading, error };
};
