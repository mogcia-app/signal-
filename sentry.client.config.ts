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
  
  // コンソールログをブレッドクラムとして記録
  integrations: (integrations) => {
    return integrations;
  },
  
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

// コンソールログをSentryに送信する設定
if (typeof window !== 'undefined') {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  // console.log をオーバーライド
  console.log = (...args: any[]) => {
    Sentry.addBreadcrumb({
      message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '),
      level: 'info',
      category: 'console',
    });
    originalLog.apply(console, args);
  };

  // console.warn をオーバーライド
  console.warn = (...args: any[]) => {
    Sentry.addBreadcrumb({
      message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '),
      level: 'warning',
      category: 'console',
    });
    originalWarn.apply(console, args);
  };

  // console.error をオーバーライド
  console.error = (...args: any[]) => {
    Sentry.addBreadcrumb({
      message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '),
      level: 'error',
      category: 'console',
    });
    originalError.apply(console, args);
  };
  
  // Sentry.logger.info を使用可能にする（オプション）
  // Sentry.loggerは明示的なログ送信用に使用可能
  // 例: Sentry.logger.info('User triggered test log', { log_source: 'sentry_test' });
}
