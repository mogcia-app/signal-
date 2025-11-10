import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 開発環境でもエラーを報告（テスト用）
  enabled: true, // 開発中は常に有効

  // トレース性能の設定
  tracesSampleRate: 1.0, // 100%のトランザクションをサンプリング

  // 環境設定
  environment: process.env.NODE_ENV || "development",

  // リリースバージョン
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "unknown",

  // エラーが多いリミット（秒あたりのエラー数）
  maxBreadcrumbs: 50,

  // サーバーサイドのエラーも監視
  attachStacktrace: true,

  // コンソールログをブレッドクラムとして記録
  integrations: (integrations) => {
    return integrations;
  },

  // 個人情報をマスク
  beforeSend(event, _hint) {
    // 個人情報をマスクする処理を追加
    return event;
  },

  // 無視するエラー
  ignoreErrors: [
    // ネットワークエラー
    "NetworkError",
    "Failed to fetch",
    "Network request failed",
    // リソースエラー
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection",
  ],

  // デフォルトのユーザーコンテキスト
  initialScope: {
    tags: {
      component: "signal-app",
    },
  },
});

// コンソールログをSentryに送信する設定
if (typeof window !== "undefined") {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  const formatArgs = (args: unknown[]): string =>
    args
      .map((arg) => {
        if (typeof arg === "string") {return arg;}
        if (typeof arg === "number" || typeof arg === "boolean") {return String(arg);}
        if (arg instanceof Error) {return `${arg.name}: ${arg.message}`;}
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      })
      .join(" ");

  // console.log をオーバーライド
  console.log = (...args: unknown[]) => {
    Sentry.addBreadcrumb({
      message: formatArgs(args),
      level: "info",
      category: "console",
    });
    originalLog(...(args as Parameters<typeof console.log>));
  };

  // console.warn をオーバーライド
  console.warn = (...args: unknown[]) => {
    Sentry.addBreadcrumb({
      message: formatArgs(args),
      level: "warning",
      category: "console",
    });
    originalWarn(...(args as Parameters<typeof console.warn>));
  };

  // console.error をオーバーライド
  console.error = (...args: unknown[]) => {
    Sentry.addBreadcrumb({
      message: formatArgs(args),
      level: "error",
      category: "console",
    });
    originalError(...(args as Parameters<typeof console.error>));
  };

  // Sentry.logger.info を使用可能にする（オプション）
  // Sentry.loggerは明示的なログ送信用に使用可能
  // 例: Sentry.logger.info('User triggered test log', { log_source: 'sentry_test' });
}
