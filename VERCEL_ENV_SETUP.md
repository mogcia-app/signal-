# Vercel環境変数の設定方法

## 📋 設定する環境変数

### Sentry DSN

```
NEXT_PUBLIC_SENTRY_DSN=https://2c07c743c50038adafad5bf26c16d940@o4510254790148096.ingest.us.sentry.io/4510254791458816
```

## 🔧 Vercelでの設定方法

### 方法1: ダッシュボードから設定

1. [Vercel](https://vercel.com) にログイン
2. プロジェクト「signal」を選択
3. **Settings** → **Environment Variables** を開く
4. 以下の環境変数を追加：

| Name                     | Value              | Environment      |
| ------------------------ | ------------------ | ---------------- |
| `NEXT_PUBLIC_SENTRY_DSN` | `https://2c07c...` | All Environments |

### 方法2: Vercel CLIから設定

```bash
vercel env add NEXT_PUBLIC_SENTRY_DSN production
# 値を入力: https://2c07c743c50038adafad5bf26c16d940@o4510254790148096.ingest.us.sentry.io/4510254791458816
```

## ✅ 設定後の確認

### デプロイ後に確認

1. 本番環境でエラーを発生させる
2. Sentryダッシュボードでエラーが記録されることを確認
3. 環境変数が正しく読み込まれているか確認

### その他の環境変数（既に設定済みのもの）

- `OPENAI_API_KEY`
- Firebase関連の環境変数

## 🎯 これで完了

環境変数を設定したら、再デプロイで反映されます。

注意：`next.config.ts`で本番環境でのみ有効化する場合は、もう一度確認してください。
