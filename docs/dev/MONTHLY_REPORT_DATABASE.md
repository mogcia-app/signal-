# 月次レポートページのデータベース・インデックス一覧

## 概要

月次レポートページ（`/instagram/monthly-report`）で使用されているFirestoreコレクション、クエリ、必要なインデックスを全てまとめました。

## 使用されているコレクション一覧

### 1. `analytics` コレクション
**用途**: 投稿の分析データ（いいね、コメント、シェア、リーチ、保存など）

#### クエリパターン

**パターン1: ユーザーIDのみで取得**
```typescript
// 場所: monthly-report-summary/route.ts:1324
adminDb.collection("analytics")
  .where("userId", "==", uid)
  .get()
```
- **インデックス**: 不要（単一フィールドクエリ）
- **使用箇所**: `/api/analytics/monthly-report-summary`

**パターン2: ユーザーID + publishedAtでソート**
```typescript
// 場所: monthly-analysis/route.ts:1091
adminDb.collection("analytics")
  .where("userId", "==", userId)
  .orderBy("publishedAt", "desc")
  .limit(120)
  .get()
```
- **インデックス**: **必要** - `analytics` コレクション
  - フィールド: `userId` (ASC), `publishedAt` (DESC)
- **使用箇所**: `/api/ai/monthly-analysis`

**パターン3: ユーザーID + createdAtでソート**
```typescript
// 場所: monthly-review/route.ts:349
adminDb.collection("analytics")
  .where("userId", "==", userId)
  .orderBy("createdAt", "desc")
  .limit(30)
  .get()
```
- **インデックス**: **必要** - `analytics` コレクション
  - フィールド: `userId` (ASC), `createdAt` (DESC)
- **使用箇所**: `/api/analytics/monthly-review`

**パターン4: ユーザーIDのみ（日別スコア用）**
```typescript
// 場所: daily-scores/route.ts:134
adminDb.collection("analytics")
  .where("userId", "==", uid)
  .get()
```
- **インデックス**: 不要（単一フィールドクエリ）
- **使用箇所**: `/api/analytics/daily-scores`

**パターン5: ユーザーIDのみ（アカウントスコア用）**
```typescript
// 場所: account-score/route.ts:123
adminDb.collection("analytics")
  .where("userId", "==", uid)
  .get()
```
- **インデックス**: 不要（単一フィールドクエリ）
- **使用箇所**: `/api/analytics/account-score`

### 2. `posts` コレクション
**用途**: 投稿データ（タイトル、コンテンツ、ハッシュタグ、投稿タイプなど）

#### クエリパターン

**パターン1: ユーザーIDのみで取得**
```typescript
// 場所: monthly-report-summary/route.ts:1389
adminDb.collection("posts")
  .where("userId", "==", uid)
  .get()
```
- **インデックス**: 不要（単一フィールドクエリ）
- **使用箇所**: `/api/analytics/monthly-report-summary`

**パターン2: ユーザーID + platform + createdAtでソート**
```typescript
// 場所: monthly-review/route.ts:325
adminDb.collection("posts")
  .where("userId", "==", userId)
  .where("platform", "==", "instagram")
  .orderBy("createdAt", "desc")
  .limit(10)
  .get()
```
- **インデックス**: **必要** - `posts` コレクション
  - フィールド: `userId` (ASC), `platform` (ASC), `createdAt` (DESC)
- **使用箇所**: `/api/analytics/monthly-review`

**パターン3: ユーザーID + createdAt範囲クエリ**
```typescript
// 場所: monthly-analysis/route.ts:2989
adminDb.collection("posts")
  .where("userId", "==", userId)
  .where("createdAt", ">=", startTs)
  .where("createdAt", "<", endTs)
  .get()
```
- **インデックス**: **必要** - `posts` コレクション
  - フィールド: `userId` (ASC), `createdAt` (ASC)
- **使用箇所**: `/api/ai/monthly-analysis`

