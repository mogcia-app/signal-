# ホームページ (/home) コードレビュー

**レビュー日**: 2026年1月22日

## 概要

ホームページは、ユーザーのアカウント指標とKPIサマリーを表示・管理するダッシュボードです。BFF API（`/api/home/dashboard`）を使用して、複数のデータソースを統合して表示します。

## コード構造

### メインファイル
- `src/app/home/page.tsx` (595行)

### コンポーネント
- `src/app/home/components/KPISummaryCard.tsx` - KPIサマリー表示
- `src/app/home/components/LastMonthReview.tsx` - 先月レビュー表示（未使用）
- `src/app/home/components/TodayTasksCard.tsx` - 今日のタスク表示（未使用）
- `src/app/home/components/MonthlyGoalsCard.tsx` - 月次目標表示（未使用）

### API
- `src/app/api/home/dashboard/route.ts` - BFF APIエンドポイント

## 主要機能

### 1. アカウント指標管理
- **フォロワー数入力・保存**: 月ごとのフォロワー数を記録
- **プロフィールアクセス数**: 投稿に紐づかない全体のプロフィール閲覧数を記録
- **外部リンクタップ数**: 投稿に紐づかない外部リンクタップ数を記録
- 最終更新日時の表示

### 2. KPIサマリー表示
- 月次KPIサマリーをカード形式で表示
- KPIドリルダウンページへのリンク
- 前月比の増減率表示

### 3. アクションプラン表示・管理
- 先月の月次レポートから生成されたアクションプランを表示
- チェックボックスでアクションプランの採用/解除が可能
- アクションログAPIで状態を保存

## コードレビュー結果

### ✅ 良い点

1. **BFF APIパターンの採用**
   - 複数のAPIコールを1つのエンドポイントに統合
   - フロントエンドの複雑性を削減
   - データ取得の効率化

2. **型安全性**
   - TypeScriptインターフェースを適切に定義
   - `ActionPlan`, `KPIBreakdown` などの型定義が明確

3. **React Hooksの適切な使用**
   - `useCallback`で`fetchDashboardData`をメモ化
   - `useMemo`で認証状態をメモ化
   - すべてのHooksを早期リターンの前に定義（React Rules準拠）

4. **レスポンシブデザイン**
   - モバイル・タブレット・デスクトップに対応
   - Tailwind CSSのブレークポイントを適切に使用

5. **エラーハンドリング**
   - `try-catch`で適切にエラーをキャッチ
   - `notify`関数でユーザーにエラーを通知

6. **月の自動更新機能**
   - `useEffect`で月の変更を監視
   - `visibilitychange`と`focus`イベントで自動更新

### ⚠️ 改善が必要な点

1. **未使用のコンポーネント**
   - `LastMonthReview.tsx`, `TodayTasksCard.tsx`, `MonthlyGoalsCard.tsx` がインポートされているが使用されていない
   - **対応**: 未使用のコンポーネントを削除するか、機能として実装する

2. **データ取得の重複ロジック**
   ```typescript
   // プロフィールアクセス数と外部リンクタップ数の保存時に、
   // 既存データを取得するロジックが重複
   const getResponse = await authFetch(`/api/follower-counts?month=${currentMonth}&snsType=instagram`);
   ```
   - **対応**: 共通のヘルパー関数に抽出

3. **型定義の重複**
   - `ActionPlan`インターフェースがページ内で定義されているが、共有型として定義すべき
   - **対応**: `types`ディレクトリに移動

4. **エラーメッセージのハードコーディング**
   ```typescript
   notify({ type: "error", message: "フォロワー数は0以上の数値を入力してください" });
   ```
   - **対応**: 定数ファイルに移動して一元管理

5. **マークダウン削除関数のパフォーマンス**
   ```typescript
   const removeMarkdown = (text: string): string => {
     // 複数のreplace呼び出し
   }
   ```
   - **対応**: 正規表現を最適化するか、ライブラリ（`remove-markdown`等）を使用

6. **月の変更監視の最適化**
   - 現在、`visibilitychange`と`focus`イベントの両方で監視
   - 5分間隔のポーリングと重複している可能性
   - **対応**: 監視ロジックを見直し

### 🔧 推奨される改善

1. **カスタムフックの抽出**
   ```typescript
   // useFollowerCount.ts
   export const useFollowerCount = (month: string) => {
     // フォロワー数関連のロジックをまとめる
   }
   ```

2. **フォームバリデーションの強化**
   - 数値入力のバリデーションを共通コンポーネント化
   - エラーメッセージの一貫性向上

3. **ローディング状態の最適化**
   - 複数の`isLoading`状態を1つのオブジェクトにまとめる
   ```typescript
   const loading = {
     dashboard: false,
     followerCount: false,
     profileVisits: false,
     externalLinkTaps: false,
   }
   ```

4. **アクセシビリティの向上**
   - 入力フィールドに`aria-label`を追加
   - ボタンに`disabled`時の説明を追加

## パフォーマンス

- ✅ 初期データ取得はBFF APIで最適化されている
- ✅ `useCallback`で関数の再生成を防止
- ⚠️ 未使用コンポーネントのインポートがバンドルサイズに影響する可能性

## セキュリティ

- ✅ `requireAuthContext`で認証チェック
- ✅ `canAccessFeature`で機能アクセス制御
- ✅ ユーザーIDでデータをフィルタリング

## 依存関係

- `next/navigation` - Next.jsルーティング
- `lucide-react` - アイコン
- `../../utils/authFetch` - 認証付きHTTPリクエスト
- `@/lib/api` - APIクライアント
- `../../lib/ui/notifications` - 通知システム

## まとめ

ホームページは全体的によく設計されており、BFFパターンや型安全性が適切に実装されています。主な改善点は、未使用コンポーネントの削除、重複ロジックの抽出、カスタムフックへの分割です。機能としての完成度は高く、ユーザー体験も良好です。

