# 計画ページ簡素化提案

## 現状の問題

### 計画ページの複雑さ
- **右側のAIセクション**: `planResult`（StrategyPlan相当）を表示
- **生成ボタン**: PlanInput → StrategyPlan を生成して表示
- **保存ボタン**: StrategyPlanを保存

**問題点**:
1. 計画ページが「入力」と「AI生成結果の表示」の2つの責務を持っている
2. 保存前にAI生成が必要（複雑なフロー）
3. 計画を編集すると、再生成が必要
4. Homeページとのデータ整合性が取りにくい

---

## 提案：計画ページの簡素化

### 新しい設計

```
┌─────────────────────────────────────┐
│  計画ページ（/instagram/plan）      │
│  - PlanInputの入力のみ              │
│  - 保存ボタン（PlanInputを保存）     │
│  - 右側のAIセクション削除            │
└──────────────┬──────────────────────┘
               │
               ▼ PlanInputを保存
┌─────────────────────────────────────┐
│  Firestore                          │
│  - planInputs コレクション          │
│  - activePlanInputId を更新         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Homeページ（/home）                 │
│  - PlanInputを取得                   │
│  - PlanEngine.buildStrategy（AI生成）│
│  - PlanEngine.startExecution        │
│  - ExecutionStateを表示              │
│    - 今月の目標                      │
│    - 今週の予定                      │
│    - 今日すべきこと                  │
│    - 明日の準備                      │
└─────────────────────────────────────┘
```

---

## メリット

### 1. **計画ページがシンプルになる**
- **Before**: 入力 + AI生成 + 結果表示（3つの責務）
- **After**: 入力 + 保存（2つの責務）

### 2. **Homeページが柔軟になる**
- 計画を編集 → Homeページをリロード → 自動的に最新のExecutionStateを生成
- 計画を削除 → Homeページをリロード → 空のExecutionStateを表示
- **常に最新の状態を反映**

### 3. **データの一貫性が向上**
- **PlanInputが唯一の真実の源（Single Source of Truth）**
- StrategyPlanとExecutionStateは常にPlanInputから動的に生成
- データの不整合が発生しない

### 4. **設計がシンプルになる**
- 責務が明確に分離
- 計画ページ: PlanInputの管理
- Homeページ: ExecutionStateの生成と表示

### 5. **パフォーマンス向上**
- 計画ページでのAI生成が不要（保存が高速）
- HomeページでのAI生成は必要に応じて（キャッシュ可能）

---

## 実装の流れ

### Phase 1: 計画ページの簡素化

1. **右側のAIセクションを削除**
   - `planResult`の表示を削除
   - `ExpectedResults`、`PostingSchedule`、`WeeklyContentPlan`コンポーネントを削除
   - `handleSubmit`（生成ボタン）を削除

2. **保存ボタンの変更**
   - `handleSave`を修正
   - PlanInputのみを保存（StrategyPlanは生成しない）
   - `/api/instagram/plan-save`を修正してPlanInputのみを受け取る

### Phase 2: HomeページでのAI生成

1. **`/api/home/ai-generated-sections`の修正**
   - PlanInputを取得
   - `PlanEngine.buildStrategy`でStrategyPlanを生成（AI生成を含む）
   - `PlanEngine.startExecution`でExecutionStateを生成
   - ExecutionStateを返す

2. **キャッシュ戦略**
   - StrategyPlanを一時的にキャッシュ（同じPlanInputなら再生成不要）
   - PlanInputが変更されたらキャッシュを無効化

### Phase 3: 柔軟性の実現

1. **計画編集時の対応**
   - PlanInputを更新
   - Homeページをリロード → 自動的に最新のExecutionStateを生成

2. **計画削除時の対応**
   - activePlanInputIdをnullに設定
   - Homeページをリロード → 空のExecutionStateを表示

---

## 技術的な実装

### 1. PlanInputの保存

```typescript
// /api/instagram/plan-save
export async function POST(request: NextRequest) {
  const { uid: userId } = await requireAuthContext(request);
  const body = await request.json();
  
  // PlanInputを構築
  const planInput: PlanInput = {
    userId,
    snsType: "instagram",
    startDate: body.startDate,
    currentFollowers: body.currentFollowers,
    targetFollowers: body.targetFollowers,
    operationPurpose: body.operationPurpose,
    weeklyPosts: body.weeklyPosts,
    reelCapability: body.reelCapability,
    storyFrequency: body.storyFrequency,
    targetAudience: body.targetAudience,
    postingTime: body.postingTime,
    regionRestriction: body.regionRestriction,
    regionName: body.regionName,
  };
  
  // PlanInputを保存（StrategyPlanは生成しない）
  const planId = await PlanRepository.savePlanInput(userId, planInput);
  
  return NextResponse.json({ success: true, planId });
}
```

### 2. HomeページでのAI生成

