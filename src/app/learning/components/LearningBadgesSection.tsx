"use client";

import { useMemo, type ReactNode } from "react";
import {
  Crown,
  MessageCircle,
  Sparkles,
  Target,
  Calendar,
  Clock3,
  Award,
  RefreshCw,
  Zap,
  Scale,
  Compass,
  Activity,
  FlaskConical,
  Users,
  Brain,
} from "lucide-react";
import type { LearningBadge } from "../types";

interface LearningBadgesSectionProps {
  achievements: LearningBadge[];
  isLoading: boolean;
}

export function LearningBadgesSection({
  achievements,
  isLoading,
}: LearningBadgesSectionProps) {
  const badgeIconMap: Record<string, ReactNode> = {
    crown: <Crown className="h-5 w-5 text-amber-500" />,
    message: <MessageCircle className="h-5 w-5 text-sky-500" />,
    sparkle: <Sparkles className="h-5 w-5 text-purple-500" />,
    target: <Target className="h-5 w-5 text-emerald-500" />,
    calendar: <Calendar className="h-5 w-5 text-slate-600" />,
    clock: <Clock3 className="h-5 w-5 text-indigo-500" />,
    repeat: <RefreshCw className="h-5 w-5 text-slate-700" />,
    zap: <Zap className="h-5 w-5 text-orange-500" />,
    scale: <Scale className="h-5 w-5 text-slate-600" />,
    compass: <Compass className="h-5 w-5 text-blue-500" />,
    activity: <Activity className="h-5 w-5 text-rose-500" />,
    flask: <FlaskConical className="h-5 w-5 text-indigo-500" />,
    users: <Users className="h-5 w-5 text-fuchsia-500" />,
    brain: <Brain className="h-5 w-5 text-emerald-600" />,
    default: <Award className="h-5 w-5 text-slate-500" />,
  };

  const formatAchievementValue = (badge: LearningBadge) => {
    const currentValue =
      typeof badge.current === "number" ? Number(badge.current.toFixed(1)) : badge.current;
    switch (badge.id) {
      case "action-driver":
      case "rag-pilot":
        return `${Math.round(badge.current)}% / ${badge.target}%`;
      case "consistency-builder":
        return `${badge.current}ヶ月 / ${badge.target}ヶ月`;
      case "weekly-insight":
      case "feedback-streak":
        return `${badge.current}週 / ${badge.target}週`;
      case "action-impact":
      case "feedback-balance":
        return `${currentValue}pt / ${badge.target}pt`;
      default:
        return `${currentValue}件 / ${badge.target}件`;
    }
  };

  const filteredAchievements = useMemo(() => {
    // 除外するバッジID
    const excludedBadgeIds = [
      "action-driver",      // アクションドライバー
      "abtest-closer",      // 検証完走
      "action-impact",      // 成果インパクト
      "action-loop",        // アクションループ
      "audience-resonance", // オーディエンス共鳴
    ];
    return achievements.filter(
      (badge) => !excludedBadgeIds.includes(badge.id)
    );
  }, [achievements]);

  if (isLoading && achievements.length === 0) {
    return (
      <section className="border border-gray-100 bg-white p-8 mb-6 rounded-lg shadow-sm">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#FF8A15] rounded flex items-center justify-center flex-shrink-0">
              <Target className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
              AIバッジ
            </h2>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">
            AIを育てるためのバッジを確認できます。
          </p>
        </div>
        <div className="flex items-center justify-center py-8 text-gray-700">
          <div className="w-5 h-5 border-2 border-[#ff8a15] border-t-transparent rounded-full animate-spin mr-2" />
          <span className="text-sm">バッジ情報を取得しています...</span>
        </div>
      </section>
    );
  }

  if (filteredAchievements.length === 0) {
    return (
      <section className="border border-gray-100 bg-white p-8 mb-6 rounded-lg shadow-sm">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#FF8A15] rounded flex items-center justify-center flex-shrink-0">
              <Target className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
              AIバッジ
            </h2>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">
            AIを育てるためのバッジを確認できます。
          </p>
        </div>
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">バッジがまだありません</p>
        </div>
      </section>
    );
  }

  return (
    <section className="border border-gray-100 bg-white p-8 mb-6 rounded-lg shadow-sm">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-[#FF8A15] rounded flex items-center justify-center flex-shrink-0">
            <Target className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
            AIバッジ
          </h2>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed">
          AIを育てるためのバッジを確認できます。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map((badge) => {
          const icon = badgeIconMap[badge.icon] ?? badgeIconMap.default;
          const progressPercent = Math.round(Math.min(1, badge.progress) * 100);

          return (
            <div
              key={badge.id}
              className={`border p-4 ${
                badge.status === "earned"
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">{icon}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800">{badge.title}</h3>
                    <span
                      className={`text-[11px] font-semibold ${
                        badge.status === "earned" ? "text-emerald-600" : "text-slate-500"
                      }`}
                    >
                      {badge.status === "earned" ? "達成！" : `${progressPercent}%`}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{badge.description}</p>
                  <div className="mt-3">
                    <div className="h-2 w-full bg-white border border-gray-200">
                      <div
                        className={`h-[6px] ${
                          badge.status === "earned" ? "bg-emerald-500" : "bg-slate-500"
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="mt-1 text-[11px] text-gray-500">
                      {formatAchievementValue(badge)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

