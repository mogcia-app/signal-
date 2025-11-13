# Sentryエラー監視のセットアップ

## 📦 インストール

```bash
npm install @sentry/nextjs
```

または権限エラーが出た場合：

```bash
sudo npm install @sentry/nextjs
```

## 🔧 設定手順

### 1. Sentryアカウントでプロジェクト作成

1. [Sentry.io](https://sentry.io)にアクセス
2. プロジェクトを作成
3. DSNを取得

### 2. 環境変数の設定

`.env.local`ファイルに追加：

```bash
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
```

### 3. 設定ファイルの確認

以下のファイルが作成されています：

- `sentry.client.config.ts` - クライアントサイド
- `sentry.server.config.ts` - サーバーサイド
- `sentry.edge.config.ts` - Edge Runtime

### 4. エラーテスト

テストページで動作確認：
`http://localhost:3000/test-sentry`

## ✅ テスト方法

### 方法1: テストページを使用

1. `http://localhost:3000/test-sentry`にアクセス
2. 各ボタンをクリックしてエラーを発生させる
3. Sentryダッシュボードでエラーを確認

### 方法2: コードに直接追加

```typescript
// どこでもエラーテスト
try {
  // @ts-ignore
  undefinedFunction();
} catch (error) {
  throw error;
}
```

### 方法3: API Routeでテスト

```typescript
// src/app/api/test-error/route.ts
export async function GET() {
  throw new Error("Sentry test error");
}
```

## 🔍 設定のカスタマイズ

### 本番環境のみ有効化

```typescript
enabled: process.env.NODE_ENV === "production";
```

### サンプリング率の調整

```typescript
// 100%のトランザクションをサンプリング
tracesSampleRate: 1.0;

// 10%のみサンプリング（本番環境で推奨）
tracesSampleRate: 0.1;
```

### 無視するエラーを追加

```typescript
ignoreErrors: [
  "NetworkError",
  "Failed to fetch",
  // 追加のエラーパターン
];
```

## 📊 エラーの確認

1. [Sentryダッシュボード](https://sentry.io)にログイン
2. プロジェクトを選択
3. Issues タブでエラーを確認
4. 詳細情報（スタックトレース、ユーザー情報等）を確認

## 🎯 よくあるエラー

### 1. DSNが設定されていない

- `.env.local`に`NEXT_PUBLIC_SENTRY_DSN`が設定されているか確認

### 2. 本番環境でのみ動作しない

- `enabled`設定を確認
- 環境変数`NODE_ENV`が'production'か確認

### 3. エラーが送信されない

- ネットワーク制限を確認
- ブラウザの開発者ツールでリクエストを確認
- SentryのRate Limitに引っかかっていないか確認

## 💡 ベストプラクティス

### 1. 本番環境のみ有効化

開発環境ではログのみで、本番環境でSentryに送信

### 2. 個人情報をマスク

`beforeSend`フックでパスワード等の個人情報を除去

### 3. ノイズなエラーの除外

`ignoreErrors`で無視するエラーパターンを指定

### 4. リリース追跡

Gitのコミットハッシュをリリースとして設定

## 📝 例：エラーを手動で送信

```typescript
import * as Sentry from "@sentry/nextjs";

// エラーを手動で報告
Sentry.captureException(new Error("Manual error"));

// メッセージを送信
Sentry.captureMessage("Something went wrong", "info");

// ユーザーコンテキストを追加
Sentry.setUser({
  id: user.id,
  email: user.email,
});

// タグを追加
Sentry.setTag("feature", "payment");
```

## 🔗 参考リンク

- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry設定オプション](https://docs.sentry.io/platforms/javascript/configuration/)
