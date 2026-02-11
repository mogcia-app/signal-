import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/auth-context";
import { useUserProfile } from "./useUserProfile";

export interface PlanData {
  planId?: string;
  startDate?: string;
  endDate?: string;
  currentFollowers?: number;
  targetFollowers?: number;
  followerIncrease?: number;
  operationPurpose?: string;
  monthlyGrowthRate?: string;
  schedule?: {
    weeklyFrequency?: string;
    feedPosts?: number;
    feedPostsWithReel?: number;
    reelPosts?: number;
    storyPosts?: number;
    postingDays?: Array<{ day: string; time: string; type?: string }>;
    storyDays?: Array<{ day: string; time: string }>;
  };
  weeklyPlans?: Array<{
    week: number;
    targetFollowers: number;
    increase: number;
    theme: string;
    feedPosts: Array<{ day: string; content: string; type?: string }>;
    storyContent: string | string[];
  }>;
  expectedResults?: {
    monthlyReach: number;
    engagementRate: string;
    profileViews: number;
    saves: number;
    newFollowers: number;
  };
  formData?: Record<string, unknown>;
  generatedStrategy?: string;
  [key: string]: unknown;
}

export const usePlanData = (snsType: string = "instagram") => {
  const { user, loading: authLoading } = useAuth();
  const { userProfile } = useUserProfile();
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 認証の読み込み中は待機
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user || !userProfile) {
      setPlanData(null);
      setLoading(false);
      return;
    }

    // activePlanIdを取得
    const activePlanId = userProfile.activePlanId;
    if (!activePlanId) {
      setPlanData(null);
      setLoading(false);
      return;
    }

    const planDocRef = doc(db, "plans", activePlanId);

    // リアルタイムリスナーを設定
    const unsubscribe = onSnapshot(
      planDocRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          
          // planDataフィールドからデータを取得
          const savedPlanData = data.planData as PlanData | undefined;
          
          // 計画データを構築
          const plan: PlanData = {
            planId: doc.id,
            startDate: data.startDate?.toDate?.()?.toISOString().split("T")[0] || savedPlanData?.startDate,
            endDate: data.endDate?.toDate?.()?.toISOString().split("T")[0] || savedPlanData?.endDate,
            currentFollowers: savedPlanData?.currentFollowers || data.currentFollowers,
            targetFollowers: savedPlanData?.targetFollowers || data.targetFollowers,
            followerIncrease: savedPlanData?.followerIncrease || data.followerIncrease,
            operationPurpose: savedPlanData?.operationPurpose || data.operationPurpose,
            monthlyGrowthRate: savedPlanData?.monthlyGrowthRate || data.monthlyGrowthRate,
            schedule: savedPlanData?.schedule || data.schedule,
            weeklyPlans: savedPlanData?.weeklyPlans || data.weeklyPlans,
            expectedResults: savedPlanData?.expectedResults || data.expectedResults,
            formData: data.formData || savedPlanData?.formData,
            generatedStrategy: data.generatedStrategy || savedPlanData?.generatedStrategy,
            ...data,
          };
          
          setPlanData(plan);
          setError(null);
        } else {
          setPlanData(null);
          setError("計画が見つかりません");
        }
        setLoading(false);
      },
      (err) => {
        console.error("計画データ取得エラー:", err);
        setError(err.message);
        setPlanData(null);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user, authLoading, userProfile]);

  return { planData, loading, error };
};



