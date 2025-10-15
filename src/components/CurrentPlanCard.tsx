'use client';

import React from 'react';
import { Target, Calendar, Users, TrendingUp, Tag } from 'lucide-react';
import { PlanData } from '../app/instagram/plan/types/plan';

interface CurrentPlanCardProps {
  planData: PlanData | null;
  variant?: 'compact' | 'full';
  showEditButton?: boolean;
  snsType?: 'instagram' | 'x' | 'tiktok';
}

export const CurrentPlanCard: React.FC<CurrentPlanCardProps> = ({
  planData,
  variant = 'compact',
  showEditButton = true,
  snsType = 'instagram'
}) => {
  // 計画が存在しない場合
  if (!planData) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            運用計画が設定されていません
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            {snsType === 'instagram' ? 'Instagram' : snsType === 'x' ? 'X (Twitter)' : 'TikTok'}の成長を加速させるために、まず運用計画を立てましょう
          </p>
          <a
            href={`/${snsType}/plan`}
            className="inline-flex items-center px-4 py-2 bg-[#ff8a15] text-white rounded-md hover:bg-orange-600 transition-colors"
          >
            <Target className="w-4 h-4 mr-2" />
            運用計画を立てる
          </a>
        </div>
      </div>
    );
  }

  // 安全にアクセス
  const currentFollowers = planData.currentFollowers || 0;
  const targetFollowers = planData.targetFollowers || 0;
  const strategies = planData.strategies || [];
  const postCategories = planData.postCategories || [];
  const progressPercentage = targetFollowers > 0 
    ? Math.min((currentFollowers / targetFollowers) * 100, 100) 
    : 0;
  const remainingFollowers = Math.max(0, targetFollowers - currentFollowers);

  // シミュレーション結果
  const simulationResult = planData.simulationResult as Record<string, unknown> | null;
  const hasSimulation = simulationResult && typeof simulationResult === 'object';

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-semibold text-gray-900 flex items-center">
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
        {/* 計画タイトル */}
        <div>
          <p className="text-xs text-gray-500 mb-1">計画名</p>
          <p className="font-medium text-gray-900">{planData.title}</p>
        </div>

        {/* フォロワー目標進捗 */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">フォロワー目標</span>
            <span className="font-medium text-gray-900">
              {currentFollowers.toLocaleString()} → {targetFollowers.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-gradient-to-r from-[#ff8a15] to-orange-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{progressPercentage.toFixed(1)}% 達成</span>
            <span>残り {remainingFollowers.toLocaleString()}人</span>
          </div>
        </div>

        {/* グリッド情報 */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <div className="text-sm">
              <span className="text-gray-600">期間: </span>
              <span className="font-medium text-gray-900">{planData.planPeriod}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-gray-400" />
            <div className="text-sm">
              <span className="text-gray-600">ターゲット: </span>
              <span className="font-medium text-gray-900">{planData.targetAudience}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Tag className="w-4 h-4 text-gray-400" />
            <div className="text-sm">
              <span className="text-gray-600">KPI: </span>
              <span className="font-medium text-gray-900">{planData.category}</span>
            </div>
          </div>
        </div>

        {/* 施策タグ */}
        {strategies.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">施策</p>
            <div className="flex flex-wrap gap-2">
              {strategies.slice(0, 3).map((strategy, index) => (
                <span
                  key={index}
                  className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-md font-medium"
                >
                  {strategy}
                </span>
              ))}
              {strategies.length > 3 && (
                <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                  +{strategies.length - 3}個
                </span>
              )}
            </div>
          </div>
        )}

        {/* シミュレーション結果 */}
        {hasSimulation && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700 font-medium mb-2">📊 シミュレーション結果</p>
            <div className="text-center">
              <div>
                <span className="text-gray-600 text-xs">達成度: </span>
                <span className={`font-semibold ${
                  simulationResult.feasibilityLevel === 'high' ? 'text-green-600' :
                  simulationResult.feasibilityLevel === 'medium' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {String(simulationResult.feasibilityBadge || 'N/A')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* AI戦略サマリー（variant = 'full'の場合のみ） */}
        {variant === 'full' && planData.generatedStrategy && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-xs text-orange-700 font-medium mb-2">🤖 AI戦略が生成済み</p>
            <p className="text-xs text-gray-600">
              計画ページで詳細を確認できます
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CurrentPlanCard;

