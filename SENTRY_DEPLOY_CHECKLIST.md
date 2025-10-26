# Sentryデプロイ確認チェックリスト

## ✅ 完了したこと

1. ✅ Sentryファイルをコミット
2. ✅ GitHubにプッシュ（自動でVercelがデプロイ）

## 🔧 Vercel環境変数の設定

### 必須の環境変数

Vercelダッシュボードで以下を設定：

```
NEXT_PUBLIC_SENTRY_DSN=https://2c07c743c50038adafad5bf26c16d940@o4510254790148096.ingest.us.sentry.io/4510254791458816
```

### 設定方法

1. [Vercel](https://vercel.com) にアクセス
2. プロジェクト「signal」を選択
3. **Settings** → **Environment Variables**
4. **Add New** をクリック
5. **Key**: `NEXT_PUBLIC_SENTRY_DSN`
6. **Value**: `https://2c07c7...` （DSNをコピペ）
7. **Environment**: **Production, Preview, Development** すべてにチェック
8. **Save**

### オプション：テストページを有効化

テスト用に追加：
```
NEXT_PUBLIC_ENABLE_SENTRY_TEST=true
```

## 📊 デプロイ後の確認

### 1. デプロイが完了するまで待つ
Vercelダッシュボードでデプロイ状態を確認

### 2. テストページにアクセス
- 環境変数を設定していない場合（無効化される）：OK ✅
- 環境変数 `NEXT_PUBLIC_ENABLE_SENTRY_TEST=true` を設定した場合：
  ```
  https://signal-11gu.vercel.app/test-sentry
  ```

### 3. Sentryダッシュボードで確認
- `mogcia.sentry.io/issues/`
- 本番環境でのエラーが記録されることを確認

## 🎯 本番環境での動作

### 通常のエラー監視
本番環境では自動的に以下を監視：
- ユーザーが起こすエラー
- APIエラー
- データベースエラー
- レンダリングエラー

すべて自動的にSentryに送信されます。

### エラー発生時の通知設定（オプション）
1. Sentryダッシュボードで「Alerts」を設定
2. 重要なエラーのみ通知（Slack/メール）
3. エラー数が一定数を超えたら通知

## 🔒 セキュリティ

### テストページの保護
- デフォルトでは本番環境で無効化
- `NEXT_PUBLIC_ENABLE_SENTRY_TEST=true` を設定した場合のみ有効
- テスト後は削除または環境変数を無効化を推奨

