# 本番環境でのエラーテスト方法

## 🎯 テスト方法

### 方法1: テストページを公開（推奨）

本番環境にも`/test-sentry`ページがあるので、それを使ってエラーを発生させる

1. デプロイ完了後、本番URLにアクセス：

   ```
   https://your-app.vercel.app/test-sentry
   ```

2. エラーボタンをクリック
3. Sentryダッシュボードで確認

### 方法2: 一時的にコードにエラーを入れる（テスト用）

意図的にエラーを発生させるコードを一時的に追加

```typescript
// どんなページにも追加してテスト
if (typeof window !== "undefined" && window.location.pathname === "/test") {
  throw new Error("Test error from production");
}
```

### 方法3: 本番環境で自然に発生するエラーを監視

- ユーザーが実際にエラーを起こす
- APIの呼び出しエラー
- データベースエラー

これらは自動的にSentryに送信される

## 📊 確認方法

### Sentryダッシュボードで確認

1. `mogcia.sentry.io/issues/`
2. エラー一覧を確認
3. 環境が「production」になっているか確認

### 重要：テスト後の処理

#### テストページを削除するか保護する

本番環境で誰でもエラーを発生させられるのは良くないので：

**Option 1: テストページを削除**

```bash
rm -rf src/app/test-sentry
```

**Option 2: 管理者のみアクセス可能にする**

```typescript
// src/app/test-sentry/page.tsx
if (process.env.NODE_ENV === "production") {
  // 認証チェックを追加
  // 管理者のみアクセス可能にする
}
```

**Option 3: 環境変数で制御**

```typescript
if (!process.env.ENABLE_SENTRY_TEST) {
  return <div>ページは使用できません</div>;
}
```

## ✅ 本番環境での推奨設定

### 1. Sentry設定の調整

本番環境では詳細なログを控えめに：

```typescript
// sentry.client.config.ts
enabled: process.env.NODE_ENV === 'production',
tracesSampleRate: 0.1, // 10%のみサンプリング（コスト削減）
```

### 2. 重要なエラーのみ通知

```typescript
ignoreErrors: [
  "ResizeObserver loop limit exceeded",
  "Non-Error promise rejection",
  // 開発環境のエラーは無視
  ...(process.env.NODE_ENV === "development" ? ["*"] : []),
];
```

## 🎯 実際の運用フロー

1. **デプロイ完了** → Vercelから通知
2. **自然にエラーが発生** → Sentryに自動送信
3. **エラーアラート** → Slack/メール通知
4. **エラーを確認** → Sentryダッシュボードで詳細を確認
5. **修正** → コードを修正
6. **再デプロイ** → エラーが解決されることを確認

## 💡 便利な設定

### Sentry CLI でローカル確認

```bash
# インストール
npm install -g @sentry/cli

# エラーを送信してテスト
sentry-cli send-event
```