**パターン4: ユーザーIDのみ（日別スコア用）**
```typescript
// 場所: daily-scores/route.ts:161
adminDb.collection("posts")
  .where("userId", "==", uid)
  .get()
```
- **インデックス**: 不要（単一フィールドクエリ）
- **使用箇所**: `/api/analytics/daily-scores`

### 3. `ai_post_feedback` コレクション
**用途**: AI生成のフィードバックデータ（感情分析、コメントなど）

#### クエリパターン

**パターン1: ユーザーID + createdAtでソート（月次レポートサマリー用）**
```typescript
// 場所: monthly-report-summary/route.ts:620
adminDb.collection("ai_post_feedback")
  .where("userId", "==", userId)
  .orderBy("createdAt", "desc")
  .limit(500)
  .get()
```
- **インデックス**: **必要** - `ai_post_feedback` コレクション
  - フィールド: `userId` (ASC), `createdAt` (DESC)
- **使用箇所**: `/api/analytics/monthly-report-summary`

**パターン2: ユーザーID + createdAtでソート（AI分析用）**
```typescript
// 場所: monthly-analysis/route.ts:1077
adminDb.collection("ai_post_feedback")
  .where("userId", "==", userId)
  .orderBy("createdAt", "desc")
  .limit(100)
  .get()
```
- **インデックス**: **必要** - `ai_post_feedback` コレクション
  - フィールド: `userId` (ASC), `createdAt` (DESC)
- **使用箇所**: `/api/ai/monthly-analysis`

**パターン3: ユーザーID + createdAtでソート（期間フィルタ用）**
```typescript
// 場所: monthly-analysis/route.ts:3039
adminDb.collection("ai_post_feedback")
  .where("userId", "==", userId)
  .orderBy("createdAt", "desc")
  .limit(200)
  .get()
```
- **インデックス**: **必要** - `ai_post_feedback` コレクション
  - フィールド: `userId` (ASC), `createdAt` (DESC)
- **使用箇所**: `/api/ai/monthly-analysis`

### 4. `ai_action_logs` コレクション
**用途**: AI生成のアクションプランのログ（適用状況、フィードバックなど）

#### クエリパターン

**パターン1: ユーザーID + updatedAtでソート（AI分析用）**
```typescript
// 場所: monthly-analysis/route.ts:1084
adminDb.collection("ai_action_logs")
  .where("userId", "==", userId)
  .orderBy("updatedAt", "desc")
  .limit(100)
  .get()
```
- **インデックス**: **必要** - `ai_action_logs` コレクション
  - フィールド: `userId` (ASC), `updatedAt` (DESC)
- **使用箇所**: `/api/ai/monthly-analysis`

**パターン2: ユーザーID + updatedAtでソート（期間フィルタ用）**
```typescript
// 場所: monthly-analysis/route.ts:3050
adminDb.collection("ai_action_logs")
  .where("userId", "==", userId)
  .orderBy("updatedAt", "desc")
  .limit(200)
  .get()
```
- **インデックス**: **必要** - `ai_action_logs` コレクション
  - フィールド: `userId` (ASC), `updatedAt` (DESC)
- **使用箇所**: `/api/ai/monthly-analysis`

**パターン3: ユーザーIDのみ（AIコンテキスト用）**
```typescript
// 場所: ai/context.ts:212
adminDb.collection("ai_action_logs")
  .where("userId", "==", userId)
  .limit(limit * 3)
  .get()
```
- **インデックス**: 不要（単一フィールドクエリ）
- **使用箇所**: `buildAIContext` 関数

**パターン4: ユーザーID + updatedAtでソート（アクションログAPI用）**
```typescript
// 場所: ai/action-logs/route.ts:74
adminDb.collection("ai_action_logs")
  .where("userId", "==", userId)
  .orderBy("updatedAt", "desc")
  .limit(limit * 2)
  .get()
```
- **インデックス**: **必要** - `ai_action_logs` コレクション
  - フィールド: `userId` (ASC), `updatedAt` (DESC)
- **使用箇所**: `/api/ai/action-logs`

### 5. `ai_overview_history` コレクション
**用途**: AI生成の概要履歴データ

#### クエリパターン

