# データ層リファクタリング提案

## 現状の問題

1. **データ変換ロジックの重複**: 同じ変換処理が複数箇所に存在
2. **データ構造の不統一**: `planData`, `formData`, `simulationResult`など、同じデータが異なる形式で保存・参照
3. **ページ間の依存関係が複雑**: plan → home など、ページを跨いだデータ参照が複雑
4. **型の不整合**: 同じデータでも場所によって型が異なる

## 提案するアーキテクチャ

### 1. 統一データアクセス層の作成

```
src/lib/plans/
  ├── data-access.ts          # 統一データアクセス層
  ├── transformers.ts          # データ変換ロジック（集約）
  ├── types.ts                # 統一型定義
  └── validators.ts           # データ検証
```

### 2. データフローの統一

```
Firestore (plan document)
    ↓
[PlanDataAccess] (統一アクセス層)
    ↓
[PlanTransformer] (変換ロジック)
    ↓
[統一された型] (NormalizedPlanData)
    ↓
各ページ/API (表示層)
```

### 3. 実装方針

#### 3.1 統一データアクセス層 (`data-access.ts`)

```typescript
// 計画データを取得し、統一形式に変換
export class PlanDataAccess {
  static async getActivePlan(userId: string): Promise<NormalizedPlanData | null>
  static async getPlanById(planId: string): Promise<NormalizedPlanData | null>
  static async savePlan(userId: string, plan: PlanInput): Promise<string>
}
```

#### 3.2 データ変換ロジックの集約 (`transformers.ts`)

```typescript
// すべての変換ロジックを1箇所に集約
export class PlanTransformer {
  static normalize(rawPlanData: FirestorePlanData): NormalizedPlanData
  static convertFormDataToWeeklyPlans(formData: FormData): WeeklyPlans
  static convertWeeklyPostsToNumber(value: string | number): number
  // ... すべての変換ロジック
}
```

#### 3.3 統一型定義 (`types.ts`)

```typescript
// 統一された型定義
export interface NormalizedPlanData {
  id: string
  userId: string
  startDate: Date
  endDate: Date
  formData: NormalizedFormData
  weeklyPlans: WeeklyPlan[]
  simulationResult: SimulationResult
  // ... 統一された構造
}
```

## 実装ステップ

### Phase 1: 変換ロジックの集約
1. `src/lib/plans/transformers.ts`を作成
2. 重複している変換ロジックを移動
3. 各APIで`transformers.ts`を使用するように変更

### Phase 2: 統一データアクセス層の作成
1. `src/lib/plans/data-access.ts`を作成
2. 計画データの取得・保存を統一
3. 各APIで`data-access.ts`を使用するように変更

### Phase 3: 型定義の統一
1. `src/lib/plans/types.ts`を作成
2. 統一された型定義を定義
3. 各ページ/APIで統一型を使用

### Phase 4: 段階的な移行
1. 新規機能から統一データ層を使用
2. 既存機能を段階的に移行
3. 最終的にすべての機能を統一データ層に移行

## メリット

1. **保守性の向上**: 変換ロジックが1箇所に集約されるため、変更が容易
2. **一貫性の確保**: データ構造が統一されるため、不整合が発生しにくい
3. **テスト容易性**: 変換ロジックが独立しているため、テストが容易
4. **拡張性**: 新しい機能を追加する際も、統一データ層を使用するだけ

## 注意点

1. **段階的な移行**: 一度にすべてを変更せず、段階的に移行
2. **後方互換性**: 既存のデータ形式との互換性を保つ
3. **パフォーマンス**: データ変換のオーバーヘッドを最小限に

