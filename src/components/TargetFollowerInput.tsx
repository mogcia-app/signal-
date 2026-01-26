"use client";

import React from "react";
import { RangeSlider } from "./RangeSlider";

interface FeasibilityData {
  difficultyRatio: number;
  label: string;
}

interface GrowthRate {
  min: number;
  max: number;
}

interface RecommendedPostingFrequency {
  feed: {
    perWeek: { min: number; max: number };
    description: string;
  };
  reel: {
    perWeek: { min: number; max: number };
    description: string;
  };
  story: {
    perWeek: { min: number; max: number };
    description: string;
  };
}

interface PreviewData {
  current: number;
  target: number;
  realisticTarget: number;
  feasibility?: FeasibilityData;
  growthRate: GrowthRate;
  recommendedPosting?: RecommendedPostingFrequency;
  monthlyGrowthRate?: number; // あなたの目標の月間成長率（%）
  followerGain?: number; // 増加人数
}

interface TargetFollowerInputProps {
  /** 現在のフォロワー数 */
  current: number;
  /** 目標フォロワー数 */
  target: number;
  /** プレビューデータ（達成可能性、成長率など） */
  previewData: PreviewData | null;
  /** 期間（月数） */
  periodMonths: number;
  /** 目標値が変更されたときのコールバック */
  onTargetChange: (value: string) => void;
  /** スライダーの最小値 */
  minTarget: number;
  /** スライダーの最大値 */
  maxTarget: number;
  /** スライダーの現在値 */
  sliderTarget: number;
  /** プレースホルダー（数値入力用） */
  placeholder?: string;
  /** 追加のクラス名（オプション） */
  className?: string;
}

/**
 * 目標フォロワー数の入力コンポーネント
 * 達成難易度、プレビュー、スライダー、数値入力を含む
 * 
 * 使用例:
 * ```tsx
 * <TargetFollowerInput
 *   current={530}
 *   target={546}
 *   previewData={previewData}
 *   periodMonths={1}
 *   onTargetChange={(value) => setTarget(value)}
 *   minTarget={530}
 *   maxTarget={1060}
 *   sliderTarget={546}
 * />
 * ```
 */
export const TargetFollowerInput: React.FC<TargetFollowerInputProps> = ({
  current,
  target,
  previewData,
  periodMonths,
  onTargetChange,
  minTarget,
  maxTarget,
  sliderTarget,
  placeholder,
  className = "",
}) => {
  // 目標の増加数と成長率を計算（APIから受け取ったデータがあればそれを使用）
  const followerGain = previewData?.followerGain ?? (target > current ? target - current : 0);
  const growthRate = current > 0 ? ((followerGain / current) * 100) : 0;
  const monthlyGrowthRate = previewData?.monthlyGrowthRate ?? (periodMonths > 0 ? (growthRate / periodMonths) : 0);

  if (!previewData || current <= 0) {
    return (
      <div className={className}>
        <input
          type="number"
          value={target || ""}
          onChange={(e) => onTargetChange(e.target.value)}
          placeholder={placeholder || "例: 570"}
          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF8A15]"
        />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* 現在と目標の表示（高級感のあるシンプルなデザイン） */}
      <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-6 mb-4 shadow-sm">
        <div className="text-center space-y-3">
          <div>
            <p className="text-2xl font-light text-gray-900 tracking-tight">
              {current.toLocaleString()}人
            </p>
            <p className="text-xs text-gray-500 mt-1 font-medium">現在</p>
          </div>
          
          <div className="flex items-center justify-center gap-2 my-2">
            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent flex-1"></div>
            <div className="w-1 h-1 rounded-full bg-[#FF8A15]"></div>
            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent flex-1"></div>
          </div>
          
          <div>
            <p className="text-2xl font-light text-[#FF8A15] tracking-tight">
              {target > 0 ? target.toLocaleString() : previewData.realisticTarget.toLocaleString()}人
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {target > 0 ? `目標（+${followerGain.toLocaleString()}人、+${growthRate.toFixed(1)}%）` : "現実的な目標"}
            </p>
          </div>
        </div>
      </div>

      {/* 成長率の情報（達成難易度はSimulationPanelで統一表示） */}
      {previewData.growthRate && (
        <div className="mb-4 bg-white border border-gray-100 rounded-lg p-4 space-y-2.5">
          <div className="text-sm text-gray-700 space-y-1.5">
            <p className="leading-relaxed">
              業界平均の成長率: <span className="font-medium text-gray-900">月{previewData.growthRate.min.toFixed(1)}〜{previewData.growthRate.max.toFixed(1)}%</span>
            </p>
            <p className="leading-relaxed">
              あなたの目標: <span className="font-medium text-gray-900">月{monthlyGrowthRate.toFixed(1)}%（{periodMonths}ヶ月で+{followerGain.toLocaleString()}人）</span>
            </p>
          </div>
        </div>
      )}

      {/* スライダー */}
      {current > 0 && (
        <RangeSlider
          min={minTarget}
          max={maxTarget}
          value={sliderTarget}
          onChange={(value) => onTargetChange(value.toString())}
          label="目標を調整する"
          currentValueLabel="現在の目標"
          unit="人"
        />
      )}

      {/* 数値入力 */}
      <input
        type="number"
        value={target || ""}
        onChange={(e) => onTargetChange(e.target.value)}
        placeholder={placeholder || `例: ${previewData.realisticTarget}`}
        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF8A15]"
      />
    </div>
  );
};

