# 月次レポートAPIルート一覧

このフォルダには、月次レポートページで使用されている各APIルートの詳細ドキュメントが含まれています。

## APIルート一覧

1. **[月次レポートサマリーAPI](./月次レポートサマリーAPI.md)**
   - エンドポイント: `GET /api/analytics/monthly-report-summary`
   - 用途: 月次レポートの主要なサマリーデータを取得

2. **[アカウントスコアAPI](./アカウントスコアAPI.md)**
   - エンドポイント: `GET /api/analytics/account-score`
   - 用途: アカウントスコアとランク評価を取得

3. **[日別スコアAPI](./日別スコアAPI.md)**
   - エンドポイント: `GET /api/analytics/daily-scores`
   - 用途: 過去N日間の日別スコアデータを取得

4. **[月次レビューAPI](./月次レビューAPI.md)**
   - エンドポイント: `GET /api/analytics/monthly-review`
   - 用途: AI生成の月次レビューメッセージを取得

5. **[AI月次分析API](./AI月次分析API.md)**
   - エンドポイント: `GET /api/ai/monthly-analysis`
   - 用途: AI生成の詳細な月次分析を取得

6. **[概要履歴API](./概要履歴API.md)**
   - エンドポイント: `GET /api/ai/overview-history`
   - 用途: 過去のレポート概要履歴を取得

7. **[アクションログAPI](./アクションログAPI.md)**
   - エンドポイント: `GET /api/ai/action-logs`, `POST /api/ai/action-logs`
   - 用途: アクションログの取得・保存

## 各ドキュメントの構成

各APIルートのドキュメントには以下の情報が含まれています：

- **エンドポイント**: APIのURLとHTTPメソッド
- **パラメータ**: リクエストパラメータの説明
- **使用コレクション**: アクセスするFirestoreコレクション
  - クエリパターン
  - 必要なインデックス
  - 取得データの説明
- **データ処理フロー**: データ取得からレスポンス生成までの流れ
- **パフォーマンス課題**: 現在の問題点
- **推奨改善**: 改善提案

## インデックス要件のまとめ

### 必須インデックス（複合クエリ）

1. **`analytics` コレクション**
   - `userId` (ASC) + `publishedAt` (DESC)
   - `userId` (ASC) + `createdAt` (DESC)

2. **`posts` コレクション**
   - `userId` (ASC) + `platform` (ASC) + `createdAt` (DESC)
   - `userId` (ASC) + `createdAt` (ASC)

3. **`ai_post_feedback` コレクション**
   - `userId` (ASC) + `createdAt` (DESC)

4. **`ai_action_logs` コレクション**
   - `userId` (ASC) + `updatedAt` (DESC)

5. **`ai_overview_history` コレクション**
   - `userId` (ASC) + `period` (ASC) + `createdAt` (DESC)
   - `userId` (ASC) + `createdAt` (DESC)

6. **`ab_tests` コレクション**
   - `userId` (ASC) + `status` (ASC)

7. **`plans` コレクション**
   - `userId` (ASC) + `snsType` (ASC) + `status` (ASC) + `createdAt` (DESC)
   - `userId` (ASC) + `snsType` (ASC) + `updatedAt` (DESC)

8. **`postPerformanceSnapshots` サブコレクション**
   - `createdAt` (DESC)
   - `updatedAt` (DESC)

## 関連ドキュメント

- [月次レポートページの複雑性分析](../MONTHLY_REPORT_COMPLEXITY.md)
- [月次レポートページのデータベース・インデックス一覧](../MONTHLY_REPORT_DATABASE.md)

