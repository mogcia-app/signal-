"use client";

import { useProgress } from "../contexts/progress-context";

/**
 * ヘッダー下に表示されるプログレスバー
 * AI処理が絡むページで、データ取得の進捗を表示します
 */
export function ProgressBar() {
  const { progress, isVisible } = useProgress();

  if (!isVisible) {
    return null;
  }

  return (
    <div className="relative w-full h-1.5 bg-gray-100 pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-[#FF8A15] to-orange-500 transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          boxShadow: "0 0 10px rgba(255, 138, 21, 0.6), 0 0 5px rgba(255, 138, 21, 0.3)",
        }}
      >
        {/* アニメーション用の光るエフェクト */}
        {progress > 0 && progress < 100 && (
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
            style={{
              width: "50%",
              animation: "shimmer 2s infinite",
            }}
          />
        )}
      </div>
      {/* パーセンテージ表示（オプション） */}
      {progress > 0 && progress < 100 && (
        <div className="absolute top-2 right-4 text-xs font-medium text-[#FF8A15] bg-white px-2 py-0.5 rounded shadow-sm">
          {Math.round(progress)}%
        </div>
      )}
    </div>
  );
}

