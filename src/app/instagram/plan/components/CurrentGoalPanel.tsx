import React from "react";
import { PlanFormData } from "../types/plan";

interface CurrentGoalPanelProps {
  formData: PlanFormData;
  selectedStrategies: string[];
  onEditPlan: () => void;
  onDeletePlan: () => void;
  onSavePlan?: () => Promise<boolean>;
  isSaving?: boolean;
  saveError?: string | null;
  saveSuccess?: boolean;
  actualFollowers?: number;
}

export const CurrentGoalPanel: React.FC<CurrentGoalPanelProps> = ({
  formData,
  selectedStrategies,
  onEditPlan,
  onDeletePlan,
  onSavePlan,
  isSaving = false,
  saveError = null,
  saveSuccess = false,
  actualFollowers,
}) => {
  return (
    <section className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <span className="mr-2">🎯</span>進行中の目標
      </h3>

      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <div className="space-y-3">
          <h4 className="font-semibold text-black">Instagram成長計画</h4>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-black">現在のフォロワー数</span>
              <div className="font-medium">
                {actualFollowers !== undefined
                  ? actualFollowers.toLocaleString()
                  : formData.currentFollowers}
                人
              </div>
            </div>
            <div>
              <span className="text-black">目標フォロワー数</span>
              <div className="font-medium">
                {parseInt(formData.currentFollowers) + parseInt(formData.followerGain)}人
              </div>
            </div>
            <div>
              <span className="text-black">期間</span>
              <div className="font-medium">{formData.planPeriod}</div>
            </div>
            <div>
              <span className="text-black">ターゲット</span>
              <div className="font-medium">{formData.targetAudience || "未設定"}</div>
            </div>
          </div>

          {selectedStrategies.length > 0 && (
            <div>
              <span className="text-sm text-black">選択した戦略</span>
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

      {/* 保存エラー表示 */}
      {saveError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <div className="text-red-600 mr-2">❌</div>
            <p className="text-red-800 text-sm">{saveError}</p>
          </div>
        </div>
      )}

      {/* 保存成功表示 */}
      {saveSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <div className="text-green-600 mr-2">✅</div>
            <p className="text-green-800 text-sm">計画が保存されました！</p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onEditPlan}
          className="bg-gray-200 hover:bg-gray-300 text-black px-3 py-2 rounded text-sm transition-colors"
        >
          編集する
        </button>
        <button
          onClick={onDeletePlan}
          className="bg-red-200 hover:bg-red-300 text-red-700 px-3 py-2 rounded text-sm transition-colors"
        >
          削除する
        </button>
        {onSavePlan && (
          <button
            onClick={onSavePlan}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-2 rounded text-sm transition-colors"
          >
            {isSaving ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                保存中...
              </div>
            ) : (
              "💾 保存"
            )}
          </button>
        )}
      </div>
    </section>
  );
};
