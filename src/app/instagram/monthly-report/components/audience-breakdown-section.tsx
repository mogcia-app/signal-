"use client";

import React from "react";
import { Users } from "lucide-react";

type AudienceBreakdown = {
  gender?: { male: number; female: number; other: number };
  age?: { "18-24": number; "25-34": number; "35-44": number; "45-54": number };
};

interface AudienceBreakdownSectionProps {
  feed?: AudienceBreakdown | null;
  reel?: AudienceBreakdown | null;
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
      <div className="border border-dashed border-gray-300 p-4 text-sm text-gray-500 bg-white">
        データが不足しています。投稿分析を追加すると表示されます。
      </div>
    );
  }

  return (
    <div className="border border-gray-200 p-4 bg-white space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-gray-500" />
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-xs text-gray-500">性別・年齢別の構成比</p>
        </div>
      </div>
      {breakdown.gender ? (
        <div className="flex items-center gap-4">
          <div
            className="w-24 h-24 rounded-full border border-slate-100"
            style={{
              background: buildConicGradient([
                { value: breakdown.gender.male ?? 0, color: "#6366F1" },
                { value: breakdown.gender.female ?? 0, color: "#EC4899" },
                { value: breakdown.gender.other ?? 0, color: "#475569" },
              ]),
            }}
          >
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-xs font-semibold text-slate-600">Gender</p>
            </div>
          </div>
          <div className="text-xs text-gray-700 space-y-1">
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#6366F1]" />
              男性 {breakdown.gender.male ?? 0}%
            </p>
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#EC4899]" />
              女性 {breakdown.gender.female ?? 0}%
            </p>
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#475569]" />
              その他 {breakdown.gender.other ?? 0}%
            </p>
          </div>
        </div>
      ) : null}
      {breakdown.age ? (
        <div className="space-y-2">
          {(["18-24", "25-34", "35-44", "45-54"] as const).map((bucket, index) => (
            <div key={bucket}>
              <div className="flex items-center justify-between text-[11px] text-gray-600 mb-1">
                <span>{bucket}</span>
                <span>{breakdown.age?.[bucket] ?? 0}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${Math.min(100, breakdown.age?.[bucket] ?? 0)}%`,
                    backgroundColor: COLORS[index],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export function AudienceBreakdownSection({
  feed,
  reel,
}: AudienceBreakdownSectionProps) {
  if (!feed && !reel) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-none p-6 shadow-sm mt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">オーディエンス構成サマリー</p>
          <p className="text-xs text-slate-500">
            今月のフィード／リールで反応が高かった性別・年齢を比較します
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AudienceCard title="フィード" breakdown={feed} />
        <AudienceCard title="リール" breakdown={reel} />
      </div>
    </div>
  );
}

