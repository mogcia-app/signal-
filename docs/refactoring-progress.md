# 状態管理とコンポーネント分割の進捗

作成日: 2026-01-30

## 完了した作業

### 1. Zustandの導入 ✅
- `npm install zustand` を実行
- 状態管理ライブラリとしてZustandを採用

### 2. ホームページ (`/home`) のリファクタリング ✅

#### 状態管理の統一
- **Zustandストア作成**: `src/stores/home-store.ts`
  - 13個の`useState`を1つのストアに集約
  - データ取得関数（`fetchDashboard`, `fetchAiSections`, `fetchOtherKPI`）をストアに集約
  - 型定義を明確化（`DashboardData`, `AISection`）

#### コンポーネント分割
- **メインページ**: 875行 → **204行**（約77%削減）
- **6つのセクションコンポーネントを作成**:
  1. `WeeklyKPISection.tsx` - 週次KPI表示
  2. `TodayTasksSection.tsx` - 今日やること
  3. `TomorrowPreparationSection.tsx` - 明日の準備
  4. `MonthlyGoalsSection.tsx` - 今月の目標
  5. `WeeklyScheduleSection.tsx` - 今週の予定
  6. `OtherKPISection.tsx` - その他KPI入力

#### 改善効果
- ✅ コードの可読性が大幅に向上
- ✅ コンポーネントの再利用性が向上
- ✅ 状態管理が一元化され、デバッグが容易に
- ✅ テストが書きやすくなった

### 3. 運用計画ページ (`/instagram/plan`) のリファクタリング ✅

#### 状態管理の統一
- **Zustandストア作成**: `src/stores/plan-store.ts` (581行)
  - 11個の`useState`を1つのストアに集約
  - データ取得・操作関数をストアに集約:
    - `loadLatestPlan` - 計画の読み込み（複雑なロジックを整理）
    - `submitPlan` - 計画の送信とシミュレーション実行
    - `deletePlan` - 計画の削除
    - `selectAlternative` - 代替案の選択
    - `startPlan` - 計画の開始・保存
  - 型定義を明確化（`PlanFormData`, `SimulationResult`, `AIPlanSuggestion`）

#### コンポーネント分割
- **メインページ**: 778行 → **201行**（約74%削減）
- **2つの新規コンポーネントを作成**:
  1. `PlanTabs.tsx` - タブUIと編集・削除ボタン
  2. `PlanErrorDisplay.tsx` - エラー表示

#### 改善効果
- ✅ 複雑な`loadLatestPlan`関数（約240行）をストアに移動し、可読性が向上
- ✅ 状態管理が一元化され、デバッグが容易に
- ✅ タブUIとエラー表示が独立したコンポーネントになり、再利用性が向上
- ✅ データ取得・操作ロジックがストアに集約され、テストが書きやすくなった

### 4. フィード投稿ラボ (`/instagram/lab/feed`) のリファクタリング ✅

### 5. 投稿一覧ページ (`/instagram/posts`) のリファクタリング ✅

### 6. リール投稿ラボ (`/instagram/lab/reel`) のリファクタリング ✅

#### 状態管理の統一
- **Zustandストア作成**: `src/stores/reel-lab-store.ts` (462行)
  - 約18個の`useState`を1つのストアに集約
  - データ取得・操作関数をストアに集約:
    - `fetchPostData` - 投稿データの取得
    - `generateSchedule` - スケジュール生成
    - `saveSchedule` - スケジュール保存
    - `loadSavedSchedule` - 保存されたスケジュールの読み込み
    - `generateVideoStructure` - 動画構成生成（リール特有）
  - フィードバック履歴管理をストア内で一元化
  - 型定義を明確化（`VideoStructure`, `BusinessInfoResponse`など）

#### 改善効果
- ✅ 複雑なスケジュール生成・動画構成生成ロジックをストアに移動し、可読性が向上
- ✅ フィードバック履歴管理をストア内で一元化し、コードの重複を削減
- ✅ 状態管理が一元化され、デバッグが容易に
- ✅ データ取得・操作ロジックがストアに集約され、テストが書きやすくなった

