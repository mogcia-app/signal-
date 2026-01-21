import { useState, useCallback, useEffect, useRef } from "react";

/**
 * クールダウン機能を提供するカスタムフック
 * @param cooldownSeconds クールダウン時間（秒）
 * @returns クールダウン状態と実行関数
 */
export function useCooldown(cooldownSeconds: number = 30) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (remainingSeconds > 0) {
      setIsOnCooldown(true);
      intervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            setIsOnCooldown(false);
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [remainingSeconds]);

  const startCooldown = useCallback(() => {
    setRemainingSeconds(cooldownSeconds);
    setIsOnCooldown(true);
  }, [cooldownSeconds]);

  return {
    isOnCooldown,
    remainingSeconds,
    startCooldown,
  };
}

