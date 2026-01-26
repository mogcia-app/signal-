"use client";

import React from "react";

interface RangeSliderProps {
  /** 最小値 */
  min: number;
  /** 最大値 */
  max: number;
  /** 現在の値 */
  value: number;
  /** 値が変更されたときのコールバック */
  onChange: (value: number) => void;
  /** 左側のラベル（オプション） */
  label?: string;
  /** 右側の現在値表示（オプション） */
  currentValueLabel?: string;
  /** 単位（例: "人"、"%"など） */
  unit?: string;
  /** 数値のフォーマット関数（オプション） */
  formatValue?: (value: number) => string;
  /** 追加のクラス名（オプション） */
  className?: string;
  /** スライダーの色（デフォルト: #FF8A15） */
  accentColor?: string;
  /** スライダーを無効化するか */
  disabled?: boolean;
}

/**
 * 再利用可能な範囲スライダーコンポーネント
 * 
 * 使用例:
 * ```tsx
 * <RangeSlider
 *   min={0}
 *   max={1000}
 *   value={500}
 *   onChange={(value) => setValue(value)}
 *   label="目標を調整する"
 *   currentValueLabel="現在の目標"
 *   unit="人"
 * />
 * ```
 */
export const RangeSlider: React.FC<RangeSliderProps> = ({
  min,
  max,
  value,
  onChange,
  label,
  currentValueLabel,
  unit = "",
  formatValue,
  className = "",
  accentColor = "#FF8A15",
  disabled = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    onChange(newValue);
  };

  const formatDisplayValue = (val: number): string => {
    if (formatValue) {
      return formatValue(val);
    }
    return val.toLocaleString();
  };

  return (
    <div className={`mb-4 ${className}`}>
      {(label || currentValueLabel) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <span className="text-xs text-gray-600">{label}</span>
          )}
          {currentValueLabel && (
            <span className="text-xs font-semibold" style={{ color: accentColor }}>
              {formatDisplayValue(value)}{unit}{currentValueLabel && `（${currentValueLabel}）`}
            </span>
          )}
        </div>
      )}
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            accentColor: accentColor,
          }}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{formatDisplayValue(min)}{unit}</span>
          <span>{formatDisplayValue(max)}{unit}</span>
        </div>
      </div>
    </div>
  );
};

