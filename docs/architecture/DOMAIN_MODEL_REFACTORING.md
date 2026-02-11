# Signal. ドメインモデルリファクタリング

## 問題の本質

**Planが4つの責務を同時に背負っている**

1. フォーム入力値（PlanForm）
2. シミュレーション計算の材料（GrowthSimulation）
3. ホーム画面の状態（現在の運用指示）
4. AIプロンプト生成の材料（AiAdvice）

→ これがすべてのカオスの原因

## 解決策：責務分離された3つのモデル

### ① PlanInput（ユーザー意図）

**責務**: ユーザーが「やりたいこと」を表現

```typescript
interface PlanInput {
  userId: string
  snsType: string
  currentFollowers: number
  targetFollowers: number
  operationPurpose: string
  weeklyPosts: "none" | "weekly-1-2" | "weekly-3-4" | "daily"
  reelCapability: "none" | "weekly-1-2" | "weekly-3-4" | "daily"
  storyFrequency: "none" | "weekly-1-2" | "weekly-3-4" | "daily"
  targetAudience?: string
  postingTime?: string
  regionRestriction?: string
  regionName?: string
  startDate: string
}
```

**使用箇所**: PlanForm（入力画面）

---

### ② StrategyPlan（戦略計画）

**責務**: AI + ロジックが生成した「運用設計図」

```typescript
interface StrategyPlan {
  id: string
  planInputId: string
  userId: string
  snsType: string
  
  // 戦略設計
  weeklyPlans: Array<{
    week: number
    targetFollowers: number
    increase: number
    theme: string
    feedPosts: Array<{ day: string; content: string; type?: string }>
    storyContent: string | string[]
  }>
  
  schedule: {
    weeklyFrequency: string
    feedPosts: number
    reelPosts: number
    storyPosts: number
    postingDays: Array<{ day: string; time: string; type?: string }>
    storyDays: Array<{ day: string; time: string }>
  }
  
  expectedResults: {
    monthlyReach: number
    engagementRate: string
    profileViews: number
    saves: number
    newFollowers: number
  }
  
  difficulty: {
    stars: string
    label: string
    industryRange: string
    achievementRate: number
  }
  
  startDate: Date
  endDate: Date
  createdAt: Date
}
```

**使用箇所**: Simulation（シミュレーション計算）、AI Advice（プロンプト生成）

---

### ③ ExecutionState（実行状態）

**責務**: 「今ユーザーが何をすべきか」

```typescript
interface ExecutionState {
  strategyPlanId: string
  userId: string
  currentWeek: number
  currentDate: Date
  
  // 今日のタスク
  todayTasks: Array<{
    type: "feed" | "reel" | "story"
    description: string
    time: string
    day: string
  }>
  
  // 明日の準備
  tomorrowPreparation: Array<{
    type: "feed" | "reel" | "story"
    description: string
    time: string
    day: string
  }>
  
  // 今週の予定
  weeklySchedule: {
    week: number
    theme: string
    tasks: Array<{
      day: string
      type: "feed" | "reel" | "story"
      description: string
      time: string
    }>
  }
  
  // 今月の目標
  monthlyGoals: Array<{
    metric: string
    target: string
  }>
  
  lastUpdated: Date
}
```

**使用箇所**: Home画面（表示）

---

## アーキテクチャ

```
Firestore
  ├─ plan_inputs        (PlanInput)
  ├─ strategy_plans    (StrategyPlan)
  └─ execution_states  (ExecutionState)

        ↓
PlanRepository (DataAccess)
        ↓
PlanEngine (ドメインロジック)
        ↓
ViewModel Mapper
        ↓
UI
```

---

## PlanEngine（ビジネスロジック層）

**責務**: PlanInput → StrategyPlan → ExecutionState の変換

```typescript
class PlanEngine {
  // PlanInputからStrategyPlanを生成
  static async buildStrategy(
    input: PlanInput,
    userProfile: UserProfile
  ): Promise<StrategyPlan>
  
  // StrategyPlanからExecutionStateを生成
  static startExecution(
    strategy: StrategyPlan,
    currentDate: Date
  ): ExecutionState
  
  // 次の週に進める
  static nextWeek(state: ExecutionState): ExecutionState
  
  // シミュレーション計算
  static generateSimulation(
    input: PlanInput
  ): SimulationResult
  
  // AIプロンプト生成用のコンテキスト
  static buildAIContext(
    strategy: StrategyPlan,
    userProfile: UserProfile
  ): AIContext
}
```

---

## ディレクトリ構成

```
src/domain/plan/
  ├── plan-input.ts          # PlanInput型定義
  ├── strategy-plan.ts       # StrategyPlan型定義
  ├── execution-state.ts     # ExecutionState型定義
  └── plan-engine.ts         # PlanEngine（ビジネスロジック）

src/repositories/
  └── plan-repository.ts     # Firestoreアクセス

src/mappers/
  └── plan-view-mapper.ts    # ViewModel変換
```

---

## 実装ステップ

### Phase 1: ドメインモデル定義
1. `src/domain/plan/` ディレクトリ作成
2. 3つのモデル（PlanInput, StrategyPlan, ExecutionState）を定義
3. 型定義を統一

### Phase 2: PlanEngine実装
1. `plan-engine.ts` を作成
2. 既存の変換ロジックをPlanEngineに移動
3. ビジネスロジックを集約

### Phase 3: Repository実装
1. `plan-repository.ts` を作成
2. Firestoreアクセスを統一
3. 各モデルの保存・取得を実装

### Phase 4: 段階的移行
1. 新規機能から使用開始
2. 既存APIを段階的に移行
3. 最終的にすべての機能を移行

---

## メリット

1. **責務の明確化**: 各モデルが1つの責務のみを持つ
2. **テスト容易性**: ビジネスロジックが独立しているため、テストが容易
3. **拡張性**: 新しい機能を追加する際も、既存のモデルに影響しない
4. **保守性**: 変更の影響範囲が明確
5. **AI機能の安定化**: AI AdviceがStrategyPlanを見るだけになる

---

## 注意点

1. **段階的な移行**: 一度にすべてを変更せず、段階的に移行
2. **後方互換性**: 既存のデータ形式との互換性を保つ
3. **パフォーマンス**: データ変換のオーバーヘッドを最小限に

