"use client";

import React, { useEffect } from "react";
import SNSLayout from "../../components/sns-layout";
import { useAuth } from "../../contexts/auth-context";
import { useUserProfile } from "@/hooks/useUserProfile";
import { X } from "lucide-react";
import CommentReplyAssistant from "../instagram/lab/components/CommentReplyAssistant";
import { useHomeStore } from "@/stores/home-store";
import { WeeklyKPISection } from "./components/WeeklyKPISection";
import { TodayTasksSection } from "./components/TodayTasksSection";
import { TomorrowPreparationSection } from "./components/TomorrowPreparationSection";
import { MonthlyGoalsSection } from "./components/MonthlyGoalsSection";
import { WeeklyScheduleSection } from "./components/WeeklyScheduleSection";
import { OtherKPISection } from "./components/OtherKPISection";

interface WeeklyResult {
  metric: string;
  value: number;
  change: number;
  icon: string;
}

export default function HomePage() {
  const { user } = useAuth();
  const { userProfile } = useUserProfile();

  // Zustandストアから状態を取得
  const dashboardData = useHomeStore((state) => state.dashboardData);
  const isLoadingDashboard = useHomeStore((state) => state.isLoadingDashboard);
  const showPlanCreatedBanner = useHomeStore((state) => state.showPlanCreatedBanner);
  const setShowPlanCreatedBanner = useHomeStore((state) => state.setShowPlanCreatedBanner);
  const fetchDashboard = useHomeStore((state) => state.fetchDashboard);
  const fetchAiSections = useHomeStore((state) => state.fetchAiSections);
  const fetchOtherKPI = useHomeStore((state) => state.fetchOtherKPI);

  // 今日の日付を取得
  const today = new Date();
  const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][today.getDay()];
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日（${dayOfWeek}）`;

  // ユーザー名を取得
  const userName = userProfile?.name || user?.displayName || "ユーザー";

  // データ取得
  useEffect(() => {
    fetchDashboard();
    fetchAiSections();
  }, [fetchDashboard, fetchAiSections]);

  useEffect(() => {
    if (user) {
      fetchOtherKPI();
    }
  }, [user, fetchOtherKPI]);

  // 計画削除を検知してデータを再取得（ページフォーカス時）
  useEffect(() => {
    const handleFocus = () => {
      fetchDashboard();
      fetchOtherKPI();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchDashboard, fetchOtherKPI]);

  // 週間成果データ（ダッシュボードから取得）
  const weeklyResults: WeeklyResult[] = dashboardData?.weeklyKPIs
    ? [
        {
          metric: "いいね数",
          value: dashboardData.weeklyKPIs.thisWeek.likes || 0,
          change: dashboardData.weeklyKPIs.changes?.likes || 0,
          icon: "🩷",
        },
        {
          metric: "コメント数",
          value: dashboardData.weeklyKPIs.thisWeek.comments || 0,
          change: dashboardData.weeklyKPIs.changes?.comments || 0,
          icon: "💬",
        },
        {
          metric: "フォロワー数",
          value: dashboardData.weeklyKPIs.thisWeek.followers || 0,
          change: dashboardData.weeklyKPIs.changes?.followers || 0,
          icon: "📈",
        },
      ]
    : [
        { metric: "いいね数", value: 0, change: 0, icon: "🩷" },
        { metric: "コメント数", value: 0, change: 0, icon: "💬" },
        { metric: "フォロワー数", value: 0, change: 0, icon: "📈" },
      ];



  return (
    <SNSLayout customTitle="ホーム" customDescription="今日のタスクと成果を確認">
      <div className="w-full px-4 sm:px-6 md:px-8 py-6 bg-gray-50 min-h-screen">
        {/* 挨拶セクション */}
        <div className="mb-6">
          <h1 className="text-2xl font-light text-gray-900 mb-1">
            <span className="inline-block animate-fade-in-up" style={{ animationDelay: '0s' }}>こんにちは</span>
            <span className="inline-block animate-fade-in-up ml-2" style={{ animationDelay: '0.2s' }}>、</span>
            <span className="inline-block animate-fade-in-up" style={{ animationDelay: '0.3s' }}>{userName}</span>
            <span className="inline-block animate-fade-in-up" style={{ animationDelay: '0.4s' }}>さん</span>
          </h1>
          <p className="text-sm text-gray-500 font-light animate-fade-in-up" style={{ animationDelay: '0.5s' }}>今日は {dateStr}</p>
        </div>

        <div className="space-y-6">
          {/* 計画作成直後のバナー */}
          {showPlanCreatedBanner && (
            <div className="bg-gradient-to-r from-[#FF8A15] to-orange-500 rounded-lg border border-orange-300 p-6 text-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-light mb-2">✨ 運用プランができました！</h2>
                  <p className="text-sm font-light opacity-90 mb-4">
                    これから{dashboardData?.currentPlan?.planPeriod || "3ヶ月"}、このプランで一緒に頑張りましょう！🔥
                  </p>
                  <button
                    onClick={() => setShowPlanCreatedBanner(false)}
                    className="text-sm font-light underline hover:no-underline"
                  >
                    今日やることを見る
                  </button>
                </div>
                <button
                  onClick={() => setShowPlanCreatedBanner(false)}
                  className="text-white hover:opacity-70 transition-opacity"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* 計画が存在しない場合のメッセージ */}
          {!dashboardData?.currentPlan && !isLoadingDashboard && (
            <div className="bg-gradient-to-r from-[#FF8A15] to-orange-500 rounded-lg border border-orange-300 p-6 text-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-light mb-2">📋 運用計画を作成しましょう</h2>
                  <p className="text-sm font-light opacity-90 mb-4">
                    効果的なSNS運用のため、まずは運用計画を立てましょう。目標を設定し、最適な投稿スケジュールを提案します。
                  </p>
                  <button
                    onClick={() => {
                      window.location.href = "/instagram/plan";
                    }}
                    className="bg-white text-[#FF8A15] px-6 py-2.5 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    計画を作成する →
                  </button>
                  </div>
              </div>
            </div>
          )}

          {/* 今週の成果 */}
          <WeeklyKPISection weeklyResults={weeklyResults} />

          {/* 今日やることと明日の準備（2カラム） */}
          {(dashboardData?.currentPlan || isLoadingDashboard) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TodayTasksSection />
              <TomorrowPreparationSection />
            </div>
          )}

          {/* 今月の目標と今週の予定（2カラム） */}
          {(dashboardData?.currentPlan || isLoadingDashboard) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MonthlyGoalsSection />
              <WeeklyScheduleSection />
            </div>
          )}

          {/* その他KPI入力とコメント返信アシスト（2カラム） */}
          {(dashboardData?.currentPlan || isLoadingDashboard) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <OtherKPISection />

              {/* コメント返信アシスト */}
              <div className="bg-white rounded-lg border border-gray-200">
                <CommentReplyAssistant postType="feed" />
              </div>
            </div>
          )}

          {/* コメント返信アシスト（計画がない場合のみ表示） */}
          {!dashboardData?.currentPlan && !isLoadingDashboard && (
            <div className="bg-white rounded-lg border border-gray-200">
              <CommentReplyAssistant postType="feed" />
            </div>
          )}

        </div>
      </div>
    </SNSLayout>
  );
}
