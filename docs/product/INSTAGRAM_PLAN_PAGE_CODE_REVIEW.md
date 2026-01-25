# 運用計画ページ (/instagram/plan) コードレビュー

**レビュー日**: 2026年1月22日

## 概要

運用計画ページは、Instagram運用計画の作成、シミュレーション実行、AI戦略提案を行うページです。カスタムフックを使用して状態管理を行い、複雑なフォーム処理を実装しています。

## コード構造

### メインファイル
- `src/app/instagram/plan/page.tsx` (655行)

### カスタムフック
- `src/app/instagram/plan/hooks/usePlanForm.ts` - フォーム状態管理
- `src/app/instagram/plan/hooks/useSimulation.ts` - シミュレーション実行
- `src/app/instagram/plan/hooks/useAIDiagnosis.ts` - AI診断処理

### コンポーネント
- `src/app/instagram/plan/components/PlanForm.tsx` - 計画作成フォーム
- `src/app/instagram/plan/components/SimulationPanel.tsx` - シミュレーション結果表示
- `src/app/instagram/plan/components/AIDiagnosisPanel.tsx` - AI戦略提案表示

### 型定義
- `src/app/instagram/plan/types/plan.ts` - 型定義

## 主要機能

### 1. 計画作成
- フォロワー数・目標・期間などの入力
- 戦略・カテゴリの選択
- 計画の保存・読み込み

### 2. シミュレーション
- 目標達成シミュレーションの実行
- 週次・月次の投稿計画表示
- シミュレーション結果の保存

### 3. AI戦略提案
- AIによる運用戦略の生成
- 戦略の保存・反映

## コードレビュー結果

### ✅ 良い点

1. **カスタムフックの適切な使用**
   - 状態管理ロジックをフックに分離
   - 再利用性とテスタビリティの向上

2. **型安全性**
   - TypeScriptの型定義が充実
   - `PlanFormData`, `SimulationResult` などの明確な型定義

3. **計画期間の自動リセット**
   - `useEffect`で期間切れを定期的にチェック
   - 自動リセット機能が実装されている

4. **URLパラメータ対応**
   - URLパラメータから初期値を設定可能
   - 他ページからの遷移時にデータを受け取れる

5. **タブUI**
   - シミュレーションとAI戦略をタブで切り替え
   - UIが整理されている

### ⚠️ 改善が必要な点

1. **未使用の変数**
   ```typescript
   const router = useRouter(); // 使用されていない
   const { userProfile, loading: profileLoading } = useUserProfile(); // userProfile, profileLoadingが使用されていない
   ```
   - **対応**: 未使用の変数を削除

2. **コメントアウトされたコード**
   ```typescript
   // const [analyticsData, setAnalyticsData] = useState<Array<{...}>>([])
   // import { CurrentGoalPanel } from './components/CurrentGoalPanel'
   ```
   - **対応**: 不要なコードを削除

3. **fetchAnalytics関数の未使用**
   ```typescript
   const fetchAnalytics = useCallback(async () => {
     // 実装されているが、結果が使用されていない
   }, [isAuthReady]);
   ```
   - **対応**: 使用されていない場合は削除

4. **エラーハンドリングの不統一**
   - 一部のエラーが`console.error`のみ
   - ユーザーへの通知がない場合がある
   - **対応**: エラーハンドリングを統一

5. **型定義の重複**
   - `PlanFormData`などが複数箇所で定義されている可能性
   - **対応**: 型定義を一元管理

6. **フォームバリデーション**
   - 入力値の検証が不十分な可能性
   - **対応**: バリデーションロジックの強化

### 🔧 推奨される改善

1. **フォーム状態管理の最適化**
   - 大量のフォームフィールドを管理
   - フォームライブラリ（react-hook-form等）の導入を検討

2. **ローディング状態の統一**
   - 複数のローディング状態を1つのオブジェクトにまとめる

3. **エラーメッセージの国際化**
   - ハードコーディングされたメッセージを定数化

4. **アクセシビリティの向上**
   - フォームフィールドに適切なラベル
   - エラーメッセージのaria属性

## パフォーマンス

- ✅ `useCallback`で関数の再生成を防止
- ✅ `useMemo`で計算結果をメモ化
- ⚠️ 大量のフォームフィールドによる再レンダリングの可能性

## セキュリティ

- ✅ `requireAuthContext`で認証チェック
- ✅ `canAccessFeature`で機能アクセス制御
- ✅ ユーザーIDでデータをフィルタリング

## 依存関係

- `next/navigation` - Next.jsルーティング
- `lucide-react` - アイコン
- `../../utils/authFetch` - 認証付きHTTPリクエスト
- カスタムフック群

## まとめ

運用計画ページは、カスタムフックによる適切な状態管理が実装されており、機能としては完成度が高いです。主な改善点は、未使用コードの削除、エラーハンドリングの統一、フォームバリデーションの強化です。


