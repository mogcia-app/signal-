"use client";

import React from "react";
import { InputData } from "./types";

interface ReelAnalyticsReachSourcesProps {
  data: InputData;
  onInputChange: (field: keyof InputData, value: string) => void;
}

export const ReelAnalyticsReachSources: React.FC<ReelAnalyticsReachSourcesProps> = ({
  data,
  onInputChange,
}) => {
  return (
    <div className="p-4 border-t border-gray-200">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">閲覧数の上位ソース</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">プロフィール</label>
          <input
            type="number"
            min="0"
            value={data.reelReachSourceProfile}
            onChange={(e) => onInputChange("reelReachSourceProfile", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">リール</label>
          <input
            type="number"
            min="0"
            value={data.reelReachSourceReel}
            onChange={(e) => onInputChange("reelReachSourceReel", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">発見</label>
          <input
            type="number"
            min="0"
            value={data.reelReachSourceExplore}
            onChange={(e) => onInputChange("reelReachSourceExplore", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">検索</label>
          <input
            type="number"
            min="0"
            value={data.reelReachSourceSearch}
            onChange={(e) => onInputChange("reelReachSourceSearch", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">その他</label>
          <input
            type="number"
            min="0"
            value={data.reelReachSourceOther}
            onChange={(e) => onInputChange("reelReachSourceOther", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="0"
          />
        </div>
      </div>
    </div>
  );
};


















