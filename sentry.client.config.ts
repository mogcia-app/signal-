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

  // デフォルトで個人情報（PII）を送信
  // サポートID、IPアドレス、ユーザー情報などをSentryに送信
  sendDefaultPii: true,

  // コンソールログをブレッドクラムとして記録
  // エージェントモニタリング（LLM計測）を有効化
  integrations: (integrations) => {
    // OpenAI SDKの呼び出しを自動的に追跡
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

  const isExpectedOfflineFirestoreError = (args: unknown[]): boolean => {
    const text = args
      .map((arg) => {
        if (typeof arg === "string") {return arg;}
        if (arg instanceof Error) {return `${arg.name}: ${arg.message}`;}
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      })
      .join(" ")
      .toLowerCase();

    return (
      text.includes("could not reach cloud firestore backend") ||
      text.includes("backend didn't respond within 10 seconds") ||
      text.includes("failed to get document because the client is offline") ||
      text.includes("client is offline")
    );
  };

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
    // Firestoreのオフライン系は想定内なので warning 扱いに落とす
    if (isExpectedOfflineFirestoreError(args)) {
      Sentry.addBreadcrumb({
        message: formatArgs(args),
        level: "warning",
        category: "console",
      });
      originalWarn(...(args as Parameters<typeof console.warn>));
      return;
    }

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
