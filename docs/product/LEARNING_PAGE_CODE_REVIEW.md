# 学習ダッシュボードページ (/learning) コードレビュー

**レビュー日**: 2026年1月22日

## 概要

学習ダッシュボードページは、AIの学習状況、学習バッジ、投稿パターンの学習、学習履歴などを表示するページです。マスターコンテキストAPIを使用してデータを取得します。

## コード構造

### メインファイル
- `src/app/learning/page.tsx` (853行)

### コンポーネント
- `src/app/learning/components/InfoTooltip.tsx` - ツールチップ
- `src/app/learning/components/SuccessImprovementGallery.tsx` - 成功・改善ギャラリー
- `src/app/learning/components/PostPatternLearningSection.tsx` - 投稿パターン学習
- `src/app/learning/components/PostDeepDiveSection.tsx` - 投稿ディープダイブ
- `src/app/learning/components/HistorySection.tsx` - 履歴セクション

### 型定義
- `src/app/learning/types.ts` - 型定義

### API
- `src/app/api/learning/dashboard/route.ts` - BFF APIエンドポイント

## 主要機能

### 1. 学習コンテキスト表示
- マスターコンテキストサマリー
- スナップショット参照
- AI参照データ

### 2. 学習バッジ
- 15種類の学習バッジ表示
- 進捗状況の可視化

### 3. 学習進捗タイムライン
- 月次・週次のフィードバック量
- AI提案採用率の推移

### 4. 成功・改善投稿ギャラリー
- ゴールド投稿（成功）
- レッド投稿（改善優先）

### 5. 投稿パターン学習
- パターンタグごとの学習
- パターンシグナルの表示

### 6. 履歴
- フィードバック履歴
- アクション履歴

## コードレビュー結果

### ✅ 良い点

1. **コンポーネント分離**
   - 機能ごとにコンポーネントが適切に分離
   - 再利用性が高い

2. **型安全性**
   - 充実した型定義
   - TypeScriptを適切に活用

3. **データ可視化**
   - Rechartsを使用したグラフ表示
   - 視覚的に分かりやすい

4. **BFF APIパターン**
   - 学習データを1つのAPIで取得
   - フロントエンドの複雑性を削減

### ⚠️ 改善が必要な点

1. **未使用の変数・インポート**
   ```typescript
   const router = useRouter(); // 使用されていない
   const { userProfile, loading: profileLoading } = useUserProfile(); // userProfile, profileLoadingが使用されていない
   import type { AIReference, SnapshotReference } from "@/types/ai"; // 使用されていない
   ```
   - **対応**: 未使用のコードを削除

2. **未使用のユーティリティ**
   ```typescript
   const sentimentLabelMap, sentimentColorMap, ... // 定義されているが使用されていない
   ```
   - **対応**: 未使用のユーティリティを削除

3. **複雑な状態管理**
   - 多数の状態変数が定義されている
   - **対応**: 状態管理の整理を検討

4. **パフォーマンス**
   - 大量のデータをレンダリングする場合の最適化が必要
   - **対応**: メモ化や仮想スクロールの検討

## まとめ

学習ダッシュボードページは、AIの学習状況を可視化する充実した機能を持っています。主な改善点は、未使用コードの削除、状態管理の整理、パフォーマンス最適化です。

