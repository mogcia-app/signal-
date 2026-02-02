"use client";

import { useEffect, useMemo } from "react";
import SNSLayout from "../../components/sns-layout";
import { useAuth } from "../../contexts/auth-context";
import { useLearningStore } from "../../stores/learning-store";
import { AIGrowthSection } from "./components/AIGrowthSection";
import { LearningBadgesSection } from "./components/LearningBadgesSection";
import { SuccessImprovementGallery } from "./components/SuccessImprovementGallery";

export default function LearningDashboardPage() {
  const { user } = useAuth();
  const {
    isContextLoading,
    contextError,
    contextData,
    fetchDashboardData,
    getGoldSignals,
    getRedSignals,
    getAchievements,
  } = useLearningStore();

  const isAuthReady = useMemo(() => Boolean(user?.uid), [user?.uid]);

  const goldSignals = useMemo(() => getGoldSignals(), [getGoldSignals]);
  const redSignals = useMemo(() => getRedSignals(), [getRedSignals]);
  const achievements = useMemo(() => getAchievements(), [getAchievements]);
  const patternInsights = contextData?.postPatterns;



  useEffect(() => {
    if (!isAuthReady || !user?.uid) {
      return;
    }

    fetchDashboardData(user.uid);
  }, [isAuthReady, user?.uid, fetchDashboardData]);

  return (
    <SNSLayout customTitle="学習ダッシュボード" customDescription="AIがあなたの投稿から学習し、どんどん賢くなっていきます">
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 bg-white min-h-screen">
        <div className="space-y-6">
          {/* AIの成長状況セクション */}
          <AIGrowthSection
            contextData={contextData}
            goldSignalsCount={goldSignals.length}
            redSignalsCount={redSignals.length}
          />

          {/* 学習目標（バッジ）セクション */}
          <LearningBadgesSection
            achievements={achievements}
            isLoading={isContextLoading}
          />

          {/* 成功 & 改善投稿ギャラリー（メインセクション） */}
          <SuccessImprovementGallery
            goldSignals={goldSignals}
            redSignals={redSignals}
            patternInsights={patternInsights}
            isLoading={isContextLoading}
            error={contextError}
          />
        </div>
      </div>
    </SNSLayout>
  );
}

