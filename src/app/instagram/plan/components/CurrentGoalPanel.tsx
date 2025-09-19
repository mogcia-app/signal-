import React from 'react';
import { PlanFormData } from '../types/plan';

interface CurrentGoalPanelProps {
  formData: PlanFormData;
  selectedStrategies: string[];
  onEditPlan: () => void;
  onDeletePlan: () => void;
}

export const CurrentGoalPanel: React.FC<CurrentGoalPanelProps> = ({
  formData,
  selectedStrategies,
  onEditPlan,
  onDeletePlan
}) => {
  return (
    <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <span className="mr-2">🎯</span>進行中の目標
      </h3>
      
      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900">
            {formData.goalName || 'Instagram成長計画'}
          </h4>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">目標フォロワー増加</span>
              <div className="font-medium">+{formData.followerGain}人</div>
            </div>
            <div>
              <span className="text-gray-600">期間</span>
              <div className="font-medium">{formData.planPeriod}</div>
            </div>
            <div>
              <span className="text-gray-600">ターゲット</span>
              <div className="font-medium">{formData.targetAudience || '未設定'}</div>
            </div>
            <div>
              <span className="text-gray-600">カテゴリ</span>
              <div className="font-medium">{formData.goalCategory || '未設定'}</div>
            </div>
          </div>
          
          {selectedStrategies.length > 0 && (
            <div>
              <span className="text-sm text-gray-600">選択した戦略</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedStrategies.map((strategy, index) => (
                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    {strategy}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={onEditPlan}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded text-sm transition-colors"
        >
          編集する
        </button>
        <button
          onClick={onDeletePlan}
          className="bg-red-200 hover:bg-red-300 text-red-700 px-3 py-2 rounded text-sm transition-colors"
        >
          削除する
        </button>
      </div>
    </section>
  );
};
