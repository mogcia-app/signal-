"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import SNSLayout from "../../components/sns-layout";
import { useAuth } from "../../contexts/auth-context";
import { authFetch } from "../../utils/authFetch";
import { notify } from "../../lib/ui/notifications";
import { Users, Loader2, Lightbulb, ArrowRight } from "lucide-react";
import { KPISummaryCard } from "./components/KPISummaryCard";

export default function HomePage() {
  const { user } = useAuth();
  const isAuthReady = useMemo(() => Boolean(user), [user]);
  const [currentFollowers, setCurrentFollowers] = useState<string>("");
  const [profileVisits, setProfileVisits] = useState<string>("");
  const [externalLinkTaps, setExternalLinkTaps] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  interface ActionPlan {
    title: string;
    description: string;
    action: string;
  }

  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [isLoadingActionPlans, setIsLoadingActionPlans] = useState(false);

  // KPIサマリー
  const [kpiBreakdowns, setKpiBreakdowns] = useState<any[]>([]);
  const [isLoadingKPI, setIsLoadingKPI] = useState(false);


  // 現在の月を取得
  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);

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

  // フォロワー数・プロフィールアクセス数・外部リンクタップ数を保存
  const saveFollowerCount = async () => {
    if (!currentFollowers || parseInt(currentFollowers, 10) < 0) {
      notify({
        type: "error",
        message: "フォロワー数は0以上の数値を入力してください",
      });
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
          profileVisits: profileVisits ? parseInt(profileVisits, 10) : undefined,
          externalLinkTaps: externalLinkTaps ? parseInt(externalLinkTaps, 10) : undefined,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setLastUpdated(result.data.updatedAt);
          notify({
            type: "success",
            message: "データを保存しました",
          });
          // 入力欄をクリア
          setCurrentFollowers("");
          setProfileVisits("");
          setExternalLinkTaps("");
        }
      } else {
        throw new Error("保存に失敗しました");
      }
    } catch (err) {
      console.error("データ保存エラー:", err);
      notify({
        type: "error",
        message: "データの保存に失敗しました",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // アクションプランを取得（独立したAPIから）
  const fetchActionPlans = useCallback(async () => {
    if (!isAuthReady) return;

    setIsLoadingActionPlans(true);
    try {
      const response = await authFetch(`/api/analytics/monthly-proposals?date=${currentMonth}`);

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.actionPlans) {
          setActionPlans(result.data.actionPlans);
        }
      }
    } catch (err) {
      console.error("アクションプラン取得エラー:", err);
    } finally {
      setIsLoadingActionPlans(false);
    }
  }, [isAuthReady, currentMonth]);

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

  return (
    <SNSLayout customTitle="ホーム" customDescription="KPIサマリー">
      <div className="w-full p-6 sm:p-8 bg-gray-50 min-h-screen">

        {/* KPIサマリーカード */}
        <KPISummaryCard breakdowns={kpiBreakdowns} isLoading={isLoadingKPI} />

        {/* フォロワー数入力セクション */}
        <div className="bg-white rounded-xl p-6 mb-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center border border-orange-100">
              <Users className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">現在のフォロワー数</h2>
              <p className="text-xs text-gray-500 mt-0.5">月間のフォロワー数を記録</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              <p className="ml-3 text-sm text-gray-500">読み込み中...</p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-3">
                {currentMonth}のフォロワー数
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={currentFollowers}
                  onChange={(e) => setCurrentFollowers(e.target.value)}
                  placeholder="フォロワー数を入力"
                  min="0"
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  disabled={isSaving}
                />
                <button
                  onClick={saveFollowerCount}
                  disabled={isSaving || !currentFollowers}
                  className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
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
                <p className="text-xs text-gray-400 mt-3">
                  最終更新: {new Date(lastUpdated).toLocaleString("ja-JP")}
                </p>
              )}
            </div>
          )}

          {/* プロフィールアクセス数と外部リンクタップ数の入力欄 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <label className="block text-xs font-medium text-gray-500 mb-3">
              プロフィールへのアクセス数（投稿に紐づかない全体の数値）
            </label>
            <input
              type="number"
              value={profileVisits}
              onChange={(e) => setProfileVisits(e.target.value)}
              placeholder="プロフィールアクセス数を入力"
              min="0"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all mb-3"
              disabled={isSaving}
            />
            <label className="block text-xs font-medium text-gray-500 mb-3">
              外部リンクタップ数（投稿に紐づかない全体の数値）
            </label>
            <input
              type="number"
              value={externalLinkTaps}
              onChange={(e) => setExternalLinkTaps(e.target.value)}
              placeholder="外部リンクタップ数を入力"
              min="0"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
              disabled={isSaving}
            />
            <p className="text-xs text-gray-400 mt-3">
              ※ インスタの分析で「投稿に紐づかない」プロフィール閲覧や外部リンクタップがある場合に入力してください
            </p>
          </div>
        </div>


        {/* 今月のアクションプラン */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center border border-orange-100">
                <Lightbulb className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">今月のアクションプラン</h2>
                <p className="text-xs text-gray-500 mt-0.5">AIが提案する改善アクション</p>
              </div>
            </div>
            <a
              href="/instagram/report"
              className="text-xs text-gray-600 hover:text-orange-600 font-medium flex items-center gap-1 transition-colors"
            >
              詳細を見る
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {isLoadingActionPlans ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              <p className="ml-3 text-sm text-gray-500">読み込み中...</p>
            </div>
          ) : actionPlans.length > 0 ? (
            <div className="space-y-3">
              {actionPlans.map((plan, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-100"
                >
                  <h3 className="text-sm font-semibold text-gray-900 mb-1.5">
                    {index + 1}. {plan.title}
                  </h3>
                  {plan.description && (
                    <p className="text-xs text-gray-600 mb-2 leading-relaxed">{plan.description}</p>
                  )}
                  {plan.action && (
                    <div className="flex items-start gap-2 mt-2 pt-2 border-t border-gray-100">
                      <ArrowRight className="w-3.5 h-3.5 text-orange-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-600 leading-relaxed">{plan.action}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">アクションプランがありません</p>
              <p className="text-xs mt-1">月次レポートページで生成できます</p>
            </div>
          )}
        </div>
      </div>
    </SNSLayout>
  );
}

