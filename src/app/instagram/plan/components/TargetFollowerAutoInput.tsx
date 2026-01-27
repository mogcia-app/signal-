"use client";

import React, { useEffect, useState, useRef } from "react";
import { Loader2 } from "lucide-react";

interface TargetFollowerAutoInputProps {
  currentFollowers: number;
  periodMonths: number;
  value: number;
  onChange: (value: number) => void;
  onAISuggested?: (suggestedValue: number) => void; // AIが提案した値を親コンポーネントに通知
}

/**
 * 目標フォロワー数のAI自動提案コンポーネント
 * 
 * ロジック:
 * - 現在のフォロワー数と期間に基づいて、月間成長率0.8%で目標フォロワー数を自動計算
 * - 計算式: 目標フォロワー数 = 現在のフォロワー数 × (1 + 0.008) ^ 期間月数
 * - ユーザーは自動計算された値を編集可能
 * - 入力完了後1秒のローディングを表示してから提案を表示
 */
export const TargetFollowerAutoInput: React.FC<TargetFollowerAutoInputProps> = ({
  currentFollowers,
  periodMonths,
  value,
  onChange,
  onAISuggested,
}) => {
  const [isAutoCalculated, setIsAutoCalculated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 目標フォロワー数を自動計算
   * 月間成長率0.8%を適用
   */
  const calculateTargetFollowers = (current: number, months: number): number => {
    if (current <= 0 || months <= 0) {
      return 0;
    }
    // 月間成長率0.8% = 0.008
    const monthlyGrowthRate = 0.008;
    const target = current * Math.pow(1 + monthlyGrowthRate, months);
    return Math.round(target);
  };

  /**
   * 現在のフォロワー数または期間が変更されたら、1秒後に自動計算
   */
  useEffect(() => {
    // 既存のタイマーをクリア
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (currentFollowers > 0 && periodMonths > 0) {
      setIsLoading(true);
      
      // 1秒後に計算を実行
      timeoutRef.current = setTimeout(() => {
        const calculatedTarget = calculateTargetFollowers(currentFollowers, periodMonths);
        onChange(calculatedTarget);
        setIsAutoCalculated(true);
        setIsLoading(false);
        // AI提案値を親コンポーネントに通知
        if (onAISuggested) {
          onAISuggested(calculatedTarget);
        }
      }, 1000);
    } else {
      setIsLoading(false);
    }

    // クリーンアップ
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFollowers, periodMonths]);

  /**
   * ユーザーが手動で値を変更した場合
   */
  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10) || 0;
    onChange(newValue);
    setIsAutoCalculated(false);
  };

  /**
   * 再計算ボタン
   */
  const handleRecalculate = () => {
    if (currentFollowers > 0 && periodMonths > 0) {
      const calculatedTarget = calculateTargetFollowers(currentFollowers, periodMonths);
      onChange(calculatedTarget);
      setIsAutoCalculated(true);
      // AI提案値を親コンポーネントに通知
      if (onAISuggested) {
        onAISuggested(calculatedTarget);
      }
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <label className="block text-sm font-medium text-gray-700">
          目標フォロワー数 <span className="text-red-500">*</span>
        </label>
        {isAutoCalculated && !isLoading && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            AI自動提案
          </span>
        )}
        {isLoading && (
          <span className="text-xs text-[#FF8A15] bg-orange-50 px-2 py-1 rounded flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            AI提案中...
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="number"
            required
            min="1"
            value={value || ""}
            onChange={handleManualChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF8A15]"
            placeholder={isLoading ? "AI提案中..." : "例: 1500"}
            disabled={isLoading}
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 text-[#FF8A15] animate-spin" />
            </div>
          )}
        </div>
        {!isAutoCalculated && !isLoading && currentFollowers > 0 && periodMonths > 0 && (
          <button
            type="button"
            onClick={handleRecalculate}
            className="px-4 py-2 text-sm text-[#FF8A15] border border-[#FF8A15] rounded-md hover:bg-orange-50 transition-colors"
          >
            再提案
          </button>
        )}
      </div>
    </div>
  );
};

