'use client';

import React from 'react';
import { Calendar, Target, TrendingUp, User, Tag } from 'lucide-react';
import { PlanData } from '../../plan/types/plan';

interface PlanDisplayProps {
  planData?: PlanData | null;
}

export const PlanDisplay: React.FC<PlanDisplayProps> = ({ planData }) => {
  if (!planData) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              運用計画が設定されていません
            </h3>
            <p className="text-gray-600 mb-4">
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

  const progressPercentage = Math.min((planData.currentFollowers / planData.targetFollowers) * 100, 100);
  
  // シミュレーション結果があるか確認
  const hasSimulation = planData.simulationResult && typeof planData.simulationResult === 'object';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">現在の運用計画</h3>
        <p className="text-sm text-gray-600 mt-1">{planData.title}</p>
      </div>
      
      <div className="p-6">
        {/* フォロワー目標進捗 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">フォロワー目標</span>
            <span className="text-sm text-gray-600">
              {planData.currentFollowers.toLocaleString()} / {planData.targetFollowers.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{progressPercentage.toFixed(1)}% 達成</span>
            <span>残り {Math.max(0, planData.targetFollowers - planData.currentFollowers).toLocaleString()}人</span>
          </div>
        </div>

        {/* 計画詳細 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <div>
              <div className="text-xs text-gray-500">期間</div>
              <div className="text-sm font-medium text-gray-900">{planData.planPeriod}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <div>
              <div className="text-xs text-gray-500">戦略数</div>
              <div className="text-sm font-medium text-gray-900">{planData.strategies.length}個</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-gray-400" />
            <div>
              <div className="text-xs text-gray-500">ターゲット</div>
              <div className="text-sm font-medium text-gray-900">{planData.targetAudience}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Tag className="w-4 h-4 text-gray-400" />
            <div>
              <div className="text-xs text-gray-500">カテゴリ</div>
              <div className="text-sm font-medium text-gray-900">{planData.category}</div>
            </div>
          </div>
        </div>

        {/* 戦略一覧 */}
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">採用戦略</div>
          <div className="flex flex-wrap gap-2">
            {planData.strategies.slice(0, 3).map((strategy, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md"
              >
                {strategy}
              </span>
            ))}
            {planData.strategies.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                +{planData.strategies.length - 3}個
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
                  <span className="text-gray-600">月間目標:</span>
                  <span className="font-medium text-gray-900">
                    {(planData.simulationResult as Record<string, unknown>).monthlyTarget || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">達成可能性:</span>
                  <span className={`font-medium ${
                    (planData.simulationResult as Record<string, unknown>).feasibilityLevel === 'high' ? 'text-green-600' :
                    (planData.simulationResult as Record<string, unknown>).feasibilityLevel === 'medium' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {(planData.simulationResult as Record<string, unknown>).feasibilityBadge || 'N/A'}
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
};

export default PlanDisplay;
