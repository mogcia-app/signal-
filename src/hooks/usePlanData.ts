import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../contexts/auth-context";
import { authFetch } from "../utils/authFetch";
import { useUserProfile } from "./useUserProfile";
import { canAccessFeature } from "../lib/plan-access";

// 統一された計画データの型定義
export interface PlanData {
  id: string;
  userId: string;
  snsType: string;
  status: string;
  title: string;
  targetFollowers: number;
  currentFollowers: number;
  actualFollowers?: number;
  analyticsFollowerIncrease?: number;
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

type UsePlanDataOptions = {
  status?: string;
  effectiveMonth?: string | Date;
};

function normalizeEffectiveMonth(value?: string | Date) {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return undefined;
    }
    return value.toISOString().slice(0, 7);
  }

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}$/.test(value)) {
      return value;
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 7);
    }
  }

  return undefined;
}

export const usePlanData = (
  snsType: "instagram" | "x" | "tiktok" | "youtube" = "instagram",
  options: UsePlanDataOptions = {},
) => {
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const isAuthReady = useMemo(() => Boolean(user), [user]);
  
  // プラン階層別アクセス制御: 運用計画機能は松プランのみ
  const canAccessPlan = useMemo(() => {
    return canAccessFeature(userProfile, "canAccessPlan");
  }, [userProfile]);

  const normalizedEffectiveMonth = useMemo(
    () => normalizeEffectiveMonth(options.effectiveMonth),
    [options.effectiveMonth],
  );

  const statusQuery = useMemo(() => {
    if (options.status) {
      return options.status;
    }
    if (normalizedEffectiveMonth) {
      return undefined;
    }
    return "active";
  }, [options.status, normalizedEffectiveMonth]);

  const fetchPlanData = useCallback(async () => {
    if (!isAuthReady) {
      setLoading(false);
      return;
    }

    // プロフィール読み込み中は待機
    if (profileLoading) {
      return;
    }

    // プラン階層別アクセス制御: 運用計画機能は松プランのみ
    // アクセス権限がない場合は、APIを呼ばずに静かに処理（エラーログを出さない）
    if (!canAccessPlan) {
      setPlanData(null);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("snsType", snsType);
      if (statusQuery) {
        params.set("status", statusQuery);
      }
      if (normalizedEffectiveMonth) {
        params.set("effectiveMonth", normalizedEffectiveMonth);
      }

      const response = await authFetch(`/api/plans?${params.toString()}`);

      if (!response.ok) {
        // 403エラーはプラン制限によるものなので、エラーログを出さずに静かに処理
        if (response.status === 403) {
          setPlanData(null);
          setError(null);
          setLoading(false);
          return;
        }

        // その他のエラーは従来通り処理
        // bodyが既に読み込まれている可能性があるので、try-catchで処理
        let errorText = `HTTP error! status: ${response.status}`;
        try {
          // bodyを読み込もうとする（既に読み込まれている場合は空文字列になる）
          const text = await response.text();
          if (text) {
            errorText += ` - ${text}`;
          }
        } catch (err) {
          // bodyが既に読み込まれている場合は、ステータステキストを使用
          errorText += ` - ${response.statusText || "Unknown error"}`;
        }
        console.error("API Error Response:", errorText);
        throw new Error(errorText);
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
      if (err instanceof Error && err.message.includes("404")) {
        console.log("計画データが見つかりません。新規作成が必要です。");
        setPlanData(null);
        setError(null);
      } else if (err instanceof Error && err.message.includes("403")) {
        // 403エラーもプラン制限によるものなので、静かに処理
        setPlanData(null);
        setError(null);
      } else {
        console.error("計画データ取得エラー:", err);
        setError("計画データの取得に失敗しました");
        setPlanData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthReady, profileLoading, canAccessPlan, snsType, statusQuery, normalizedEffectiveMonth]);

  useEffect(() => {
    fetchPlanData();
  }, [isAuthReady, fetchPlanData, snsType, statusQuery, normalizedEffectiveMonth]);

  // 手動でデータを再取得する関数
  const refetchPlanData = () => {
    fetchPlanData();
  };

  return { planData, loading, error, refetchPlanData };
};
