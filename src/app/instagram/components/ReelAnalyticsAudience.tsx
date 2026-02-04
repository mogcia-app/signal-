"use client";

import React from "react";
import { InputData } from "./types";

interface ReelAnalyticsAudienceProps {
  data: InputData;
  onAudienceGenderChange: (field: keyof InputData["audience"]["gender"], value: string) => void;
  onAudienceAgeChange: (field: keyof InputData["audience"]["age"], value: string) => void;
}

export const ReelAnalyticsAudience: React.FC<ReelAnalyticsAudienceProps> = ({
  data,
  onAudienceGenderChange,
  onAudienceAgeChange,
}) => {
  return (
    <div className="p-4 border-t border-gray-200">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">オーディエンス分析</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {["male", "female", "other"].map((key) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {key === "male" ? "男性 (%)" : key === "female" ? "女性 (%)" : "その他 (%)"}
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={data.audience.gender[key as keyof InputData["audience"]["gender"]]}
                onChange={(e) =>
                  onAudienceGenderChange(
                    key as keyof InputData["audience"]["gender"],
                    e.target.value,
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.keys(data.audience.age).map((key) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-2">{key} (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={data.audience.age[key as keyof InputData["audience"]["age"]]}
                onChange={(e) =>
                  onAudienceAgeChange(key as keyof InputData["audience"]["age"], e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};





