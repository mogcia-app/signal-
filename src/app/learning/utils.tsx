import React from "react";

export const sentimentLabelMap = {
  positive: "ポジティブ",
  negative: "ネガティブ",
  neutral: "ニュートラル",
} as const;

export const sentimentColorMap = {
  positive: "text-emerald-600",
  negative: "text-red-600",
  neutral: "text-slate-600",
} as const;

export const significanceLabelMap = {
  higher: "平均よりも高い",
  lower: "平均より低い",
  neutral: "平均付近",
} as const;

export const significanceColorMap = {
  higher: "text-emerald-600",
  lower: "text-red-600",
  neutral: "text-slate-600",
} as const;

export const renderSignificanceBadge = (
  label: string,
  value: number | undefined,
  significance: "higher" | "lower" | "neutral" | undefined
) => {
  if (typeof value !== "number" || !Number.isFinite(value) || !significance) {
    return (
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">{label}</span>
        <span className="text-slate-400">-</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-600">{label}</span>
      <span className={`font-semibold ${significanceColorMap[significance]}`}>
        {value > 0 ? "+" : ""}
        {Math.round(value * 100)}%
        <span className="ml-1 text-[10px] font-normal">{significanceLabelMap[significance]}</span>
      </span>
    </div>
  );
};

export const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return "日時未設定";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "日時未設定";
  }
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