### 7. ストーリー投稿ラボ (`/instagram/lab/story`) のリファクタリング ✅

#### 状態管理の統一
- **Zustandストア作成**: `src/stores/story-lab-store.ts` (518行)
  - 約20個の`useState`を1つのストアに集約
  - データ取得・操作関数をストアに集約:
    - `fetchPostData` - 投稿データの取得
    - `generateSchedule` - スケジュール生成
    - `saveSchedule` - スケジュール保存
    - `loadSavedSchedule` - 保存されたスケジュールの読み込み
    - `generateImageVideoSuggestions` - AIヒント生成
  - フィードバック履歴管理をストア内で一元化
  - 型定義を明確化（`AIHintSuggestion`, `BusinessInfoResponse`など）

#### 改善効果
- ✅ 複雑なスケジュール生成・AIヒント生成ロジックをストアに移動し、可読性が向上
- ✅ フィードバック履歴管理をストア内で一元化し、コードの重複を削減
- ✅ 状態管理が一元化され、デバッグが容易に
- ✅ データ取得・操作ロジックがストアに集約され、テストが書きやすくなった

#### 状態管理の統一
- **Zustandストア作成**: `src/stores/posts-store.ts` (383行)
  - 9個の`useState`を1つのストアに集約
  - データ取得・操作関数をストアに集約:
    - `fetchPosts` - 投稿一覧と分析データの取得
    - `deletePost` - 投稿削除
    - `deleteManualAnalytics` - 手動入力分析データ削除
  - 計算プロパティをストア内で提供:
    - `getManualAnalyticsData` - 手動入力分析データの取得
    - `getTabCounts` - タブの投稿数計算
    - `getFilteredPosts` - フィルタリングされた投稿の取得
  - 型定義を明確化（`PostData`, `AnalyticsData`）

#### コンポーネント分割
- **メインページ**: 822行 → **478行**（約42%削減）
- **2つの新規コンポーネントを作成**:
  1. `ToastNotification.tsx` - トースト通知表示
  2. `DeleteConfirmModal.tsx` - 削除確認モーダル

#### 改善効果
- ✅ フィルタリング・ソートロジックをストアに移動し、計算プロパティとして提供することで、パフォーマンスが向上
- ✅ トースト通知と削除確認モーダルが独立したコンポーネントになり、再利用性が向上
- ✅ 状態管理が一元化され、デバッグが容易に
- ✅ データ取得・操作ロジックがストアに集約され、テストが書きやすくなった

#### 状態管理の統一
- **Zustandストア作成**: `src/stores/feed-lab-store.ts` (608行)
  - 約20個の`useState`を1つのストアに集約
  - データ取得・操作関数をストアに集約:
    - `fetchPostData` - 投稿データの取得
    - `generateSchedule` - スケジュール生成
    - `saveSchedule` - スケジュール保存
    - `loadSavedSchedule` - 保存されたスケジュールの読み込み
    - `generateImageVideoSuggestions` - AIヒント生成
  - フィードバック履歴管理をストア内で一元化
  - 型定義を明確化（`PostData`, `BusinessInfoResponse`, `AISuggestionsResponse`など）

#### コンポーネント分割
- **メインページ**: 673行 → **187行**（約72%削減）
- **新規コンポーネントを作成**:
  1. `FeedbackDisplay.tsx` - フィードバック表示（スケジュール・AIヒント共通）

#### 改善効果
- ✅ 複雑なスケジュール生成・AIヒント生成ロジックをストアに移動し、可読性が向上
- ✅ フィードバック履歴管理をストア内で一元化し、コードの重複を削減
- ✅ 状態管理が一元化され、デバッグが容易に
- ✅ データ取得・操作ロジックがストアに集約され、テストが書きやすくなった

---

