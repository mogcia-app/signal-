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
            title: data.goalName || 'X成長計画',
            targetFollowers: data.targetFollowers || 1000,
            currentFollowers: data.currentFollowers || 0,
            planPeriod: data.planPeriod || '3ヶ月',
            targetAudience: data.targetAudience || '20-30代',
            category: data.goalCategory || 'フォロワー増加',
            strategies: data.strategies || [],
            createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
            simulation: {
              postTypes: {
                feed: {
                  weeklyCount: data.tweetFreq || 5,
                  followerEffect: 0.8
                },
                reel: {
                  weeklyCount: data.threadFreq || 2,
                  followerEffect: 1.2
                },
                story: {
                  weeklyCount: data.replyFreq || 10,
                  followerEffect: 0.6
                }
              }
            },
            aiPersona: {
              tone: data.tone || '親しみやすい',
              style: data.style || 'カジュアル',
              personality: data.personality || '明るく前向き',
              interests: data.interests || ['テクノロジー', 'ビジネス', 'ライフスタイル']
            }
          };

          setPlanData(xPlanData);
        } else {
          // プランデータがない場合はデフォルト値を設定
          const defaultPlanData: PlanData = {
            id: 'default',
            title: 'X成長計画',
            targetFollowers: 1000,
            currentFollowers: 0,
            planPeriod: '3ヶ月',
            targetAudience: '20-30代',
            category: 'フォロワー増加',
            strategies: ['エンゲージメント向上', 'コンテンツ多様化'],
            createdAt: new Date().toISOString(),
            simulation: {
              postTypes: {
                feed: { weeklyCount: 5, followerEffect: 0.8 },
                reel: { weeklyCount: 2, followerEffect: 1.2 },
                story: { weeklyCount: 10, followerEffect: 0.6 }
              }
            },
            aiPersona: {
              tone: '親しみやすい',
              style: 'カジュアル',
              personality: '明るく前向き',
              interests: ['テクノロジー', 'ビジネス', 'ライフスタイル']
            }
          };
          setPlanData(defaultPlanData);
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
