# 月次レポートサマリーAPI

## エンドポイント
`GET /api/analytics/monthly-report-summary`

## パラメータ
- `period`: `"weekly" | "monthly"` (必須)
- `date`: `YYYY-MM` または `YYYY-WW` (必須)

## 使用コレクション

### 1. `analytics` コレクション
**クエリ**:
```typescript
adminDb.collection("analytics")
  .where("userId", "==", uid)
  .get()
```
- **インデックス**: 不要（単一フィールドクエリ）
- **取得データ**: 全分析データ（期間フィルタリングはクライアント側で実行）
- **用途**: メトリクス計算、統計分析

### 2. `posts` コレクション
**クエリ**:
```typescript
adminDb.collection("posts")
  .where("userId", "==", uid)
  .get()
```
- **インデックス**: 不要（単一フィールドクエリ）
- **取得データ**: 全投稿データ（期間フィルタリングはクライアント側で実行）
- **用途**: 投稿情報、ハッシュタグ統計、投稿タイプ統計

### 3. `ai_post_feedback` コレクション
**クエリ**:
```typescript
adminDb.collection("ai_post_feedback")
  .where("userId", "==", userId)
  .orderBy("createdAt", "desc")
  .limit(500)
  .get()
```
- **インデックス**: **必要** - `ai_post_feedback` コレクション
  - フィールド: `userId` (ASC), `createdAt` (DESC)
- **取得データ**: 最新500件のフィードバックデータ
- **用途**: フィードバック感情分析

### 4. `users/{userId}/postPerformanceSnapshots` サブコレクション
**クエリ**: `buildAIContext` 関数内で取得
```typescript
adminDb.collection("users")
  .doc(userId)
  .collection("postPerformanceSnapshots")
  .orderBy("createdAt", "desc")
  .limit(limit * 3)
  .get()
```
- **インデックス**: **必要** - `postPerformanceSnapshots` サブコレクション
  - フィールド: `createdAt` (DESC)
- **取得データ**: スナップショット参照（ゴールド/ネガティブ投稿）
- **用途**: パターンハイライト、学習コンテキスト

### 5. `ab_tests` コレクション
**クエリ**: `fetchAbTestSummaries` 関数内で取得
```typescript
adminDb.collection("ab_tests")
  .where("userId", "==", userId)
  .get()
```
- **インデックス**: 不要（単一フィールドクエリ）
- **取得データ**: 全A/Bテストデータ
- **用途**: A/Bテストサマリー

## データ処理フロー

1. **初期データ取得**
   - `analytics` コレクションから全データ取得
   - `posts` コレクションから全データ取得
   - `ai_post_feedback` コレクションから最新500件取得
   - `buildAIContext` 関数でスナップショットとA/Bテスト取得

2. **期間フィルタリング**（クライアント側）
   - `analytics` データを期間でフィルタリング
   - `posts` データを期間でフィルタリング

3. **統計計算**
   - 合計値計算（いいね、コメント、シェア、リーチなど）
   - 前月比計算
   - オーディエンス分析
   - リーチソース分析
   - ハッシュタグ統計
   - 時間帯分析
   - 投稿タイプ統計

4. **レスポンス生成**
   - サマリーデータをJSON形式で返却

## パフォーマンス課題

- **全件取得**: `analytics` と `posts` を全件取得してからクライアント側でフィルタリング
- **大量データ**: ユーザーのデータが増えるとパフォーマンスが低下
- **複数コレクション**: 5つのコレクションに同時アクセス

## 推奨改善

1. **サーバー側フィルタリング**: 期間フィルタリングをサーバー側で実行
2. **インデックス追加**: `ai_post_feedback` の複合インデックスを追加
3. **ページネーション**: 大量データの場合はページネーションを実装