## 次のステップ

### 優先度: 高 ✅ すべて完了

1. **運用計画ページ (`/instagram/plan`)** - ✅ 完了
2. **フィード投稿ラボ (`/instagram/lab/feed`)** - ✅ 完了
3. **投稿一覧ページ (`/instagram/posts`)** - ✅ 完了

### 優先度: 中 ✅ すべて完了

4. **リール投稿ラボ (`/instagram/lab/reel`)** - ✅ 完了
5. **ストーリー投稿ラボ (`/instagram/lab/story`)** - ✅ 完了

### 優先度: 低 ✅ すべて完了

6. **学習ダッシュボード (`/learning`)** - ✅ 完了
   - Zustandストアの作成 ✅
   - コンポーネント分割（`AIGrowthSection`, `LearningBadgesSection`） ✅
   - 状態管理の移行 ✅

7. **月次レポートページ (`/instagram/report`)** - ✅ 完了
   - 未使用変数の削除（`router`, `userProfile`, `profileLoading`） ✅

8. **KPIコンソールページ (`/instagram/kpi`)** - ✅ 完了
   - 未使用変数の削除（`userProfile`, `profileLoading`） ✅

---

## 実装パターン

### Zustandストアの構造
```typescript
// src/stores/[page]-store.ts
import { create } from "zustand";

interface [Page]Store {
  // 状態
  data: DataType | null;
  isLoading: boolean;
  
  // セッター
  setData: (data: DataType | null) => void;
  setIsLoading: (loading: boolean) => void;
  
  // データ取得関数
  fetchData: () => Promise<void>;
  
  // リセット
  reset: () => void;
}

export const use[Page]Store = create<[Page]Store>((set) => ({
  // 実装
}));
```

### コンポーネント分割のパターン
- セクションごとにコンポーネントを作成
- 各コンポーネントはZustandストアから必要な状態のみを取得
- ロジックはコンポーネント内に閉じ込める

---

## メトリクス

### ホームページ
- **リファクタリング前**: 875行
- **リファクタリング後**: 204行（メイン） + 816行（コンポーネント）
- **削減率**: 約77%（メインページのみ）
- **状態変数**: 13個 → 1つのストア
- **コンポーネント数**: 1個 → 7個（メイン + 6セクション）

### 運用計画ページ (`/instagram/plan`)
- **リファクタリング前**: 778行
- **リファクタリング後**: 201行（メイン） + 581行（ストア） + 新規コンポーネント
- **削減率**: 約74%（メインページのみ）
- **状態変数**: 11個 → 1つのストア
- **コンポーネント数**: 1個 → 3個（メイン + PlanTabs + PlanErrorDisplay）
- **主な改善点**:
  - `loadLatestPlan`関数（約240行）をストアに移動し、複雑なロジックを整理
  - タブUIとエラー表示を独立したコンポーネントに分割
  - データ取得・操作関数（`submitPlan`, `deletePlan`, `selectAlternative`, `startPlan`）をストアに集約

### フィード投稿ラボ (`/instagram/lab/feed`)
- **リファクタリング前**: 673行
- **リファクタリング後**: 187行（メイン） + 608行（ストア） + 新規コンポーネント
- **削減率**: 約72%（メインページのみ）
- **状態変数**: 約20個 → 1つのストア
- **コンポーネント数**: 1個 → 2個（メイン + FeedbackDisplay）
- **主な改善点**:
  - スケジュール生成・AIヒント生成ロジックをストアに移動し、複雑なロジックを整理
  - フィードバック履歴管理をストア内で一元化し、コードの重複を削減
  - データ取得・操作関数（`fetchPostData`, `generateSchedule`, `saveSchedule`, `loadSavedSchedule`, `generateImageVideoSuggestions`）をストアに集約

