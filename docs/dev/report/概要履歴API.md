# 概要履歴API

## エンドポイント
`GET /api/ai/overview-history`

## パラメータ
- `userId`: ユーザーID（必須）
- `period`: `"weekly" | "monthly"` (デフォルト: `"monthly"`)
- `limit`: 取得件数（デフォルト: `6`, 最大: `12`）

## 使用コレクション

### 1. `ai_overview_history` コレクション
**クエリ**:
```typescript
adminDb.collection("ai_overview_history")
  .where("userId", "==", userId)
  .where("period", "==", period)
  .orderBy("createdAt", "desc")
  .limit(limit)
  .get()
```
- **インデックス**: **必要** - `ai_overview_history` コレクション
  - フィールド: `userId` (ASC), `period` (ASC), `createdAt` (DESC)
- **取得データ**: 指定期間の概要履歴
- **用途**: 過去のレポート履歴表示

## データ処理フロー

1. **データ取得**
   - `ai_overview_history` コレクションから指定期間の履歴を取得

2. **データ変換**
   - FirestoreのタイムスタンプをISO文字列に変換

3. **レスポンス生成**
   - 履歴データをJSON形式で返却

## パフォーマンス課題

- **インデックス不足**: 複合インデックスが必要

## 推奨改善

1. **インデックス追加**: 必要な複合インデックスを追加

