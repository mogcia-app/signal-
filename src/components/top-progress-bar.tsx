"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * ページ遷移時のトッププログレスバー
 * Next.js App Routerでのページ遷移を検知して、オレンジ色のプログレスバーを表示します
 */
export function TopProgressBar() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // ページ遷移開始
    setLoading(true);
    setProgress(30); // 初期進行度

    // 少し遅延して進行度を上げる
    const timer1 = setTimeout(() => setProgress(60), 100);
    const timer2 = setTimeout(() => setProgress(90), 300);

    // ページ遷移完了（少し遅延して完了感を出す）
    const timer3 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 200);
    }, 150);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [pathname]);

  if (!loading) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-transparent pointer-events-none">
      <div
        className="h-full bg-[#ff8a15] transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          boxShadow: "0 0 10px rgba(255, 138, 21, 0.6), 0 0 5px rgba(255, 138, 21, 0.3)",
        }}
      />
    </div>
  );
}

