"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import SNSLayout from "../../components/sns-layout";
import { useAuth } from "../../contexts/auth-context";
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
  const isAuthReady = useMemo(() => Boolean(user), [user]);
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
  const [kpiBreakdowns, setKpiBreakdowns] = useState<any[]>([]);
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

  // フォロワー数を取得
  const fetchFollowerCount = useCallback(async () => {
    if (!isAuthReady) return;

    setIsLoading(true);
    try {
      const response = await authFetch(`/api/follower-counts?month=${currentMonth}&snsType=instagram`);

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // 入力欄は常に空にするため、値を設定しない
          setLastUpdated(result.data.updatedAt);
        }
      }
    } catch (err) {
      console.error("フォロワー数取得エラー:", err);
    } finally {
      setIsLoading(false);
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
          // 入力欄をクリア
          setCurrentFollowers("");
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
          followers: followers, // 既存のフォロワー数を維持
          month: currentMonth,
          snsType: "instagram",
          source: "manual",
          profileVisits: parseInt(profileVisits, 10),
          externalLinkTaps: existingExternalLinkTaps, // 既存の外部リンクタップ数を維持
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setLastUpdated(result.data.updatedAt);
          notify({ type: "success", message: "プロフィールアクセス数を保存しました" });
          // 入力欄をクリア
          setProfileVisits("");
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
          followers: followers, // 既存のフォロワー数を維持
          month: currentMonth,
          snsType: "instagram",
          source: "manual",
          profileVisits: existingProfileVisits, // 既存のプロフィールアクセス数を維持
          externalLinkTaps: parseInt(externalLinkTaps, 10),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setLastUpdated(result.data.updatedAt);
          notify({ type: "success", message: "外部リンクタップ数を保存しました" });
          // 入力欄をクリア
          setExternalLinkTaps("");
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

  // アクションプランを取得（独立したAPIから）
  const fetchActionPlans = useCallback(async () => {
    if (!isAuthReady || !user?.uid) return;

    setIsLoadingActionPlans(true);
    try {
      const [response, actionLogsResponse] = await Promise.all([
        authFetch(`/api/analytics/monthly-proposals?date=${currentMonth}`),
        actionLogsApi.list(user.uid, { limit: 100 }),
      ]);

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.actionPlans) {
          setActionPlans(result.data.actionPlans);
        }
      }

      // アクションログを取得してマップに保存
      if (actionLogsResponse.success && Array.isArray(actionLogsResponse.data)) {
        const logMap = new Map<string, { applied: boolean }>();
        actionLogsResponse.data.forEach((log: any) => {
          if (log.actionId && typeof log.applied === "boolean") {
            logMap.set(log.actionId, { applied: log.applied });
          }
        });
        setActionLogMap(logMap);
      }
    } catch (err) {
      console.error("アクションプラン取得エラー:", err);
    } finally {
      setIsLoadingActionPlans(false);
    }
  }, [isAuthReady, currentMonth, user?.uid]);

  // KPIサマリーを取得
  const fetchKPISummary = useCallback(async () => {
    if (!isAuthReady) return;

    setIsLoadingKPI(true);
    try {
      const response = await authFetch(`/api/analytics/kpi-breakdown?date=${encodeURIComponent(currentMonth)}`);

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.breakdowns) {
          setKpiBreakdowns(result.data.breakdowns);
        }
      } else {
        console.error("KPIサマリー取得エラー:", response.status, await response.text());
      }
    } catch (err) {
      console.error("KPIサマリー取得例外:", err);
    } finally {
      setIsLoadingKPI(false);
    }
  }, [isAuthReady, currentMonth]);


  useEffect(() => {
    if (isAuthReady) {
      fetchFollowerCount();
      fetchActionPlans();
      fetchKPISummary();
    }
  }, [isAuthReady, fetchFollowerCount, fetchActionPlans, fetchKPISummary]);

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

  return (
    <SNSLayout customTitle="ホーム" customDescription="アカウント指標とKPIサマリーを確認・管理">
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 bg-gray-50 min-h-screen">

        {/* KPIサマリーカード */}
        <KPISummaryCard breakdowns={kpiBreakdowns} isLoading={isLoadingKPI} />

        {/* アカウント指標入力セクション */}
        <div className="bg-white rounded-xl p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-50 rounded-lg flex items-center justify-center border border-orange-100 flex-shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-semibold text-gray-900">アカウント指標</h2>
              <p className="text-xs text-gray-500 mt-0.5">フォロワー数やプロフィールアクセス数などを記録</p>
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
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  disabled={isSaving}
                />
                <button
                  onClick={saveFollowerCount}
                  disabled={isSaving || !currentFollowers}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
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


        {/* 今月のアクションプラン */}
        <div className="bg-white rounded-xl p-3 sm:p-4 md:p-6 border border-gray-100 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-50 rounded-lg flex items-center justify-center border border-orange-100 flex-shrink-0">
                <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm sm:text-base font-semibold text-gray-900">今月のアクションプラン</h2>
                <p className="text-xs text-gray-500 mt-0.5">AIが提案する改善アクション</p>
              </div>
            </div>
            <a
              href="/instagram/report"
              className="text-xs text-gray-600 hover:text-orange-600 font-medium flex items-center gap-1 transition-colors self-start sm:self-auto"
            >
              詳細を見る
              <ArrowRight className="w-3.5 h-3.5" />
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
                const actionId = `home-action-plan-${currentMonth}-${index}`;
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
                      focusArea: `next-month-${currentMonth}`,
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
                    className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-100"
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <button
                        onClick={handleToggle}
                        disabled={isPending}
                        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          isChecked
                            ? "bg-orange-600 border-orange-600"
                            : "bg-white border-gray-300 hover:border-orange-400"
                        } ${isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        {isChecked && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-1.5">
                          {index + 1}. {removeMarkdown(plan.title)}
                        </h3>
                        {plan.description && (
                          <p className="text-xs text-gray-600 mb-1.5 sm:mb-2 leading-relaxed">{removeMarkdown(plan.description)}</p>
                        )}
                        {plan.action && (
                          <div className="flex items-start gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-gray-100">
                            <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-600 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-gray-600 leading-relaxed">{removeMarkdown(plan.action)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12 text-gray-400">
              <p className="text-sm">アクションプランがありません</p>
              <p className="text-xs mt-1">月次レポートページで生成できます</p>
            </div>
          )}
        </div>
      </div>
    </SNSLayout>
  );
}

