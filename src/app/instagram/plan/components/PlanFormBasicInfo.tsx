"use client";

import React from "react";
import { PlanFormData } from "../types/plan";
import { TargetFollowerAutoInput } from "./TargetFollowerAutoInput";

interface PlanFormBasicInfoProps {
  formData: PlanFormData;
  onFormDataChange: (data: Partial<PlanFormData>) => void;
  getDefaultStartDate: () => string;
  aiSuggestedTarget?: number;
  onAiSuggestedTargetChange?: (target: number | undefined) => void;
}

export const PlanFormBasicInfo: React.FC<PlanFormBasicInfoProps> = ({
  formData,
  onFormDataChange,
  getDefaultStartDate,
  aiSuggestedTarget,
  onAiSuggestedTargetChange,
}) => {
  return (
    <>
      {/* 計画開始日 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          計画開始日 <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          required
          value={formData.startDate}
          onChange={(e) => onFormDataChange({ startDate: e.target.value })}
          min={getDefaultStartDate()}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF8A15]"
        />
        <p className="text-xs text-gray-500 mt-1">
          目標達成期間: 1ヶ月（固定）
        </p>
      </div>

      {/* 現在のフォロワー数 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          現在のフォロワー数 <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          required
          min="0"
          value={formData.currentFollowers || ""}
          onChange={(e) => onFormDataChange({ currentFollowers: parseInt(e.target.value) || 0 })}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF8A15]"
          placeholder="0"
        />
      </div>

      {/* 目標フォロワー数 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          目標フォロワー数 <span className="text-red-500">*</span>
        </label>
        <TargetFollowerAutoInput
          currentFollowers={formData.currentFollowers}
          periodMonths={formData.periodMonths}
          value={formData.targetFollowers}
          onChange={(target: number) => {
            onFormDataChange({ targetFollowers: target });
            onAiSuggestedTargetChange?.(target);
          }}
          onAISuggested={onAiSuggestedTargetChange}
        />
      </div>
    </>
  );
};

