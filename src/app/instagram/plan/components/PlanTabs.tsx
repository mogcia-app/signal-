/**
 * 計画タブUIコンポーネント
 */

import React from "react";
import { Edit2, Trash2 } from "lucide-react";
import { usePlanStore } from "@/stores/plan-store";
import toast from "react-hot-toast";

interface PlanTabsProps {
  onEditPlan: () => void;
  onDeletePlan: () => void;
}

export function PlanTabs({ onEditPlan, onDeletePlan }: PlanTabsProps) {
  const activeTab = usePlanStore((state) => state.activeTab);
  const simulationResult = usePlanStore((state) => state.simulationResult);
  const savedPlanId = usePlanStore((state) => state.savedPlanId);
  const setActiveTab = usePlanStore((state) => state.setActiveTab);

  return (
    <div className="mb-6 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("form")}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === "form"
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }
            `}
          >
            新しく計画を立てる
          </button>
          <button
            onClick={() => setActiveTab("simulation")}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors relative
              ${
                activeTab === "simulation"
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }
            `}
          >
            シミュレーション
            {simulationResult && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-orange-500 rounded-full">
                ✓
              </span>
            )}
          </button>
        </nav>

        {/* 計画保存後の編集・削除ボタン（タブの横に配置） */}
        {savedPlanId && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onEditPlan}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              計画を編集
            </button>
            <button
              type="button"
              onClick={onDeletePlan}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              計画を削除
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

