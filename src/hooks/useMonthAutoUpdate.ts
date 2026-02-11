/**
 * 月の自動更新を管理するカスタムフック
 * 月が変わったら自動的に現在の月に更新します（過去の月を選択している場合は維持）
 */

import { useEffect, useState } from "react";
import { getCurrentMonth } from "../utils/date-utils";

/**
 * 月の自動更新フック
 * @param initialMonth - 初期月（YYYY-MM形式）
 * @returns [selectedMonth, setSelectedMonth] - 選択された月とセッター関数
 */
export function useMonthAutoUpdate(initialMonth?: string) {
  const [selectedMonth, setSelectedMonth] = useState<string>(
    initialMonth || getCurrentMonth()
  );

  useEffect(() => {
    const checkMonthChange = () => {
      const currentMonth = getCurrentMonth();
      // 選択された月が現在の月より古い（過去）場合は、自動更新をスキップ
      // 過去の月のデータを見ている場合は、そのまま維持する
      if (selectedMonth < currentMonth) {
        return;
      }
      // 選択された月が現在の月と同じか未来の場合は、現在の月に更新
      if (selectedMonth !== currentMonth) {
        setSelectedMonth(currentMonth);
      }
    };

    // 初回チェック
    checkMonthChange();

    // ページがフォーカスされた時にチェック
    const handleFocus = () => {
      checkMonthChange();
    };
    window.addEventListener("focus", handleFocus);

    // ページが表示されている時（visibilitychange）にもチェック
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkMonthChange();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 5分ごとにチェック（月が変わるのは1日0時なので、より頻繁にチェック）
    const interval = setInterval(checkMonthChange, 5 * 60 * 1000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [selectedMonth]);

  return [selectedMonth, setSelectedMonth] as const;
}
















