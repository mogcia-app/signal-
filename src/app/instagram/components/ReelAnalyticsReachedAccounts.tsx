"use client";

import React from "react";
import { InputData } from "./types";

interface ReelAnalyticsReachedAccountsProps {
  data: InputData;
  onInputChange: (field: keyof InputData, value: string) => void;
}

export const ReelAnalyticsReachedAccounts: React.FC<ReelAnalyticsReachedAccountsProps> = ({
  data,
  onInputChange,
}) => {
  return (
    <div className="p-4 border-t border-gray-200">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">リーチしたアカウント</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          リーチしたアカウント数
        </label>
        <input
          type="number"
          min="0"
          value={data.reelReachedAccounts}
          onChange={(e) => onInputChange("reelReachedAccounts", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          placeholder="0"
        />
      </div>
    </div>
  );
};
















