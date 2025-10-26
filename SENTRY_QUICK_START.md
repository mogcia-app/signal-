# Sentry クイックスタート

## 現在の設定状況

✅ 設定ファイル作成済み
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `src/app/test-sentry/page.tsx`

## 📝 次に行うこと

### 1. SentryアカウントからDSNを取得

1. [Sentry.io](https://sentry.io)にログイン
2. プロジェクト `javascript-nextjs` を選択
3. Settings → Client Keys (DSN)を確認
4. DSNをコピー

### 2. 環境変数を設定

`.env.local`ファイルに追加：

```bash
# Sentry設定
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxx.ingest.sentry.io/xxxxx
```

### 3. Sentryパッケージをインストール

```bash
npm install @sentry/nextjs@latest
```

### 4. next.config.tsを更新

インストール後、`next.config.ts`のコメントを解除：

```typescript
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // ... 既存の設定
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: "mogcia",
  project: "javascript-nextjs",
});
```

### 5. テスト

```bash
npm run dev
# http://localhost:3000/test-sentry にアクセス
# 各ボタンをクリックしてエラーを発生させる
```

## 🔍 動作確認

1. Sentryダッシュボードでエラーを確認
2. スタックトレース、ユーザー情報、ブラウザ情報が取得できているか確認
3. エラーがリアルタイムで表示されることを確認

## 📊 設定のカスタマイズ

詳しくは `sentry.client.config.ts` を参照してください。

主要な設定：
- `tracesSampleRate`: パフォーマンス監視のサンプリング率
- `environment`: 環境設定
- `ignoreErrors`: 無視するエラーパターン

## 🎯 次のステップ

1. ✅ DSNを設定
2. ✅ パッケージをインストール
3. ✅ テストページで確認
4. ✅ 本番環境にデプロイ
5. ✅ Sentryダッシュボードでエラー監視

