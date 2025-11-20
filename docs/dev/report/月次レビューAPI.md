# 月次レビューAPI

## エンドポイント
`GET /api/analytics/monthly-review`

## パラメータ
- `currentScore`: 現在のスコア（必須）
- `previousScore`: 前月のスコア（必須）
- `performanceRating`: パフォーマンス評価（デフォルト: `"C"`）

## 使用コレクション

### 1. `users` コレクション
**クエリ**:
```typescript
adminDb.collection("users")
  .doc(userId)
  .get()
```
- **インデックス**: 不要（ドキュメント直接取得）
- **取得データ**: ユーザープロファイル
- **用途**: AI生成のコンテキスト

### 2. `plans` コレクション
**クエリ**:
```typescript
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
- **取得データ**: 最新のアクティブな運用計画
- **用途**: AI生成のコンテキスト（PDCA - Plan）

### 3. `posts` コレクション
**クエリ**:
```typescript
adminDb.collection("posts")
  .where("userId", "==", userId)
  .where("platform", "==", "instagram")
  .orderBy("createdAt", "desc")
  .limit(10)
  .get()
```
- **インデックス**: **必要** - `posts` コレクション
  - フィールド: `userId` (ASC), `platform` (ASC), `createdAt` (DESC)
- **取得データ**: 最新10件の投稿
- **用途**: AI生成のコンテキスト（PDCA - Do）

### 4. `analytics` コレクション
**クエリ**:
```typescript
adminDb.collection("analytics")
  .where("userId", "==", userId)
  .orderBy("createdAt", "desc")
  .limit(30)
  .get()
```
- **インデックス**: **必要** - `analytics` コレクション
  - フィールド: `userId` (ASC), `createdAt` (DESC)
- **取得データ**: 最新30件の分析データ
- **用途**: AI生成のコンテキスト（PDCA - Check）

## データ処理フロー

1. **データ取得**
   - ユーザープロファイル取得
   - 運用計画取得
   - 最新投稿取得
   - 最新分析データ取得

2. **統計計算**
   - 総エンゲージメント数計算
   - 平均エンゲージメント率計算

3. **AI生成**（PDCA - Act）
   - OpenAI APIを使用して月次レビューを生成
   - フォールバック: AI生成に失敗した場合は事前定義されたメッセージを使用

4. **キャッシュ**
   - 24時間キャッシュ（`cache.set(cacheKey, result, 24 * 60 * 60 * 1000)`）

5. **レスポンス生成**
   - タイトル、メッセージ、スコア差分をJSON形式で返却

## パフォーマンス課題

- **複数コレクション**: 4つのコレクションにアクセス
- **AI生成**: OpenAI API呼び出し（レイテンシーが高い）
- **インデックス不足**: 複数の複合インデックスが必要

## 推奨改善

1. **インデックス追加**: 必要な複合インデックスを追加
2. **キャッシュ最適化**: AI生成結果をより長期間キャッシュ
3. **並列取得**: 複数コレクションの取得を並列化（既に実装済み）

