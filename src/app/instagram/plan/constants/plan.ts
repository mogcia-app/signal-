/**
 * Instagram Plan ページで使用する定数
 */

// タイムアウト設定
export const TIMEOUT_MS = {
  /** シミュレーション処理のタイムアウト時間（60秒） */
  SIMULATION: 60000,
  /** 計画期間チェックの間隔（1分） */
  PLAN_EXPIRY_CHECK: 60000,
} as const;

// 遅延設定
export const DELAY_MS = {
  /** UI遷移時の遅延時間（300ms） */
  UI_TRANSITION: 300,
} as const;

// 進捗バーの設定
export const PROGRESS = {
  /** 進捗バーの最大値 */
  MAX: 100,
  /** 進捗バーの最小値 */
  MIN: 0,
} as const;

