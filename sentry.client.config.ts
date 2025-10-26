import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // 開発環境でもエラーを報告（テスト用）
  enabled: true, // 開発中は常に有効
  
  // トレース性能の設定
  tracesSampleRate: 1.0, // 100%のトランザクションをサンプリング
  
  // 環境設定
  environment: process.env.NODE_ENV || 'development',
  
  // リリースバージョン
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'unknown',
  
  // エラーが多いリミット（秒あたりのエラー数）
  maxBreadcrumbs: 50,
  
  // サーバーサイドのエラーも監視
  attachStacktrace: true,
  
  
  // 個人情報をマスク
  beforeSend(event, hint) {
    // 個人情報をマスクする処理を追加
    return event;
  },
  
  // 無視するエラー
  ignoreErrors: [
    // ネットワークエラー
    'NetworkError',
    'Failed to fetch',
    'Network request failed',
    // リソースエラー
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection',
  ],
  
  // デフォルトのユーザーコンテキスト
  initialScope: {
    tags: {
      component: 'signal-app',
    },
  },
});
