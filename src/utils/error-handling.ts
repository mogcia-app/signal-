/**
 * エラーハンドリング用の共通ユーティリティ関数
 */

/**
 * エラーオブジェクトからエラーメッセージを抽出
 * @param error - エラーオブジェクト（Error、string、その他）
 * @param defaultMessage - デフォルトのエラーメッセージ
 * @returns エラーメッセージ文字列
 */
export function handleError(error: unknown, defaultMessage: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return defaultMessage;
}