### 投稿一覧ページ (`/instagram/posts`)
- **リファクタリング前**: 822行
- **リファクタリング後**: 478行（メイン） + 383行（ストア） + 新規コンポーネント
- **削減率**: 約42%（メインページのみ）
- **状態変数**: 9個 → 1つのストア
- **コンポーネント数**: 3個 → 5個（メイン + PostCard + PostStats + ToastNotification + DeleteConfirmModal）
- **主な改善点**:
  - フィルタリング・ソートロジックをストアに移動し、計算プロパティとして提供
  - トースト通知と削除確認モーダルを独立したコンポーネントに分割
  - データ取得・操作関数（`fetchPosts`, `deletePost`, `deleteManualAnalytics`）をストアに集約
  - タブカウント計算をストア内で一元化

### リール投稿ラボ (`/instagram/lab/reel`)
- **リファクタリング前**: 439行
- **リファクタリング後**: 148行（メイン） + 462行（ストア）
- **削減率**: 約66%（メインページのみ）
- **状態変数**: 約18個 → 1つのストア
- **主な改善点**:
  - スケジュール生成・動画構成生成ロジックをストアに移動し、複雑なロジックを整理
  - フィードバック履歴管理をストア内で一元化し、コードの重複を削減
  - データ取得・操作関数（`fetchPostData`, `generateSchedule`, `saveSchedule`, `loadSavedSchedule`, `generateVideoStructure`）をストアに集約

### ストーリー投稿ラボ (`/instagram/lab/story`)
- **リファクタリング前**: 499行
- **リファクタリング後**: 148行（メイン） + 518行（ストア）
- **削減率**: 約70%（メインページのみ）
- **状態変数**: 約20個 → 1つのストア
- **主な改善点**:
  - スケジュール生成・AIヒント生成ロジックをストアに移動し、複雑なロジックを整理
  - フィードバック履歴管理をストア内で一元化し、コードの重複を削減
  - データ取得・操作関数（`fetchPostData`, `generateSchedule`, `saveSchedule`, `loadSavedSchedule`, `generateImageVideoSuggestions`）をストアに集約

### 8. 学習ダッシュボード (`/learning`) のリファクタリング ✅

#### 状態管理の統一
- **Zustandストア作成**: `src/stores/learning-store.ts` (201行)
  - 4個の`useState`を1つのストアに集約
  - データ取得・操作関数をストアに集約:
    - `fetchDashboardData` - ダッシュボードデータの取得
    - `handleActionLogToggle` - アクションログの更新
  - 計算プロパティをストア内で提供:
    - `getActionLogMap` - アクションログマップの取得
    - `getGoldSignals` - 成功パターンの取得
    - `getRedSignals` - 改善ポイントの取得
    - `getAchievements` - バッジ一覧の取得
  - 型定義を明確化（`MasterContextResponse`, `LearningBadge`など）

#### コンポーネント分割
- **メインページ**: 549行 → **70行**（約87%削減）
- **2つの新規コンポーネントを作成**:
  1. `AIGrowthSection.tsx` - AIの成長状況セクション（218行）
  2. `LearningBadgesSection.tsx` - 学習バッジセクション（197行）

#### 改善効果
- ✅ 複雑なデータ取得・アクションログ更新ロジックをストアに移動し、可読性が向上
- ✅ AIの成長状況とバッジセクションが独立したコンポーネントになり、再利用性が向上
- ✅ 状態管理が一元化され、デバッグが容易に
- ✅ データ取得・操作ロジックがストアに集約され、テストが書きやすくなった

### 9. 未使用変数の整理 ✅

#### 月次レポートページ (`/instagram/report`)
- `router`（`useRouter`）を削除
- `userProfile`, `profileLoading`（`useUserProfile`）を削除
- 未使用のインポートを削除

#### KPIコンソールページ (`/instagram/kpi`)
- `userProfile`, `profileLoading`（`useUserProfile`）を削除
- 未使用のインポートを削除

#### 改善効果
- ✅ コードの可読性が向上
- ✅ 不要な依存関係を削減
- ✅ バンドルサイズの削減