```typescript
// /api/home/ai-generated-sections
export async function GET(request: NextRequest) {
  const { uid } = await requireAuthContext(request);
  
  // PlanInputを取得
  const planInput = await PlanRepository.getActivePlanInput(uid);
  if (!planInput) {
    return NextResponse.json({ data: { /* 空のExecutionState */ } });
  }
  
  // 先月の実績データを取得
  const lastMonthPerformance = await PlanRepository.getLastMonthPerformance(
    uid,
    new Date(planInput.startDate)
  );
  
  // StrategyPlanを生成（AI生成を含む）
  const userProfile = await getUserProfile(uid);
  const strategyPlan = await PlanEngine.buildStrategy(
    planInput,
    userProfile,
    lastMonthPerformance
  );
  
  // ExecutionStateを生成
  const executionState = PlanEngine.startExecution(strategyPlan);
  
  // AI方向性を取得
  const aiDirection = await fetchAIDirection(uid);
  
  return NextResponse.json({
    success: true,
    data: {
      todayTasks: executionState.todayTasks,
      tomorrowPreparation: executionState.tomorrowPreparation,
      monthlyGoals: executionState.monthlyGoals,
      weeklySchedule: executionState.weeklySchedule,
      aiDirection: aiDirection || null,
    },
  });
}
```

### 3. キャッシュ戦略（オプション）

```typescript
// StrategyPlanを一時的にキャッシュ
const strategyPlanCache = new Map<string, {
  planInputHash: string;
  strategyPlan: StrategyPlan;
  cachedAt: Date;
}>();

// PlanInputのハッシュを計算
function hashPlanInput(input: PlanInput): string {
  return JSON.stringify({
    startDate: input.startDate,
    currentFollowers: input.currentFollowers,
    targetFollowers: input.targetFollowers,
    operationPurpose: input.operationPurpose,
    weeklyPosts: input.weeklyPosts,
    reelCapability: input.reelCapability,
    storyFrequency: input.storyFrequency,
  });
}

// キャッシュから取得または生成
async function getOrBuildStrategyPlan(
  planInput: PlanInput,
  userProfile: UserProfile,
  lastMonthPerformance: any
): Promise<StrategyPlan> {
  const hash = hashPlanInput(planInput);
  const cached = strategyPlanCache.get(planInput.userId);
  
  if (cached && cached.planInputHash === hash) {
    // キャッシュが有効（1時間以内）
    const cacheAge = Date.now() - cached.cachedAt.getTime();
    if (cacheAge < 60 * 60 * 1000) {
      return cached.strategyPlan;
    }
  }
  
  // キャッシュが無効または存在しない → 生成
  const strategyPlan = await PlanEngine.buildStrategy(
    planInput,
    userProfile,
    lastMonthPerformance
  );
  
  // キャッシュに保存
  strategyPlanCache.set(planInput.userId, {
    planInputHash: hash,
    strategyPlan,
    cachedAt: new Date(),
  });
  
  return strategyPlan;
}
```

---

## 比較：Before vs After

### Before（現在）

```
計画ページ:
  1. PlanInputを入力
  2. 「生成」ボタンをクリック
  3. PlanInput → StrategyPlan（AI生成）
  4. StrategyPlanを表示（右側）
  5. 「保存」ボタンをクリック
  6. StrategyPlanを保存

Homeページ:
  1. StrategyPlanを取得
  2. StrategyPlan → ExecutionState
  3. ExecutionStateを表示

問題:
- 計画を編集 → 再生成が必要
- 計画を削除 → Homeページとの整合性が取りにくい
- 計画ページが複雑（入力 + AI生成 + 表示）
```

### After（提案）

```
計画ページ:
  1. PlanInputを入力
  2. 「保存」ボタンをクリック
  3. PlanInputを保存

Homeページ:
  1. PlanInputを取得
  2. PlanInput → StrategyPlan（AI生成）
  3. StrategyPlan → ExecutionState
  4. ExecutionStateを表示

メリット:
- 計画を編集 → Homeページをリロード → 自動的に最新のExecutionStateを生成
- 計画を削除 → Homeページをリロード → 空のExecutionStateを表示
- 計画ページがシンプル（入力 + 保存のみ）
- データの一貫性が向上（PlanInputが唯一の真実の源）
```

---

## 実装の優先順位

### Phase 1: 計画ページの簡素化（最優先）
1. 右側のAIセクションを削除
2. 生成ボタンを削除
3. 保存ボタンを修正（PlanInputのみを保存）

### Phase 2: HomeページでのAI生成
1. `/api/home/ai-generated-sections`を修正
2. PlanInputからStrategyPlanを動的に生成
3. ExecutionStateを生成して表示

### Phase 3: キャッシュ戦略（オプション）
1. StrategyPlanのキャッシュを実装
2. PlanInputの変更を検知してキャッシュを無効化

---

## 結論

この提案は、**ドメインモデルリファクタリングの方向性と完全に一致**しています。

- ✅ PlanInput（ユーザー意図）を唯一の真実の源とする
- ✅ StrategyPlan（戦略計画）を動的に生成
- ✅ ExecutionState（実行状態）を動的に生成
- ✅ 責務の明確な分離

**実装すれば、設計が大幅にシンプルになり、柔軟性も向上します。**
