"use client";

import React from "react";
import { InputData } from "./types";

interface ReelAnalyticsPlayTimeProps {
  data: InputData;
  onInputChange: (field: keyof InputData, value: string) => void;
}

export const ReelAnalyticsPlayTime: React.FC<ReelAnalyticsPlayTimeProps> = ({
  data,
  onInputChange,
}) => {
  return (
    <div className="p-4 border-t border-gray-200">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">再生時間</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(["reelPlayTime", "reelAvgPlayTime"] as Array<keyof InputData>).map((field) => {
          const totalSeconds = Number(data[field]) || 0;
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;
          return (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {field === "reelPlayTime" ? "再生時間" : "平均再生時間"}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={hours}
                  onChange={(e) => {
                    const h = Math.max(0, Number(e.target.value));
                    onInputChange(field, String(h * 3600 + minutes * 60 + seconds));
                  }}
                  className="w-1/3 px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="時"
                />
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => {
                    const m = Math.max(0, Math.min(59, Number(e.target.value)));
                    onInputChange(field, String(hours * 3600 + m * 60 + seconds));
                  }}
                  className="w-1/3 px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="分"
                />
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => {
                    const s = Math.max(0, Math.min(59, Number(e.target.value)));
                    onInputChange(field, String(hours * 3600 + minutes * 60 + s));
                  }}
                  className="w-1/3 px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff8a15] focus:border-[#ff8a15] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="秒"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};




















