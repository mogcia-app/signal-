# Sentryエージェントモニタリング（LLM計測）セットアップ

## 📋 概要

Sentryのエージェントモニタリング機能により、LLM（大言語モデル）の呼び出しを自動的に追跡し、コスト、レイテンシー、エラーを監視できます。

## ✅ 現在の設定状況

### 設定済み項目

1. **`sendDefaultPii: true`** ✅
   - すべてのSentry設定ファイルに設定済み
   - サポートID、IPアドレス、ユーザー情報が送信されます

2. **`tracesSampleRate: 1.0`** ✅
   - 100%のトランザクションをサンプリング
   - エージェントモニタリングに必要

3. **OpenAI SDKの使用** ✅
   - `src/app/api/ai/chat/route.ts`でOpenAI SDKを使用
   - Sentryが自動的に検出して追跡します

## 🔧 エージェントイベントを確認する方法

### 1. 実際にLLMを呼び出す

「このプロジェクトの最初のエージェントイベントを待っています」というメッセージは、実際にLLMを呼び出すまで表示されます。

**テスト方法**:

1. **AIチャット機能を使用**
   - アプリケーションにログイン
   - AIチャット機能を使用してメッセージを送信
   - `/api/ai/chat`エンドポイントが呼び出されます

2. **APIを直接呼び出す（開発環境）**
   ```bash
   curl -X POST http://localhost:3000/api/ai/chat \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"message": "テストメッセージ"}'
   ```

3. **投稿生成機能を使用**
   - `/api/ai/post-generation`エンドポイントを使用
   - OpenAI APIが呼び出されます

### 2. Sentryダッシュボードで確認

1. [Sentryダッシュボード](https://sentry.io)にログイン
2. プロジェクトを選択
3. **「Agents」**タブを確認
4. LLM呼び出しが表示されることを確認

## 📊 追跡される情報

エージェントモニタリングにより、以下が自動的に追跡されます：

- **LLM呼び出し回数**
- **トークン使用量**（入力/出力）
- **レイテンシー**（応答時間）
- **コスト**（モデルごと）
- **エラー**（API呼び出し失敗など）
- **プロンプトとレスポンス**（`sendDefaultPii: true`により送信）

## 🔍 トラブルシューティング

### イベントが表示されない場合

1. **環境変数の確認**
   ```bash
   echo $NEXT_PUBLIC_SENTRY_DSN
   ```
   - DSNが正しく設定されているか確認

2. **Sentry設定の確認**
   - `sentry.client.config.ts`
   - `src/instrumentation.node.ts`
   - `src/instrumentation.edge.ts`
   - すべてに`sendDefaultPii: true`と`tracesSampleRate: 1.0`が設定されているか確認

3. **実際にLLMを呼び出す**
   - 設定だけではイベントは送信されません
   - 実際にOpenAI APIを呼び出す必要があります

4. **ネットワークの確認**
   - 開発環境では、Sentryへの送信がブロックされていないか確認
   - ブラウザの開発者ツールでネットワークリクエストを確認

### エージェントイベントが表示されない場合

- **Sentryのバージョン確認**: `@sentry/nextjs`が最新バージョンか確認
- **OpenAI SDKの使用確認**: OpenAI SDKを使用しているか確認（直接API呼び出しではなく）
- **実際の呼び出し確認**: テスト用のLLM呼び出しを実行

## 📝 実装されているLLM呼び出し箇所

以下のエンドポイントでOpenAI APIが呼び出されます：

1. **`/api/ai/chat`** - AIチャット機能
2. **`/api/ai/post-generation`** - 投稿生成機能
3. **`/api/ai/post-insight`** - 投稿インサイト機能
4. **`/api/ai/comment-reply`** - コメント返信機能
5. **`/api/ai/monthly-analysis`** - 月次分析機能
6. **`/api/analytics/ai-insight`** - 分析インサイト機能
7. **`/api/instagram/ai-strategy`** - AI戦略生成機能

これらのエンドポイントを呼び出すと、自動的にSentryにエージェントイベントが送信されます。

## 🎯 次のステップ

1. **実際にLLMを呼び出す**
   - アプリケーションでAI機能を使用
   - または、テスト用のAPI呼び出しを実行

2. **Sentryダッシュボードで確認**
   - 「Agents」タブでイベントを確認
   - コスト、レイテンシー、エラーを監視

3. **アラート設定**（オプション）
   - コストが一定額を超えた場合のアラート
   - エラー率が高い場合のアラート

## 🔗 参考リンク

- [Sentry Agent Monitoring Documentation](https://docs.sentry.io/product/agents/)
- [Sentry Next.js Integration](https://docs.sentry.io/platforms/javascript/guides/nextjs/)

