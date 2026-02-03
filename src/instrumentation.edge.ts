import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: true,
  tracesSampleRate: 1.0,
  // デフォルトで個人情報（PII）を送信
  // サポートID、IPアドレス、ユーザー情報などをSentryに送信
  sendDefaultPii: true,
});
