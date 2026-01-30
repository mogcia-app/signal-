"use client";

import React, { useState, useEffect } from "react";
import { Bot } from "lucide-react";

interface AIReasonBoxProps {
  /** 理由の説明（箇条書きの配列） */
  reasons: string[];
  /** 追加のクラス名（オプション） */
  className?: string;
}

/**
 * AIが説明する「理由」セクションの共通コンポーネント
 * アイコンの右横に吹き出し形式で理由を表示します。
 * 理由が複数ある場合、時間差でランダムに1つずつ表示します。
 * 
 * 使用例:
 * ```tsx
 * <AIReasonBox reasons={[
 *   "期間が決まれば、ゴールが明確になるよ！",
 *   "AIが期間に応じた計画を自動生成するよ！"
 * ]} />
 * ```
 * 
 * 注意: HugeiconsIconを使用したい場合は、@hugeicons/reactをインストールし、
 * このコンポーネントを修正してHugeiconsIconとRobot02Iconをインポートしてください。
 * 
 * 例:
 * ```tsx
 * import { HugeiconsIcon } from "@hugeicons/react";
 * import { Robot02Icon } from "@hugeicons/react";
 * 
 * // そして、<Bot /> を <HugeiconsIcon icon={Robot02Icon} /> に変更
 * ```
 */
export const AIReasonBox: React.FC<AIReasonBoxProps> = ({ reasons, className = "" }) => {
  // 理由が1つの場合はそのまま表示、2つ以上の場合は時間差でランダムに1つずつ表示
  const [displayedReason, setDisplayedReason] = useState<string | null>(null);

  useEffect(() => {
    if (reasons.length === 0) {
      return;
    }

    // 理由が1つの場合は即座に表示
    if (reasons.length === 1) {
      setDisplayedReason(reasons[0]);
      return;
    }

    // 理由が2つ以上の場合は、最初にランダムに1つ選んで表示
    const randomIndex = Math.floor(Math.random() * reasons.length);
    setDisplayedReason(reasons[randomIndex]);

    // 2秒後に次の理由を表示（ランダムに選ぶ）
    const timer = setTimeout(() => {
      const remainingReasons = reasons.filter((_, idx) => idx !== randomIndex);
      if (remainingReasons.length > 0) {
        const nextRandomIndex = Math.floor(Math.random() * remainingReasons.length);
        const nextReason = remainingReasons[nextRandomIndex];
        setDisplayedReason(nextReason);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [reasons]);

  if (!displayedReason) {
    return null;
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-start gap-2 animate-in fade-in duration-300">
        {/* アイコン - 高級感のあるアニメーション */}
        <div className="relative flex-shrink-0">
          {/* グロー効果 */}
          <div className="absolute inset-0 bg-[#FF8A15] rounded-full opacity-20 blur-sm animate-pulse" />
          {/* アイコン本体 - 上下に動くアニメーション */}
          <div className="relative animate-bounce" style={{ animationDuration: '2s', animationTimingFunction: 'ease-in-out' }}>
            <Bot className="w-5 h-5 text-[#FF8A15] drop-shadow-md" />
          </div>
        </div>
        
        {/* 吹き出し */}
        <div className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
          <p className="text-xs text-gray-700 leading-relaxed">{displayedReason}</p>
        </div>
      </div>
    </div>
  );
};
