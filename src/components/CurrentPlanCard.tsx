"use client";

import React from "react";
import { Target, Calendar, Users, Tag } from "lucide-react";
import { PlanData } from "../app/instagram/plan/types/plan";

interface CurrentPlanCardProps {
  planData: PlanData | null;
  variant?: "compact" | "full" | "detailed";
  showEditButton?: boolean;
  snsType?: "instagram" | "x" | "tiktok" | "youtube";
  actualFollowers?: number; // 分析データから取得した実際のフォロワー数
  containerClassName?: string;
}

export const CurrentPlanCard: React.FC<CurrentPlanCardProps> = ({
  planData,
  variant = "compact",
  showEditButton = true,
  snsType = "instagram",
  actualFollowers,
  containerClassName,
}) => {
  // 計画が存在しない場合
  if (!planData) {
    return (
      <div className="bg-white rounded-none border border-gray-200 shadow-sm mb-4">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-black" />
          </div>
          <h3 className="text-lg font-semibold text-black mb-2">運用計画が設定されていません</h3>
          <p className="text-black text-sm mb-4">
            {snsType === "instagram"
              ? "Instagram"
              : snsType === "x"
                ? "X (Twitter)"
                : snsType === "tiktok"
                  ? "TikTok"
                  : "YouTube"}
            の成長を加速させるために、まず運用計画を立てましょう
          </p>
          <a
            href={`/${snsType}/plan`}
            className="inline-flex items-center px-4 py-2 bg-[#ff8a15] text-white rounded-none hover:bg-orange-600 transition-colors"
          >
            <Target className="w-4 h-4 mr-2" />
            運用計画を立てる
          </a>
        </div>
      </div>
    );
  }

  // フォームデータから値を取得（プランページと同じ形式）
  const formData = planData.formData as Record<string, unknown> | undefined;

  const safeNumber = (value: unknown, fallback?: number): number | undefined => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return fallback;
  };

  const formCurrentFollowers = formData?.currentFollowers
    ? safeNumber(formData.currentFollowers)
    : null;
  const formFollowerGain = formData?.followerGain ? safeNumber(formData.followerGain) : null;
  const formGoalCategory = formData?.goalCategory ? String(formData.goalCategory) : null;
  const formTargetAudience = formData?.targetAudience ? String(formData.targetAudience) : null;

  // formDataがあればそれを使用、なければplanDataの直接プロパティを使用
  const currentFollowers =
    formCurrentFollowers ?? safeNumber(planData.currentFollowers, 0) ?? 0;
  const followerGain =
    formFollowerGain ??
    Math.max(
      0,
      (safeNumber(planData.targetFollowers, 0) ?? 0) -
        (safeNumber(planData.currentFollowers, 0) ?? 0),
    );
  const targetFollowers = formData
    ? currentFollowers + followerGain
    : safeNumber(planData.targetFollowers, 0) ?? 0;
  const strategies = planData.strategies || [];
  const postCategories = planData.postCategories || [];

  // 新しい達成度計算: 現在のフォロワー数 = 0%, 目標フォロワー数 = 100%
  // actualFollowersが提供されている場合はそれを使用、そうでなければ計画の現在フォロワー数を使用
  const planActualFollowers =
    planData.actualFollowers !== undefined ? safeNumber(planData.actualFollowers) : undefined;
  const planAnalyticsGain =
    planData.analyticsFollowerIncrease !== undefined
      ? safeNumber(planData.analyticsFollowerIncrease)
      : undefined;
  const computedActualFollowers =
    planActualFollowers ??
    (planAnalyticsGain !== undefined ? currentFollowers + planAnalyticsGain : undefined);
  const displayFollowers =
    actualFollowers ?? computedActualFollowers ?? currentFollowers;

  const followerIncrease = Math.max(0, displayFollowers - currentFollowers);

  // シミュレーション結果
  const simulationResult = planData.simulationResult as Record<string, unknown> | null;
  const hasSimulation = simulationResult && typeof simulationResult === "object";

  const containerClasses =
    containerClassName || "bg-white rounded-none border border-gray-200 shadow-sm mb-4";

  return (
    <div className={containerClasses}>
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-semibold text-black flex items-center">
          <span className="mr-2">📋</span>
          現在の運用計画
        </h3>
        {showEditButton && (
          <a
            href={`/${snsType}/plan`}
            className="text-sm text-[#ff8a15] hover:text-orange-600 transition-colors font-medium"
          >
            編集 →
          </a>
        )}
      </div>

      {/* コンテンツ */}
      <div className="p-6 space-y-4">
        {/* フォロワー情報 */}
        <div className="border border-dashed border-slate-300 bg-slate-50 px-4 py-3 space-y-1">
          <p className="text-sm font-semibold text-slate-900 flex items-center justify-between">
            <span>現在のフォロワー</span>
            <span>
              {displayFollowers.toLocaleString()} / {targetFollowers.toLocaleString()}人
            </span>
          </p>
          <p className="text-xs text-slate-600">
            累計 +{followerIncrease.toLocaleString()}人（開始値 {currentFollowers.toLocaleString()}人）
          </p>
          <p className="text-[11px] text-slate-500">
            詳細な内訳は KPI コンソール（KPI タブ）で確認できます。
          </p>
          <a
            href="/instagram/monthly-report?view=metrics#kpi-console"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#ff8a15] hover:text-orange-600"
          >
            KPIコンソールを開く →
          </a>
        </div>

        {/* グリッド情報 */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-black" />
            <div className="text-sm">
              <span className="text-black">期間: </span>
              <span className="font-medium text-black">{planData.planPeriod || "未設定"}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-black" />
            <div className="text-sm">
              <span className="text-black">ターゲット層: </span>
              <span className="font-medium text-black">
                {formTargetAudience || planData.targetAudience || "未設定"}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Tag className="w-4 h-4 text-black" />
            <div className="text-sm">
              <span className="text-black">KPI: </span>
              <span className="font-medium text-black">
                {(() => {
                  const goalCategory = formGoalCategory || planData.category;
                  const categoryMap: Record<string, string> = {
                    follower: "フォロワー獲得",
                    engagement: "エンゲージ促進",
                    like: "いいねを増やす",
                    save: "保存率向上",
                    reach: "リーチを増やす",
                    impressions: "インプレッションを増やす",
                    branding: "ブランド認知を広める",
                    profile: "プロフィール誘導",
                    other: formData?.otherGoal ? String(formData.otherGoal) : "その他",
                  };
                  return categoryMap[goalCategory] || goalCategory || "未設定";
                })()}
              </span>
            </div>
          </div>
          {hasSimulation && (
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-black" />
              <div className="text-sm">
                <span className="text-black">達成度: </span>
                <span
                  className={`font-semibold ${
                    simulationResult.feasibilityLevel === "high"
                      ? "text-green-600"
                      : simulationResult.feasibilityLevel === "medium"
                        ? "text-yellow-600"
                        : "text-red-600"
                  }`}
                >
                  {String(simulationResult.feasibilityBadge || "N/A")}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 取り組みたいこと */}
        {strategies.length > 0 && (
          <div>
            <p className="text-xs text-black mb-2">取り組みたいこと</p>
            <div className="flex flex-wrap gap-2">
              {strategies.slice(0, 3).map((strategy, index) => (
                <span
                  key={index}
                  className="px-2.5 py-1 bg-orange-50 text-orange-700 text-xs rounded-none font-medium"
                >
                  {strategy}
                </span>
              ))}
              {strategies.length > 3 && (
                <span className="px-2.5 py-1 bg-gray-100 text-black text-xs rounded-none">
                  +{strategies.length - 3}個
                </span>
              )}
            </div>
          </div>
        )}

        {/* 投稿したい内容 */}
        {postCategories.length > 0 && (
          <div>
            <p className="text-xs text-black mb-2">投稿したい内容</p>
            <div className="flex flex-wrap gap-2">
              {postCategories.slice(0, 3).map((category, index) => (
                <span
                  key={index}
                  className="px-2.5 py-1 bg-orange-50 text-orange-700 text-xs rounded-none font-medium"
                >
                  {category}
                </span>
              ))}
              {postCategories.length > 3 && (
                <span className="px-2.5 py-1 bg-gray-100 text-black text-xs rounded-none">
                  +{postCategories.length - 3}個
                </span>
              )}
            </div>
          </div>
        )}

        {/* AI戦略サマリー（variant = 'full'の場合のみ） */}
        {variant === "full" && planData.generatedStrategy && (
          <div className="bg-orange-50 border border-orange-200 rounded-none p-3">
            <p className="text-xs text-orange-700 font-medium mb-2">🤖 AI戦略が生成済み</p>
            <p className="text-xs text-black">計画ページで詳細を確認できます</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CurrentPlanCard;
