"use client";

import React from "react";
import { Users, Loader2 } from "lucide-react";
import type { AudienceBreakdown } from "@/app/api/analytics/kpi-breakdown/route";

interface AudienceBreakdownProps {
  feed?: AudienceBreakdown | null;
  reel?: AudienceBreakdown | null;
  isLoading?: boolean;
}

const COLORS = ["#6366F1", "#EC4899", "#0EA5E9", "#F97316"];

const buildConicGradient = (segments: Array<{ value: number; color: string }>) => {
  let current = 0;
  const parts: string[] = [];
  segments.forEach(({ value, color }) => {
    const start = current;
    const end = current + value;
    parts.push(`${color} ${start}% ${end}%`);
    current = end;
  });
  if (current < 100) {
    parts.push(`#e2e8f0 ${current}% 100%`);
  }
  return `conic-gradient(${parts.join(",")})`;
};

const AudienceCard: React.FC<{
  title: string;
  breakdown?: AudienceBreakdown | null;
}> = ({ title, breakdown }) => {
  if (!breakdown || (!breakdown.gender && !breakdown.age)) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-4 text-xs sm:text-sm text-gray-500 bg-white">
        データが不足しています。投稿分析を追加すると表示されます。
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-white space-y-3 sm:space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <div>
          <p className="text-xs sm:text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-[10px] sm:text-xs text-gray-500">性別・年齢別の構成比</p>
        </div>
      </div>
      {breakdown.gender ? (
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border border-gray-100 flex-shrink-0"
            style={{
              background: buildConicGradient([
                { value: breakdown.gender.male ?? 0, color: "#6366F1" },
                { value: breakdown.gender.female ?? 0, color: "#EC4899" },
                { value: breakdown.gender.other ?? 0, color: "#475569" },
              ]),
            }}
          >
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-[10px] sm:text-xs font-semibold text-gray-600">Gender</p>
            </div>
          </div>
          <div className="text-[10px] sm:text-xs text-gray-700 space-y-1 flex-1">
            <p className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#6366F1] flex-shrink-0" />
              男性 {typeof breakdown.gender.male === "number" ? breakdown.gender.male.toFixed(1) : "0"}%
            </p>
            <p className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#EC4899] flex-shrink-0" />
              女性 {typeof breakdown.gender.female === "number" ? breakdown.gender.female.toFixed(1) : "0"}%
            </p>
            <p className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#475569] flex-shrink-0" />
              その他 {typeof breakdown.gender.other === "number" ? breakdown.gender.other.toFixed(1) : "0"}%
            </p>
          </div>
        </div>
      ) : null}
      {breakdown.age ? (
        <div className="space-y-2">
          {(["18-24", "25-34", "35-44", "45-54"] as const).map((bucket, index) => {
            const ageValue = breakdown.age?.[bucket] ?? 0;
            const displayValue = typeof ageValue === "number" ? ageValue.toFixed(1) : "0";
            return (
              <div key={bucket}>
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-gray-600 mb-1">
                  <span>{bucket}</span>
                  <span>{displayValue}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.min(100, typeof ageValue === "number" ? ageValue : 0)}%`,
                      backgroundColor: COLORS[index],
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export const AudienceBreakdownComponent: React.FC<AudienceBreakdownProps> = ({
  feed,
  reel,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-2" />
          <span className="text-sm text-gray-700">読み込み中...</span>
        </div>
      </div>
    );
  }

  if (!feed && !reel) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4">
      <div className="flex items-center mb-4">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0 shadow-sm">
          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">オーディエンス構成サマリー</h2>
          <p className="text-xs text-gray-600 mt-0.5">
            今月のフィード／リールで反応が高かった性別・年齢を比較します
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <AudienceCard title="フィード" breakdown={feed} />
          <AudienceCard title="リール" breakdown={reel} />
        </div>
      </div>
    </div>
  );
};

