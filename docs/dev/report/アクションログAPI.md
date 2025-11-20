# アクションログAPI

## エンドポイント
- `GET /api/ai/action-logs` - アクションログ取得
- `POST /api/ai/action-logs` - アクションログ保存

## パラメータ（GET）
- `userId`: ユーザーID（必須）
- `period`: 期間フィルタ（オプション）
- `limit`: 取得件数（デフォルト: `20`, 最大: `100`）

## 使用コレクション

### 1. `ai_action_logs` コレクション
**クエリ（GET）**:
```typescript
adminDb.collection("ai_action_logs")
  .where("userId", "==", userId)
  .orderBy("updatedAt", "desc")
  .limit(limit * 2)
  .get()
```
- **インデックス**: **必要** - `ai_action_logs` コレクション
  - フィールド: `userId` (ASC), `updatedAt` (DESC)
- **取得データ**: 最新のアクションログ（期間フィルタリングはクライアント側で実行）
- **用途**: アクションログ一覧表示

**書き込み（POST）**:
```typescript
adminDb.collection("ai_action_logs")
  .doc(`${userId}_${actionId}`)
  .set({ ... }, { merge: true })
```
- **インデックス**: 不要（ドキュメント直接書き込み）
- **用途**: アクションログの保存・更新

## データ処理フロー（GET）

1. **データ取得**
   - `ai_action_logs` コレクションから最新のログを取得（`limit * 2` 件）

2. **期間フィルタリング**（クライアント側）
   - `period` パラメータがある場合はフィルタリング

3. **データ変換**
   - FirestoreのタイムスタンプをISO文字列に変換

4. **レスポンス生成**
   - フィルタリング後のログデータをJSON形式で返却（最大 `limit` 件）

## データ処理フロー（POST）

1. **バリデーション**
   - `userId` と `actionId` が必須

2. **データ保存**
   - `ai_action_logs` コレクションに保存（`merge: true` で更新）

3. **レスポンス生成**
   - 成功/失敗をJSON形式で返却

## パフォーマンス課題

- **インデックス不足**: 複合インデックスが必要
- **クライアント側フィルタリング**: 期間フィルタリングをクライアント側で実行
- **過剰取得**: `limit * 2` 件取得してからフィルタリング

## 推奨改善

1. **インデックス追加**: 必要な複合インデックスを追加
2. **サーバー側フィルタリング**: 期間フィルタリングをサーバー側で実行
3. **取得件数最適化**: 必要な件数のみ取得