**パターン1: ユーザーID + period + createdAtでソート**
```typescript
// 場所: ai/overview-history/route.ts:44
adminDb.collection("ai_overview_history")
  .where("userId", "==", userId)
  .where("period", "==", period)
  .orderBy("createdAt", "desc")
  .limit(limit)
  .get()
```
- **インデックス**: **必要** - `ai_overview_history` コレクション
  - フィールド: `userId` (ASC), `period` (ASC), `createdAt` (DESC)
- **使用箇所**: `/api/ai/overview-history`

**パターン2: ユーザーID + createdAtでソート（AI分析用）**
```typescript
// 場所: monthly-analysis/route.ts:1070
adminDb.collection("ai_overview_history")
  .where("userId", "==", userId)
  .orderBy("createdAt", "desc")
  .limit(12)
  .get()
```
- **インデックス**: **必要** - `ai_overview_history` コレクション
  - フィールド: `userId` (ASC), `createdAt` (DESC)
- **使用箇所**: `/api/ai/monthly-analysis`

### 6. `ab_tests` コレクション
**用途**: A/Bテストの結果データ

#### クエリパターン

**パターン1: ユーザーIDのみで取得**
```typescript
// 場所: ai/context.ts:266
adminDb.collection("ab_tests")
  .where("userId", "==", userId)
  .get()
```
- **インデックス**: 不要（単一フィールドクエリ）
- **使用箇所**: `buildAIContext` 関数

**パターン2: ユーザーID + status（完了のみ）**
```typescript
// 場所: monthly-analysis/route.ts:1099
adminDb.collection("ab_tests")
  .where("userId", "==", userId)
  .where("status", "==", "completed")
  .limit(10)
  .get()
```
- **インデックス**: **必要** - `ab_tests` コレクション
  - フィールド: `userId` (ASC), `status` (ASC)
- **使用箇所**: `/api/ai/monthly-analysis`

**パターン3: ユーザーIDのみ（A/Bテストユーティリティ用）**
```typescript
// 場所: analytics/ab-test-utils.ts:38
adminDb.collection("ab_tests")
  .where("userId", "==", userId)
  .get()
```
- **インデックス**: 不要（単一フィールドクエリ）
- **使用箇所**: `fetchAbTestSummaries` 関数

### 7. `plans` コレクション
**用途**: 運用計画データ

#### クエリパターン

**パターン1: ユーザーID + snsType + status + createdAtでソート**
```typescript
// 場所: ai/context.ts:106
adminDb.collection("plans")
  .where("userId", "==", userId)
  .where("snsType", "==", "instagram")
  .where("status", "==", "active")
  .orderBy("createdAt", "desc")
  .limit(1)
  .get()
```
- **インデックス**: **必要** - `plans` コレクション
  - フィールド: `userId` (ASC), `snsType` (ASC), `status` (ASC), `createdAt` (DESC)
- **使用箇所**: `buildAIContext` 関数

**パターン2: ユーザーID + snsType + updatedAtでソート**
```typescript
// 場所: monthly-analysis/route.ts:2041
adminDb.collection("plans")
  .where("userId", "==", userId)
  .where("snsType", "==", snsType)
  .orderBy("updatedAt", "desc")
  .limit(12)
  .get()
```
- **インデックス**: **必要** - `plans` コレクション
  - フィールド: `userId` (ASC), `snsType` (ASC), `updatedAt` (DESC)
- **使用箇所**: `/api/ai/monthly-analysis`

**パターン3: ユーザーID + snsType + status + createdAtでソート（月次レビュー用）**
```typescript
// 場所: monthly-review/route.ts:304
adminDb.collection("plans")
  .where("userId", "==", userId)
  .where("snsType", "==", "instagram")
  .where("status", "==", "active")
  .orderBy("createdAt", "desc")
  .limit(1)
  .get()
```
- **インデックス**: **必要** - `plans` コレクション
  - フィールド: `userId` (ASC), `snsType` (ASC), `status` (ASC), `createdAt` (DESC)
- **使用箇所**: `/api/analytics/monthly-review`

### 8. `users` コレクション
**用途**: ユーザープロファイルデータ

