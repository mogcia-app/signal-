"use client";

import React from "react";
import { InputData } from "./types";

interface ReelAnalyticsOverviewProps {
  data: InputData;
  onInputChange: (field: keyof InputData, value: string) => void;
}

export const ReelAnalyticsOverview: React.FC<ReelAnalyticsOverviewProps> = ({
  data,
  onInputChange,
}) => {
  return (
    <div className="p-4 border-t border-gray-200">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">概要</h3>
      <div className="space-y-4">
        {/* 閲覧数・フォロワー外 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">閲覧数</label>
            <input
              type="number"
              min="0"
              value={data.reach}
              onChange={(e) => onInputChange("reach", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">フォロワー外</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={data.reelReachFollowerPercent}
              onChange={(e) => onInputChange("reelReachFollowerPercent", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0"
            />
          </div>
        </div>
        {/* インタラクション数・フォロワー外 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              インタラクション数
            </label>
            <input
              type="number"
              min="0"
              value={data.reelInteractionCount}
              onChange={(e) => onInputChange("reelInteractionCount", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">フォロワー外</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={data.reelInteractionFollowerPercent}
              onChange={(e) =>
                onInputChange("reelInteractionFollowerPercent", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
















