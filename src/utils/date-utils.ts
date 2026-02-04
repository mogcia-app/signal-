/**
 * フロントエンド用の日付ユーティリティ関数
 */

/**
 * 現在の月をYYYY-MM形式で取得（ローカルタイムゾーンを使用）
 */
export function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * 月の表示名を取得（例: "2026年1月"）
 */
export function getMonthDisplayName(monthStr: string): string {
  const date = new Date(monthStr + "-01");
  return date.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
}





