'use client';

import React from 'react';
import { PlanData } from '../../../instagram/plan/types/plan';

interface PlanDisplayProps {
  planData?: PlanData | null;
}

export const PlanDisplay: React.FC<PlanDisplayProps> = ({ planData }) => {
  if (!planData) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">運用計画</h3>
        </div>
        <div className="p-6 text-center">
          <div className="text-gray-400 text-4xl mb-4">📋</div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            運用計画が未設定です
          </h4>
          <p className="text-gray-600 mb-4">
            X運用計画を作成してから投稿文を生成できます
          </p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            計画を作成
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">運用計画</h3>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <h4 className="font-medium text-gray-900">{planData.title}</h4>
          <p className="text-sm text-gray-600">{planData.planPeriod}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">目標フォロワー</div>
            <div className="font-semibold text-blue-600">
              {planData.targetFollowers.toLocaleString()}人
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">現在のフォロワー</div>
            <div className="font-semibold text-gray-900">
              {planData.currentFollowers.toLocaleString()}人
            </div>
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-600 mb-2">戦略</div>
          <div className="flex flex-wrap gap-2">
            {planData.strategies.map((strategy, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
              >
                {strategy}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-600 mb-2">AIペルソナ</div>
          <div className="text-sm text-gray-900">
            {planData.aiPersona.personality}で{planData.aiPersona.style}な{planData.aiPersona.tone}トーン
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanDisplay;
