'use client';

import React from 'react';
import { PlanData } from '../../../instagram/plan/types/plan';

interface CurrentGoalPanelProps {
  planData?: PlanData | null;
}

export const CurrentGoalPanel: React.FC<CurrentGoalPanelProps> = ({ planData }) => {
  if (!planData) {
    return (
      <div className="text-center">
        <div className="text-gray-400 text-4xl mb-4">📋</div>
        <h4 className="text-lg font-medium text-gray-900 mb-2">
          目標が設定されていません
        </h4>
        <p className="text-gray-600">
          運用計画を作成して目標を設定しましょう
        </p>
      </div>
    );
  }

  const progressPercentage = Math.round((planData.currentFollowers / planData.targetFollowers) * 100);
  const remainingFollowers = planData.targetFollowers - planData.currentFollowers;

  return (
    <div className="space-y-4">
      {/* 進捗表示 */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">フォロワー進捗</span>
          <span className="text-sm font-medium text-blue-600">{progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{planData.currentFollowers.toLocaleString()}人</span>
          <span>{planData.targetFollowers.toLocaleString()}人</span>
        </div>
      </div>

      {/* 目標詳細 */}
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">残りフォロワー</span>
          <span className="text-sm font-medium text-gray-900">
            {remainingFollowers.toLocaleString()}人
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">計画期間</span>
          <span className="text-sm font-medium text-gray-900">
            {planData.planPeriod}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">戦略数</span>
          <span className="text-sm font-medium text-gray-900">
            {planData.strategies.length}個
          </span>
        </div>
      </div>

      {/* 戦略一覧 */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">運用戦略</h4>
        <div className="space-y-2">
          {planData.strategies.map((strategy, index) => (
            <div
              key={index}
              className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg"
            >
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-blue-800">{strategy}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AIペルソナ */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">AIペルソナ</h4>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-800">
            <div className="font-medium">{planData.aiPersona.personality}</div>
            <div className="text-xs text-gray-600">
              {planData.aiPersona.style}で{planData.aiPersona.tone}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurrentGoalPanel;