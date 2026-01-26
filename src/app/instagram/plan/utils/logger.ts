/**
 * 開発環境のみログを出力するロガーユーティリティ
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * 開発環境のみ console.log を実行
   */
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * 開発環境のみ console.warn を実行
   */
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * 常に console.error を実行（エラーは本番環境でも重要）
   */
  error: (...args: unknown[]) => {
    console.error(...args);
  },

  /**
   * 開発環境のみ console.info を実行
   */
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
};