#### クエリパターン

**パターン1: ユーザーIDでドキュメント取得**
```typescript
// 場所: ai/context.ts:95
adminDb.collection("users")
  .doc(userId)
  .get()
```
- **インデックス**: 不要（ドキュメント直接取得）
- **使用箇所**: `buildAIContext` 関数、`/api/analytics/monthly-review`

### 9. `users/{userId}/postPerformanceSnapshots` サブコレクション
**用途**: 投稿パフォーマンスのスナップショットデータ

#### クエリパターン

**パターン1: createdAtでソート**
```typescript
// 場所: ai/context.ts:132
adminDb.collection("users")
  .doc(userId)
  .collection("postPerformanceSnapshots")
  .orderBy("createdAt", "desc")
  .limit(limit * 3)
  .get()
```
- **インデックス**: **必要** - `postPerformanceSnapshots` サブコレクション
  - フィールド: `createdAt` (DESC)
- **使用箇所**: `fetchSnapshotReferences` 関数

**パターン2: updatedAtでソート（AI分析用）**
```typescript
// 場所: monthly-analysis/route.ts:1111
adminDb.collection("users")
  .doc(userId)
  .collection("postPerformanceSnapshots")
  .orderBy("updatedAt", "desc")
  .limit(25)
  .get()
```
- **インデックス**: **必要** - `postPerformanceSnapshots` サブコレクション
  - フィールド: `updatedAt` (DESC)
- **使用箇所**: `/api/ai/monthly-analysis`

### 10. `ai_master_context_cache` コレクション
**用途**: AIマスターコンテキストのキャッシュデータ

#### クエリパターン

**パターン1: ユーザーIDでドキュメント取得**
```typescript
// 場所: ai/context.ts:61
adminDb.collection("ai_master_context_cache")
  .doc(userId)
  .get()
```
- **インデックス**: 不要（ドキュメント直接取得）
- **使用箇所**: `fetchCachedMasterContext` 関数

### 11. `userSchedules` コレクション
**用途**: ユーザーのスケジュールデータ

#### クエリパターン

**パターン1: ユーザーIDでドキュメント取得**
```typescript
// 場所: monthly-analysis/route.ts:2130
adminDb.collection("userSchedules")
  .doc(userId)
  .get()
```
- **インデックス**: 不要（ドキュメント直接取得）
- **使用箇所**: `/api/ai/monthly-analysis`

## 必要なインデックス一覧

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

## 現在のインデックス設定

`firestore.indexes.json` には以下のインデックスのみが定義されています：

```json
{
  "indexes": [
    {
      "collectionGroup": "plans",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

**不足しているインデックス**: 上記の「必要なインデックス一覧」のほとんどが未定義です。

## クエリの複雑性

### 問題点

1. **複数のコレクションに同時アクセス**
   - 1つのAPI呼び出しで最大10個のコレクションにアクセス
   - 各コレクションで複数のクエリが実行される

2. **インデックス不足**
   - 多くの複合クエリがインデックスなしで実行されている可能性
   - パフォーマンス低下やエラーの原因になる可能性

3. **大量データの取得**
   - `ai_post_feedback`: 最大500件
   - `analytics`: 全件取得後にクライアント側でフィルタリング
   - `posts`: 全件取得後にクライアント側でフィルタリング

4. **クライアント側フィルタリング**
   - サーバー側で全件取得し、クライアント側で期間フィルタリング
   - 非効率的で、データ量が増えるとパフォーマンスが低下

## 推奨される改善

1. **インデックスの追加**
   - 上記の「必要なインデックス一覧」を全て追加

2. **サーバー側フィルタリング**
   - 期間フィルタリングをサーバー側で実行
   - 不要なデータの転送を削減

3. **クエリの最適化**
   - 複数のクエリを1つに統合
   - または、必要なデータのみを取得するようにクエリを最適化

4. **キャッシュの活用**
   - 頻繁にアクセスされるデータをキャッシュ
   - 既に一部のAPIでキャッシュが実装されているが、統一的な戦略が必要

