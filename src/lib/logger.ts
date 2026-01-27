/**
 * シンプルなロガーユーティリティ
 * 削除された instagram/plan/utils/logger の代替
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface Logger {
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
  debug: (message: string, ...args: unknown[]) => void;
}

function createLogger(level: LogLevel): Logger {
  return {
    info: (message: string, ...args: unknown[]) => {
      if (level === "info" || level === "debug") {
        console.log(`[INFO] ${message}`, ...args);
      }
    },
    warn: (message: string, ...args: unknown[]) => {
      if (level === "warn" || level === "info" || level === "debug") {
        console.warn(`[WARN] ${message}`, ...args);
      }
    },
    error: (message: string, ...args: unknown[]) => {
      console.error(`[ERROR] ${message}`, ...args);
    },
    debug: (message: string, ...args: unknown[]) => {
      if (level === "debug") {
        console.debug(`[DEBUG] ${message}`, ...args);
      }
    },
  };
}

// 環境変数からログレベルを取得（デフォルトは 'info'）
const logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

export const logger = createLogger(logLevel);


