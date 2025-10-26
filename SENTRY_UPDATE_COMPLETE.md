# Sentry設定更新完了 ✅

## 実施した変更

### 1. 新規作成ファイル
- `src/instrumentation.ts` - Next.js 15の新しい方式
- `src/instrumentation.node.ts` - Node.js用の設定
- `src/instrumentation.edge.ts` - Edge Runtime用の設定
- `src/app/global-error.tsx` - Reactエラーをキャッチ

### 2. 削除したファイル
- `sentry.server.config.ts` (旧方式)
- `sentry.edge.config.ts` (旧方式)

## 次のステップ

### 開発サーバーを再起動
現在のサーバーを Ctrl+C で停止してから：

```bash
npm run dev
```

### テスト
1. `http://localhost:3000/test-sentry` にアクセス
2. 各ボタンをクリック
3. Sentryダッシュボードで確認：
   `mogcia.sentry.io/issues/errors-outages/`

## 確認すべき点

- 警告メッセージが消えているか
- エラーが正しく送信されているか
- スタックトレースが表示されるか

