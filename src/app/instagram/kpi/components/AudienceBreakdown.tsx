"use client";

import React from "react";
import { Users, Loader2 } from "lucide-react";
import type { AudienceBreakdown } from "@/domain/analysis/kpi/types";

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

const GenderChart: React.FC<{
  title: string;
  breakdown?: AudienceBreakdown | null;
}> = ({ title, breakdown }) => {
  if (!breakdown?.gender) {
    return (
      <div className="flex flex-col items-center justify-center p-6 border border-dashed border-gray-300 rounded-full bg-gray-50 w-32 h-32 sm:w-40 sm:h-40" style={{ aspectRatio: "1 / 1" }}>
        <p className="text-xs text-gray-400">データなし</p>
      </div>
    );
  }

  const malePercent = breakdown.gender.male ?? 0;
  const femalePercent = breakdown.gender.female ?? 0;
  const otherPercent = breakdown.gender.other ?? 0;
  
  return (
    <div className="flex flex-col items-center">
      {title && <p className="text-sm font-semibold text-gray-900 mb-4">{title}</p>}
      <div
        className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-2 border-gray-200 flex-shrink-0"
        style={{
          background: buildConicGradient([
            { value: malePercent, color: "#6366F1" },
            { value: femalePercent, color: "#EC4899" },
            { value: otherPercent, color: "#475569" },
          ]),
          aspectRatio: "1 / 1",
        }}
        role="img"
        aria-label={`${title || ""}の性別内訳: 男性${malePercent.toFixed(1)}%、女性${femalePercent.toFixed(1)}%、その他${otherPercent.toFixed(1)}%`}
      />
    </div>
  );
};

const GenderLegend: React.FC<{
  breakdown?: AudienceBreakdown | null;
}> = ({ breakdown }) => {
  if (!breakdown?.gender) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-700 mb-2">性別内訳</p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#6366F1] flex-shrink-0" />
          <span className="text-sm text-gray-700">男性 {typeof breakdown.gender.male === "number" ? breakdown.gender.male.toFixed(1) : "0"}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#EC4899] flex-shrink-0" />
          <span className="text-sm text-gray-700">女性 {typeof breakdown.gender.female === "number" ? breakdown.gender.female.toFixed(1) : "0"}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#475569] flex-shrink-0" />
          <span className="text-sm text-gray-700">その他 {typeof breakdown.gender.other === "number" ? breakdown.gender.other.toFixed(1) : "0"}%</span>
        </div>
      </div>
    </div>
  );
};

const AgeBreakdown: React.FC<{
  breakdown?: AudienceBreakdown | null;
}> = ({ breakdown }) => {
  if (!breakdown?.age) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-700 mb-2">年齢内訳</p>
      {(["18-24", "25-34", "35-44", "45-54"] as const).map((bucket, index) => {
        const ageValue = breakdown.age?.[bucket] ?? 0;
        const displayValue = typeof ageValue === "number" ? ageValue.toFixed(1) : "0";
        return (
          <div key={bucket}>
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
              <span>{bucket}歳</span>
              <span className="font-semibold">{displayValue}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full"
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
  );
};

export const AudienceBreakdownComponent: React.FC<AudienceBreakdownProps> = ({
  feed,
  reel,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-[#FF8A15] mr-2" />
          <span className="text-sm text-gray-700">読み込み中...</span>
        </div>
      </div>
    );
  }

  if (!feed && !reel) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 bg-[#ff8a15] flex items-center justify-center mr-3 flex-shrink-0 rounded-lg">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">オーディエンス構成サマリー</h2>
          <p className="text-sm text-gray-600 mt-0.5">
            今月のフィード／リールで反応が高かった性別・年齢を比較します
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        {/* 2カラムレイアウト：フィードとリールを横並び */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* フィードセクション */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <h3 className="text-base font-semibold text-gray-900">フィード</h3>
            </div>
            
            {/* 円グラフ */}
            <div className="flex justify-center">
              <GenderChart title="" breakdown={feed} />
            </div>
            
            {/* 性別内訳 */}
            <div className="pt-2">
              <GenderLegend breakdown={feed} />
            </div>
            
            {/* 年齢内訳 */}
            <div className="pt-2">
              <AgeBreakdown breakdown={feed} />
            </div>
            
            {(!feed || (!feed.gender && !feed.age)) && (
              <div className="text-center py-6 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500">データがありません</p>
              </div>
            )}
          </div>

          {/* リールセクション */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <h3 className="text-base font-semibold text-gray-900">リール</h3>
            </div>
            
            {/* 円グラフ */}
            <div className="flex justify-center">
              <GenderChart title="" breakdown={reel} />
            </div>
            
            {/* 性別内訳 */}
            <div className="pt-2">
              <GenderLegend breakdown={reel} />
            </div>
            
            {/* 年齢内訳 */}
            <div className="pt-2">
              <AgeBreakdown breakdown={reel} />
            </div>
            
            {(!reel || (!reel.gender && !reel.age)) && (
              <div className="text-center py-6 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500">データがありません</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

