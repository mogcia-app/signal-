"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { BotStatusCard } from "./bot-status-card";
import { useProgress } from "../contexts/progress-context";

/**
 * ページ遷移時のトッププログレスバー
 * Next.js App Routerでのページ遷移を検知して、オレンジ色のプログレスバーを表示します
 */
export function TopProgressBar() {
  const pathname = usePathname();
  const { isVisible } = useProgress();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    // 初回マウント時は表示しない（初期表示の二重ローディング回避）
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    let active = true;
    const startedAt = Date.now();
    const minVisibleMs = 800;
    let finishTimer: ReturnType<typeof setTimeout> | null = null;
    let closeTimer: ReturnType<typeof setTimeout> | null = null;

    // ページ遷移開始
    setLoading(true);
    setProgress(12);

    // 少し遅延して進行度を上げる
    const timer1 = setTimeout(() => {
      if (active) {
        setProgress(35);
      }
    }, 120);
    const timer2 = setTimeout(() => {
      if (active) {
        setProgress(60);
      }
    }, 320);
    const timer3 = setTimeout(() => {
      if (active) {
        setProgress(82);
      }
    }, 560);

    // 最短表示時間を確保して完了へ
    const timer4 = setTimeout(() => {
      const elapsed = Date.now() - startedAt;
      const remain = Math.max(0, minVisibleMs - elapsed);
      finishTimer = setTimeout(() => {
        if (!active) {
          return;
        }
        setProgress(100);
        closeTimer = setTimeout(() => {
          if (!active) {
            return;
          }
          setLoading(false);
          setProgress(0);
        }, 220);
      }, remain);
    }, 620);

    return () => {
      active = false;
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      if (finishTimer) {
        clearTimeout(finishTimer);
      }
      if (closeTimer) {
        clearTimeout(closeTimer);
      }
    };
  }, [pathname]);

  if (!loading || isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/85 backdrop-blur-[1px]">
      <div className="w-[min(94vw,1200px)]">
        <BotStatusCard
          title="読み込み中..."
          subtitle="ページを準備しています"
          progress={progress}
          large
          borderless
        />
      </div>
    </div>
  );
}
