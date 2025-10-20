import React from 'react';
import { PlanFormData } from '../types/plan';

interface CurrentGoalPanelProps {
  formData: PlanFormData;
  selectedStrategies: string[];
  onEditPlan: () => void;
  onDeletePlan: () => void;
  onSavePlan?: () => Promise<boolean>;
  isSaving?: boolean;
  saveError?: string | null;
  saveSuccess?: boolean;
}

export const CurrentGoalPanel: React.FC<CurrentGoalPanelProps> = ({
  formData,
  selectedStrategies,
  onEditPlan,
  onDeletePlan,
  onSavePlan,
  isSaving = false,
  saveError = null,
  saveSuccess = false
}) => {
  return (
    <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <span className="mr-2">🎯</span>進行中の目標
      </h3>
      
      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <div className="space-y-3">
          <h4 className="font-semibold text-black">
            {formData.goalName || 'X成長計画'}
          </h4>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-black">目標フォロワー増加</span>
              <div className="font-medium">+{formData.followerGain}人</div>
            </div>
            <div>
              <span className="text-black">期間</span>
              <div className="font-medium">{formData.planPeriod}</div>
            </div>
            <div>
              <span className="text-black">ターゲット</span>
              <div className="font-medium">{formData.targetAudience || '未設定'}</div>
            </div>
            <div>
              <span className="text-black">KPIカテゴリ</span>
              <div className="font-medium">{formData.goalCategory || '未設定'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 選択された施策 */}
      {selectedStrategies.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">選択された施策</h4>
          <div className="flex flex-wrap gap-2">
            {selectedStrategies.map((strategy, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {strategy}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* アクションボタン */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          onClick={onEditPlan}
          className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          編集
        </button>
        
        {onSavePlan && (
          <button
            onClick={onSavePlan}
            disabled={isSaving}
            className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 text-sm"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        )}
        
        <button
          onClick={onDeletePlan}
          className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
        >
          削除
        </button>
      </div>

      {/* 保存状態メッセージ */}
      {saveError && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{saveError}</p>
        </div>
      )}
      
      {saveSuccess && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800 text-sm">計画が正常に保存されました！</p>
        </div>
      )}
    </section>
  );
};