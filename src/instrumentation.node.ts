import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: true,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV || "development",
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "unknown",
  maxBreadcrumbs: 50,
  attachStacktrace: true,
  // デフォルトで個人情報（PII）を送信
  // サポートID、IPアドレス、ユーザー情報などをSentryに送信
  sendDefaultPii: true,

  beforeSend(event, _hint) {
    return event;
  },

  ignoreErrors: [
    "NetworkError",
    "Failed to fetch",
    "Network request failed",
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection",
  ],

  initialScope: {
    tags: {
      component: "signal-app",
    },
  },
  
  // エージェントモニタリング（LLM計測）を有効化
  // OpenAI SDKの呼び出しを自動的に追跡
  // 実際にLLMを呼び出すと、Sentryにイベントが送信されます
});
