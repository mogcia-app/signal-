# Sentryテスト手順

## ✅ 設定完了
- DSN設定済み ✅
- @sentry/nextjs インストール済み ✅
- next.config.ts 更新済み ✅

## 🧪 テストする

### 1. 開発サーバーを起動
```bash
npm run dev
```

### 2. テストページにアクセス
ブラウザで以下にアクセス：
```
http://localhost:3000/test-sentry
```

### 3. エラーボタンをクリック
ページに3つのボタンがあります：
- 🔴 undefinedFunction() エラーをテスト
- 🔵 非同期エラーをテスト  
- 🟢 TypeError をテスト

### 4. Sentryダッシュボードで確認
1. ブラウザで以下にアクセス：
   `mogcia.sentry.io/settings/projects/javascript-nextjs/`
2. 左サイドバーから「**問題**」をクリック
3. エラーが表示されることを確認

## 📊 確認項目

### エラー情報が取得できているか確認
- スタックトレース
- ブラウザ情報
- 発生時刻
- エラー回数

### レスポンスの速度
エラー発生から数秒以内にSentryダッシュボードに表示される

