"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import SNSLayout from "../../components/sns-layout";
import { useAuth } from "../../contexts/auth-context";
import { useUserProfile } from "@/hooks/useUserProfile";
import { canAccessFeature } from "@/lib/plan-access";
import { useRouter } from "next/navigation";
import { authFetch } from "../../utils/authFetch";
import { Users, Loader2, Lightbulb, ArrowRight, Check } from "lucide-react";
import { KPISummaryCard } from "./components/KPISummaryCard";
import { actionLogsApi } from "@/lib/api";
import { notify } from "../../lib/ui/notifications";

// マークダウン記法を削除する関数
const removeMarkdown = (text: string): string => {
  if (!text) return text;
  return text
    .replace(/\*\*/g, "") // **太字**
    .replace(/\*/g, "") // *斜体*
    .replace(/__/g, "") // __太字__
    .replace(/_/g, "") // _斜体_
    .replace(/#{1,6}\s/g, "") // # 見出し
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // [リンクテキスト](URL)
    .replace(/`([^`]+)`/g, "$1") // `コード`
    .replace(/~~/g, "") // ~~取り消し線~~
    .trim();
};

export default function HomePage() {
  const { user } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const router = useRouter();
  const isAuthReady = useMemo(() => Boolean(user), [user]);
  
  // すべてのHooksを早期リターンの前に定義
  const [currentFollowers, setCurrentFollowers] = useState<string>("");
  const [profileVisits, setProfileVisits] = useState<string>("");
  const [externalLinkTaps, setExternalLinkTaps] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingProfileVisits, setIsSavingProfileVisits] = useState(false);
  const [isSavingExternalLinkTaps, setIsSavingExternalLinkTaps] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  interface ActionPlan {
    title: string;
    description: string;
    action: string;
  }

  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [isLoadingActionPlans, setIsLoadingActionPlans] = useState(false);
  const [actionLogMap, setActionLogMap] = useState<Map<string, { applied: boolean }>>(new Map());
  const [actionLogPendingIds, setActionLogPendingIds] = useState<Set<string>>(new Set());

  // KPIサマリー
  interface KPIBreakdown {
    key: string;
    label: string;
    value: number;
    unit?: "count" | "percent";
  }
  const [kpiBreakdowns, setKpiBreakdowns] = useState<KPIBreakdown[]>([]);
  const [isLoadingKPI, setIsLoadingKPI] = useState(false);


  // 現在の月を取得する関数（ローカルタイムゾーンを使用）
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`; // YYYY-MM形式
  };
  
  // 現在の月をstateで管理（自動更新のため）
  const [currentMonth, setCurrentMonth] = useState<string>(getCurrentMonth());

  // BFF APIから全データを取得
  const fetchDashboardData = useCallback(async () => {
    if (!isAuthReady) return;

    setIsLoading(true);
    setIsLoadingActionPlans(true);
    setIsLoadingKPI(true);
    
    try {
      const response = await authFetch(`/api/home/dashboard?month=${currentMonth}`);

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // フォロワー数データ
          if (result.data.followerCount) {
            setLastUpdated(result.data.followerCount.updatedAt);
          }

          // アクションプラン
          setActionPlans(result.data.actionPlans || []);

          // アクションログマップ
          if (result.data.actionLogMap) {
            const logMap = new Map<string, { applied: boolean }>();
            Object.entries(result.data.actionLogMap).forEach(([key, value]: [string, { applied: boolean }]) => {
              logMap.set(key, value);
            });
            setActionLogMap(logMap);
          }

          // KPIサマリー
          setKpiBreakdowns(result.data.kpiBreakdowns || []);
        }
      }
    } catch (err) {
      console.error("ダッシュボードデータ取得エラー:", err);
    } finally {
      setIsLoading(false);
      setIsLoadingActionPlans(false);
      setIsLoadingKPI(false);
    }
  }, [isAuthReady, currentMonth]);

  // フォロワー数を保存
  const saveFollowerCount = async () => {
    if (!currentFollowers || parseInt(currentFollowers, 10) < 0) {
      notify({ type: "error", message: "フォロワー数は0以上の数値を入力してください" });
      return;
    }

    setIsSaving(true);
    try {
      const response = await authFetch("/api/follower-counts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          followers: parseInt(currentFollowers, 10),
          month: currentMonth,
          snsType: "instagram",
          source: "manual",
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setLastUpdated(result.data.updatedAt);
          notify({ type: "success", message: "フォロワー数を保存しました" });
          setCurrentFollowers("");
          // データを再取得
          fetchDashboardData();
        }
      } else {
        throw new Error("保存に失敗しました");
      }
    } catch (err) {
      console.error("データ保存エラー:", err);
      notify({ type: "error", message: "データの保存に失敗しました" });
    } finally {
      setIsSaving(false);
    }
  };

  // プロフィールアクセス数を保存
  const saveProfileVisits = async () => {
    if (!profileVisits || parseInt(profileVisits, 10) < 0) {
      notify({ type: "error", message: "プロフィールアクセス数は0以上の数値を入力してください" });
      return;
    }

    setIsSavingProfileVisits(true);
    try {
      // 既存のデータを取得（なければ作成）
      const getResponse = await authFetch(`/api/follower-counts?month=${currentMonth}&snsType=instagram`);
      let followers = 0;
      let existingExternalLinkTaps: number | undefined = undefined;
      if (getResponse.ok) {
        const getResult = await getResponse.json();
        if (getResult.success && getResult.data) {
          followers = getResult.data.followers;
          existingExternalLinkTaps = getResult.data.externalLinkTaps;
        }
      }

      const response = await authFetch("/api/follower-counts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          followers: followers,
          month: currentMonth,
          snsType: "instagram",
          source: "manual",
          profileVisits: parseInt(profileVisits, 10),
          externalLinkTaps: existingExternalLinkTaps,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setLastUpdated(result.data.updatedAt);
          notify({ type: "success", message: "プロフィールアクセス数を保存しました" });
          setProfileVisits("");
          // データを再取得
          fetchDashboardData();
        }
      } else {
        throw new Error("保存に失敗しました");
      }
    } catch (err) {
      console.error("データ保存エラー:", err);
      notify({ type: "error", message: "データの保存に失敗しました" });
    } finally {
      setIsSavingProfileVisits(false);
    }
  };

  // 外部リンクタップ数を保存
  const saveExternalLinkTaps = async () => {
    if (!externalLinkTaps || parseInt(externalLinkTaps, 10) < 0) {
      return;
    }

    setIsSavingExternalLinkTaps(true);
    try {
      // 既存のデータを取得（なければ作成）
      const getResponse = await authFetch(`/api/follower-counts?month=${currentMonth}&snsType=instagram`);
      let followers = 0;
      let existingProfileVisits: number | undefined = undefined;
      if (getResponse.ok) {
        const getResult = await getResponse.json();
        if (getResult.success && getResult.data) {
          followers = getResult.data.followers;
          existingProfileVisits = getResult.data.profileVisits;
        }
      }

      const response = await authFetch("/api/follower-counts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          followers: followers,
          month: currentMonth,
          snsType: "instagram",
          source: "manual",
          profileVisits: existingProfileVisits,
          externalLinkTaps: parseInt(externalLinkTaps, 10),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setLastUpdated(result.data.updatedAt);
          notify({ type: "success", message: "外部リンクタップ数を保存しました" });
          setExternalLinkTaps("");
          // データを再取得
          fetchDashboardData();
        }
      } else {
        throw new Error("保存に失敗しました");
      }
    } catch (err) {
      console.error("データ保存エラー:", err);
      notify({ type: "error", message: "データの保存に失敗しました" });
    } finally {
      setIsSavingExternalLinkTaps(false);
    }
  };

  // 先月の月を取得する関数
  const getLastMonth = useCallback(() => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  useEffect(() => {
    if (isAuthReady) {
      fetchDashboardData();
    }
  }, [isAuthReady, currentMonth, fetchDashboardData]);

  // 月が変わったら自動的に現在の月に更新
  useEffect(() => {
    const checkMonthChange = () => {
      const newCurrentMonth = getCurrentMonth();
      if (currentMonth !== newCurrentMonth) {
        setCurrentMonth(newCurrentMonth);
      }
    };

    // 初回チェック
    checkMonthChange();

    // ページがフォーカスされた時にチェック
    const handleFocus = () => {
      checkMonthChange();
    };
    window.addEventListener("focus", handleFocus);

    // ページが表示されている時（visibilitychange）にもチェック
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkMonthChange();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 5分ごとにチェック（月が変わるのは1日0時なので、より頻繁にチェック）
    const interval = setInterval(checkMonthChange, 5 * 60 * 1000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [currentMonth]);

  // アクセス権限がない場合は何も表示しない（リダイレクトされる）
  if (profileLoading || !canAccessFeature(userProfile, "canAccessHome")) {
    return null;
  }

  return (
    <SNSLayout customTitle="ホーム" customDescription="アカウント指標とKPIサマリーを確認・管理">
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 bg-white min-h-screen">
        
        {/* ようこそセクション */}
        <div className="mt-2 mb-4">
          <div className="bg-white border border-gray-200 p-3 sm:p-4 transition-all duration-300 group">
            <div className="animate-fade-in">
              <h1 className="text-lg sm:text-xl font-semibold mb-1 bg-gradient-to-r from-gray-900 via-[#FF8A15] to-gray-900 bg-clip-text text-transparent bg-[length:200%_100%] animate-gradient-x">
                {userProfile?.name ? `${userProfile.name}さん、ようこそ！` : "ようこそ！"}
              </h1>
              <p className="text-gray-600 text-xs sm:text-sm group-hover:text-gray-700 transition-colors duration-300">
                今日も<span className="font-bold text-black group-hover:text-gray-900 transition-colors duration-300">Signal</span><span className="text-[#FF8A15] animate-pulse">.</span>で、あなたのInstagram運用をレベルアップさせましょう
              </p>
            </div>
          </div>
        </div>

        {/* KPIサマリーカード */}
        <KPISummaryCard breakdowns={kpiBreakdowns} isLoading={isLoadingKPI} />

        {/* アカウント指標入力セクション */}
        <div className="bg-white p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 border border-gray-200">
          <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white border-2 border-gray-200 flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 sm:w-7 sm:h-7 text-[#FF8A15]" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">アカウント指標</h2>
              <p className="text-sm text-gray-600">フォロワー数やプロフィールアクセス数などを記録して、成長を可視化</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              <p className="ml-3 text-sm text-gray-500">読み込み中...</p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2 sm:mb-3">
                {currentMonth}のフォロワー数
              </label>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <input
                  type="number"
                  value={currentFollowers}
                  onChange={(e) => setCurrentFollowers(e.target.value)}
                  placeholder="フォロワー数を入力"
                  min="0"
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8A15] focus:border-[#FF8A15] transition-all"
                  disabled={isSaving}
                />
                <button
                  onClick={saveFollowerCount}
                  disabled={isSaving || !currentFollowers}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-[#FF8A15] text-white hover:bg-[#E67A0A] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                      保存中
                    </>
                  ) : (
                    "保存"
                  )}
                </button>
              </div>
              {lastUpdated && (
                <p className="text-xs text-gray-400 mt-2 sm:mt-3">
                  最終更新: {new Date(lastUpdated).toLocaleString("ja-JP")}
                </p>
              )}
            </div>
          )}

          {/* プロフィールアクセス数と外部リンクタップ数の入力欄 */}
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
            <label className="block text-xs font-medium text-gray-500 mb-2 sm:mb-3">
              プロフィールへのアクセス数（投稿に紐づかない全体の数値）
            </label>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-3 sm:mb-4">
              <input
                type="number"
                value={profileVisits}
                onChange={(e) => setProfileVisits(e.target.value)}
                placeholder="プロフィールアクセス数を入力"
                min="0"
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                disabled={isSavingProfileVisits}
              />
              <button
                onClick={saveProfileVisits}
                disabled={isSavingProfileVisits || !profileVisits}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isSavingProfileVisits ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    保存中
                  </>
                ) : (
                  "保存"
                )}
              </button>
            </div>
            <label className="block text-xs font-medium text-gray-500 mb-2 sm:mb-3">
              外部リンクタップ数（投稿に紐づかない全体の数値）
            </label>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-2 sm:mb-3">
              <input
                type="number"
                value={externalLinkTaps}
                onChange={(e) => setExternalLinkTaps(e.target.value)}
                placeholder="外部リンクタップ数を入力"
                min="0"
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                disabled={isSavingExternalLinkTaps}
              />
              <button
                onClick={saveExternalLinkTaps}
                disabled={isSavingExternalLinkTaps || !externalLinkTaps}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isSavingExternalLinkTaps ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    保存中
                  </>
                ) : (
                  "保存"
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400">
              ※ インスタの分析で「投稿に紐づかない」プロフィール閲覧や外部リンクタップがある場合に入力してください
            </p>
          </div>
        </div>

        {/* 今月のアクションプラン（先月のレポートまとめから） */}
        <div className="bg-white p-4 sm:p-6 md:p-8 border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white border-2 border-gray-200 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-6 h-6 sm:w-7 sm:h-7 text-[#FF8A15]" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">今月のアクションプラン</h2>
                <p className="text-sm text-gray-600">改善点の見える化：今月すべき具体的なアクション</p>
              </div>
            </div>
            <a
              href="/instagram/report"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:text-[#FF8A15] transition-all duration-200 border border-gray-200 hover:border-[#FF8A15] self-start sm:self-auto"
            >
              詳細を見る
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {isLoadingActionPlans ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              <p className="ml-3 text-sm text-gray-500">読み込み中...</p>
            </div>
          ) : actionPlans.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {actionPlans.map((plan, index) => {
                const lastMonth = getLastMonth();
                const actionId = `home-action-plan-${lastMonth}-${index}`;
                const isChecked = actionLogMap.get(actionId)?.applied ?? false;
                const isPending = actionLogPendingIds.has(actionId);

                const handleToggle = async () => {
                  if (!user?.uid || isPending) return;

                  const newApplied = !isChecked;
                  setActionLogPendingIds((prev) => new Set(prev).add(actionId));

                  try {
                    await actionLogsApi.upsert({
                      userId: user.uid,
                      actionId,
                      title: plan.title,
                      focusArea: `next-month-${lastMonth}`,
                      applied: newApplied,
                    });

                    setActionLogMap((prev) => {
                      const newMap = new Map(prev);
                      newMap.set(actionId, { applied: newApplied });
                      return newMap;
                    });

                    // 成功通知
                    notify({
                      type: "success",
                      message: newApplied ? "アクションプランを採用しました" : "アクションプランの採用を解除しました",
                    });
                  } catch (error) {
                    console.error("アクションログ保存エラー:", error);
                    notify({ type: "error", message: "チェック状態の保存に失敗しました" });
                  } finally {
                    setActionLogPendingIds((prev) => {
                      const newSet = new Set(prev);
                      newSet.delete(actionId);
                      return newSet;
                    });
                  }
                };

                return (
                  <div
                    key={index}
                    className="bg-white p-4 sm:p-5 border border-gray-200 hover:border-[#FF8A15] transition-all duration-200"
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <button
                        onClick={handleToggle}
                        disabled={isPending}
                        className={`mt-0.5 flex-shrink-0 w-6 h-6 border-2 flex items-center justify-center transition-all ${
                          isChecked
                            ? "bg-[#FF8A15] border-[#FF8A15]"
                            : "bg-white border-gray-300 hover:border-[#FF8A15]"
                        } ${isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        {isChecked && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">
                          <span className="inline-block w-6 h-6 bg-gray-100 text-gray-700 text-xs font-medium flex items-center justify-center mr-2 align-middle">
                            {index + 1}
                          </span>
                          {removeMarkdown(plan.title)}
                        </h3>
                        {plan.description && (
                          <p className="text-sm text-gray-600 mb-3 leading-relaxed pl-8">{removeMarkdown(plan.description)}</p>
                        )}
                        {plan.action && (
                          <div className="flex items-start gap-2 mt-3 pt-3 border-t border-gray-200 pl-8">
                            <ArrowRight className="w-4 h-4 text-[#FF8A15] mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-700 leading-relaxed font-medium">{removeMarkdown(plan.action)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 sm:py-16">
              <div className="w-16 h-16 bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-base text-gray-700 font-medium mb-1">アクションプランがありません</p>
              <p className="text-sm text-gray-500">月次レポートページで生成できます</p>
            </div>
          )}
        </div>

      </div>
    </SNSLayout>
  );
}

