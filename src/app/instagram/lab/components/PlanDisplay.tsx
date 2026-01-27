"use client";

import React, { type ReactElement } from "react";
import { Calendar, Target, TrendingUp, User, Tag } from "lucide-react";
interface PlanDisplayProps {
  planData?: Record<string, unknown> | null;
}

export const PlanDisplay: React.FC<PlanDisplayProps> = ({ planData }): React.ReactElement => {
  if (!planData || typeof planData !== "object" || planData === null) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-black" />
            </div>
            <h3 className="text-lg font-semibold text-black mb-2">運用計画が設定されていません</h3>
            <p className="text-black mb-4">
              Instagramの成長を加速させるために、まず運用計画を立てましょう
            </p>
            <a
              href="/instagram/plan"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Target className="w-4 h-4 mr-2" />
              運用計画を立てる
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 安全にアクセス
  const safeNumber = (value: unknown, fallback = 0) => {
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

  // planDataがnullでないことを確認済みなので、すべての値を事前に計算
  // plan変数を使用せず、直接planDataから値を取得して型安全にする
  const currentFollowers = safeNumber(planData.currentFollowers, 0);
  const analyticsFollowerIncrease = safeNumber(planData.analyticsFollowerIncrease, 0);
  const actualFollowers =
    planData.actualFollowers !== undefined
      ? safeNumber(planData.actualFollowers, currentFollowers + analyticsFollowerIncrease)
      : currentFollowers + analyticsFollowerIncrease;
  const targetFollowers = safeNumber(planData.targetFollowers, 0);
  const strategies = (planData.strategies as string[]) || [];

  // シミュレーション結果があるか確認
  const hasSimulation = planData.simulationResult && typeof planData.simulationResult === "object";

  // ReactNode型エラーを回避するため、明示的に型アサーションを追加
  const planTitle: string = String(planData.title || "");
  const planPeriod: string = String(planData.planPeriod || "");
  const planTargetAudience: string = String(planData.targetAudience || "");
  const planCategory: string = String(planData.category || "");
  
  // シミュレーション結果の値を事前に計算
  const simulationResult = planData.simulationResult as Record<string, unknown> | null | undefined;
  const monthlyTarget: string = simulationResult?.monthlyTarget ? String(simulationResult.monthlyTarget) : "N/A";
  const feasibilityLevel: string = simulationResult?.feasibilityLevel ? String(simulationResult.feasibilityLevel) : "";
  const feasibilityBadge: string = simulationResult?.feasibilityBadge ? String(simulationResult.feasibilityBadge) : "N/A";

  // JSX要素を返す前に、型を明示的に指定
  const content: ReactElement = (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-black">現在の運用計画</h3>
        <p className="text-sm text-black mt-1">{planTitle}</p>
      </div>

      <div className="p-6">
        {/* フォロワー情報 */}
        <div className="mb-6 border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-700 space-y-1">
          <div className="flex items-center justify-between font-semibold text-gray-900">
            <span>現在のフォロワー</span>
            <span>
              {actualFollowers.toLocaleString()} / {targetFollowers.toLocaleString()}人
            </span>
          </div>
          <p className="text-xs">
            累計 +{Math.max(0, actualFollowers - currentFollowers).toLocaleString()}人（開始値{" "}
            {currentFollowers.toLocaleString()}人）
          </p>
          <p className="text-[11px] text-gray-500">
            詳細な増減は KPI コンソール（/instagram/kpi）で確認できます。
          </p>
          <a
            href="/instagram/kpi"
            className="text-[11px] font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            KPIコンソールを開く →
          </a>
        </div>

        {/* 計画詳細 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-black" />
            <div>
              <div className="text-xs text-black">期間</div>
              <div className="text-sm font-medium text-black">{planPeriod}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-black" />
            <div>
              <div className="text-xs text-black">戦略数</div>
              <div className="text-sm font-medium text-black">{strategies.length}個</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-black" />
            <div>
              <div className="text-xs text-black">ターゲット</div>
              <div className="text-sm font-medium text-black">{planTargetAudience}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Tag className="w-4 h-4 text-black" />
            <div>
              <div className="text-xs text-black">カテゴリ</div>
              <div className="text-sm font-medium text-black">{planCategory}</div>
            </div>
          </div>
        </div>

        {/* 戦略一覧 */}
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">採用戦略</div>
          <div className="flex flex-wrap gap-2">
            {strategies.slice(0, 3).map((strategy, index) => (
              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">
                {strategy}
              </span>
            ))}
            {strategies.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-black text-xs rounded-md">
                +{strategies.length - 3}個
              </span>
            )}
          </div>
        </div>

        {/* シミュレーション結果 */}
        {hasSimulation && (
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-700 mb-2">シミュレーション結果</div>
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg border border-blue-200">
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-black">月間目標:</span>
                  <span className="font-medium text-black">
                    {monthlyTarget}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black">達成可能性:</span>
                  <span
                    className={`font-medium ${
                      feasibilityLevel === "high"
                        ? "text-green-600"
                        : feasibilityLevel === "medium"
                          ? "text-yellow-600"
                          : "text-red-600"
                    }`}
                  >
                    {feasibilityBadge}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex space-x-2">
          <a
            href="/instagram/plan"
            className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-center"
          >
            計画を編集
          </a>
          <button className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            詳細を見る
          </button>
        </div>
      </div>
    </div>
  );
  
  return content;
};

export default PlanDisplay;
