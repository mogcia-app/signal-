# AI月次分析API

## エンドポイント
`GET /api/ai/monthly-analysis`

## パラメータ
- `period`: `"weekly" | "monthly"` (必須)
- `date`: `YYYY-MM` または `YYYY-WW` (必須)
- `userId`: ユーザーID（必須）

## 使用コレクション

### 1. `ai_master_context_cache` コレクション
**クエリ**:
```typescript
adminDb.collection("ai_master_context_cache")
  .doc(userId)
  .get()
```
- **インデックス**: 不要（ドキュメント直接取得）
- **取得データ**: マスターコンテキストキャッシュ（TTL: 5分）
- **用途**: 学習フェーズ、RAGヒット率、フィードバック統計など

### 2. `ai_overview_history` コレクション
**クエリ**:
```typescript
adminDb.collection("ai_overview_history")
  .where("userId", "==", userId)
  .orderBy("createdAt", "desc")
  .limit(12)
  .get()
```
- **インデックス**: **必要** - `ai_overview_history` コレクション
  - フィールド: `userId` (ASC), `createdAt` (DESC)
- **取得データ**: 最新12件の概要履歴
- **用途**: 学習タイムライン、トレンド分析

### 3. `ai_post_feedback` コレクション
**クエリ**:
```typescript
adminDb.collection("ai_post_feedback")
  .where("userId", "==", userId)
  .orderBy("createdAt", "desc")
  .limit(100)
  .get()
```
- **インデックス**: **必要** - `ai_post_feedback` コレクション
  - フィールド: `userId` (ASC), `createdAt` (DESC)
- **取得データ**: 最新100件のフィードバック
- **用途**: フィードバック統計、感情分析

### 4. `ai_action_logs` コレクション
**クエリ**:
```typescript
adminDb.collection("ai_action_logs")
  .where("userId", "==", userId)
  .orderBy("updatedAt", "desc")
  .limit(100)
  .get()
```
- **インデックス**: **必要** - `ai_action_logs` コレクション
  - フィールド: `userId` (ASC), `updatedAt` (DESC)
- **取得データ**: 最新100件のアクションログ
- **用途**: アクション統計、採用率計算

### 5. `analytics` コレクション
**クエリ**:
```typescript
adminDb.collection("analytics")
  .where("userId", "==", userId)
  .orderBy("publishedAt", "desc")
  .limit(120)
  .get()
```
- **インデックス**: **必要** - `analytics` コレクション
  - フィールド: `userId` (ASC), `publishedAt` (DESC)
- **取得データ**: 最新120件の分析データ
- **用途**: 投稿パフォーマンス分析、クラスタリング

### 6. `ab_tests` コレクション
**クエリ**:
```typescript
adminDb.collection("ab_tests")
  .where("userId", "==", userId)
  .where("status", "==", "completed")
  .limit(10)
  .get()
```
- **インデックス**: **必要** - `ab_tests` コレクション
  - フィールド: `userId` (ASC), `status` (ASC)
- **取得データ**: 完了したA/Bテスト10件
- **用途**: A/Bテスト結果分析

### 7. `users/{userId}/postPerformanceSnapshots` サブコレクション
**クエリ**:
```typescript
adminDb.collection("users")
  .doc(userId)
  .collection("postPerformanceSnapshots")
  .orderBy("updatedAt", "desc")
  .limit(25)
  .get()
```
- **インデックス**: **必要** - `postPerformanceSnapshots` サブコレクション
  - フィールド: `updatedAt` (DESC)
- **取得データ**: 最新25件のスナップショット
- **用途**: ゴールド/ネガティブ投稿分析

### 8. `plans` コレクション
**クエリ**:
```typescript
adminDb.collection("plans")
  .where("userId", "==", userId)
  .where("snsType", "==", snsType)
  .orderBy("updatedAt", "desc")
  .limit(12)
  .get()
```
- **インデックス**: **必要** - `plans` コレクション
  - フィールド: `userId` (ASC), `snsType` (ASC), `updatedAt` (DESC)
- **取得データ**: 最新12件の運用計画
- **用途**: 運用計画の振り返り（PDCA）

### 9. `userSchedules` コレクション
**クエリ**:
```typescript
adminDb.collection("userSchedules")
  .doc(userId)
  .get()
```
- **インデックス**: 不要（ドキュメント直接取得）
- **取得データ**: ユーザースケジュール
- **用途**: 投稿スケジュール分析

### 10. `posts` コレクション
**クエリ**:
```typescript
adminDb.collection("posts")
  .where("userId", "==", userId)
  .where("createdAt", ">=", startTs)
  .where("createdAt", "<", endTs)
  .get()
```
- **インデックス**: **必要** - `posts` コレクション
  - フィールド: `userId` (ASC), `createdAt` (ASC)
- **取得データ**: 期間内の投稿データ
- **用途**: 期間内の投稿分析

### 11. `ai_post_feedback` コレクション（期間フィルタ用）
**クエリ**:
```typescript
adminDb.collection("ai_post_feedback")
  .where("userId", "==", userId)
  .orderBy("createdAt", "desc")
  .limit(200)
  .get()
```
- **インデックス**: **必要** - `ai_post_feedback` コレクション
  - フィールド: `userId` (ASC), `createdAt` (DESC)
- **取得データ**: 最新200件のフィードバック（期間フィルタリングはクライアント側）
- **用途**: 期間内のフィードバック分析

### 12. `ai_action_logs` コレクション（期間フィルタ用）
**クエリ**:
```typescript
adminDb.collection("ai_action_logs")
  .where("userId", "==", userId)
  .orderBy("updatedAt", "desc")
  .limit(200)
  .get()
```
- **インデックス**: **必要** - `ai_action_logs` コレクション
  - フィールド: `userId` (ASC), `updatedAt` (DESC)
- **取得データ**: 最新200件のアクションログ（期間フィルタリングはクライアント側）
- **用途**: 期間内のアクション分析

## データ処理フロー

1. **マスターコンテキスト取得**
   - キャッシュから取得（TTL: 5分）
   - キャッシュがない場合は新規生成

2. **履歴データ取得**
   - 概要履歴、フィードバック、アクションログを並列取得

3. **分析データ取得**
   - 分析データ、A/Bテスト、スナップショットを並列取得

4. **運用計画取得**
   - 最新の運用計画を取得

5. **期間データ取得**
   - 期間内の投稿、フィードバック、アクションログを取得

6. **統計計算**
   - 月次/週次タイムライン生成
   - フィードバック統計計算
   - アクション統計計算
   - 投稿パフォーマンス分析

7. **AI生成**
   - OpenAI APIを使用して月次分析を生成
   - PDCAメトリクス、アラート、投稿タイプハイライト、運用計画の振り返りを生成

8. **履歴保存**
   - `ai_overview_history` コレクションに保存

9. **レスポンス生成**
   - AI分析結果をJSON形式で返却

## パフォーマンス課題

- **大量コレクション**: 12個のコレクションにアクセス
- **複合インデックス**: 多数の複合インデックスが必要
- **AI生成**: OpenAI API呼び出し（レイテンシーが高い）
- **クライアント側フィルタリング**: 期間フィルタリングをクライアント側で実行

## 推奨改善

1. **インデックス追加**: 必要な複合インデックスを全て追加
2. **サーバー側フィルタリング**: 期間フィルタリングをサーバー側で実行
3. **キャッシュ最適化**: マスターコンテキストのキャッシュを最適化
4. **並列取得**: 複数コレクションの取得を並列化（既に一部実装済み）

