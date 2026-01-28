# 計画保存・表示ロジック

## 概要
このドキュメントでは、Instagram運用計画の保存・表示に関するロジックを説明します。

## 問題点

### 1. 計画保存後の表示問題
- **現象**: 計画を保存した後、計画ページで表示されない
- **原因**: 
  - 計画保存後、状態（`formData`、`simulationResult`、`savedPlanId`）は保持されているが、ページリロード時に読み込まれない
  - `useEffect`の条件 `if (savedPlanId && formData && simulationResult)` により、既に状態がある場合は読み込まない
  - しかし、ページリロード時は状態がリセットされるため、計画が読み込まれない

### 2. Homeページの「今週やること」日付表示問題
- **現象**: 全てのタスクが同じ日付（例: 1/26）で表示される
- **原因**:
  - `/api/home/dashboard`の`currentWeekTasks`計算ロジックで、今週の月曜日を基準に日付を計算している
  - しかし、計画の`weeklyPlans`の`week`が正しく計算されていない可能性
  - または、日付計算ロジックが正しく動作していない

## 現在のロジック

### 計画保存処理 (`handleStartPlan`)

```typescript
// src/app/instagram/plan/page.tsx
const handleStartPlan = async (suggestion: AIPlanSuggestion) => {
  // 1. フォームデータとシミュレーション結果を確認
  if (!formData || !simulationResult) {
    setError("フォームデータまたはシミュレーション結果がありません");
    return;
  }

  // 2. 計画データを準備
  const planData = {
    snsType: "instagram",
    status: "active",
    formData: formData,
    simulationResult: simulationResult,
    aiSuggestion: suggestion,
    startDate: startDate,
    endDate: endDate,
    // ... その他のデータ
  };

  // 3. 既存の計画がある場合は更新、ない場合は新規作成
  const response = savedPlanId
    ? await authFetch(`/api/plans/${savedPlanId}`, { method: "PATCH", ... })
    : await authFetch("/api/plans", { method: "POST", ... });

  // 4. 保存成功後、状態を保持
  setSavedPlanId(planId);
  setPlanEndDate(endDate);
  // 状態はリセットせず、そのまま表示を維持
}
```

### 計画読み込み処理 (`loadLatestPlan`)

```typescript
// src/app/instagram/plan/page.tsx
useEffect(() => {
  if (!isAuthReady || profileLoading) return;
  
  // 既に計画が表示されている場合は読み込まない
  if (savedPlanId && formData && simulationResult) {
    return;
  }

  const loadLatestPlan = async () => {
    // 1. アクティブな計画を取得
    const response = await authFetch("/api/plans?snsType=instagram&status=active&limit=1");
    
    // 2. 計画データの完全性をチェック
    if (!plan.formData || !plan.simulationResult) {
      return; // 不完全な計画は表示しない
    }

    // 3. 計画期間が終了していないかチェック
    if (planEnd && now < resetDate) {
      // 計画データを復元
      setFormData(plan.formData);
      setSimulationResult(plan.simulationResult);
      setAiSuggestion(plan.aiSuggestion);
      setSavedPlanId(plan.id);
      setPlanEndDate(planEnd);
    }
  };
}, [isAuthReady, profileLoading]);
```

### Homeページの「今週やること」計算ロジック

```typescript
// src/app/api/home/dashboard/route.ts
// 1. 計画から`aiSuggestion.weeklyPlans`を取得
if (aiSuggestion?.weeklyPlans && Array.isArray(aiSuggestion.weeklyPlans)) {
  const now = new Date();
  const planStart = planStartDate || now;
  const diffTime = now.getTime() - planStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const currentWeek = Math.max(1, Math.floor(diffDays / 7) + 1);
  
  // 2. 現在の週の計画を取得
  const weekPlan = aiSuggestion.weeklyPlans.find((p: any) => p.week === currentWeek);
  
  // 3. 今週の月曜日を計算
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = today.getDay(); // 0=日曜, 1=月曜, ..., 6=土曜
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const thisWeekMonday = new Date(today);
  thisWeekMonday.setDate(today.getDate() + mondayOffset);
  
  // 4. 曜日から日付を計算
  const dayNameToIndex: Record<string, number> = {
    "月": 0, "火": 1, "水": 2, "木": 3, "金": 4, "土": 5, "日": 6,
  };
  
  currentWeekTasks = weekPlan.tasks.map((task: any) => {
    const dayIndex = dayNameToIndex[task.day] ?? 0;
    const taskDate = new Date(thisWeekMonday);
    taskDate.setDate(thisWeekMonday.getDate() + dayIndex);
    
    const month = taskDate.getMonth() + 1;
    const day = taskDate.getDate();
    
    return {
      day: `${month}/${day}（${task.day}）`,
      task: `${typeLabels[task.type]}（${task.time}）「${task.description}」`,
    };
  });
}
```

## 問題の原因

### 1. 計画保存後の表示問題

**問題**: 計画保存後、ページリロード時に計画が表示されない

**原因**:
- 計画保存後、状態は保持されているが、ページリロード時は状態がリセットされる
- `useEffect`の依存配列に`formData`や`simulationResult`が含まれていないため、状態が変更されても再実行されない
- 計画保存後、`savedPlanId`は設定されるが、`formData`や`simulationResult`がリセットされる可能性がある

**解決策**:
- 計画保存後、状態を確実に保持する
- ページリロード時、`savedPlanId`のみが設定されている場合は計画を読み込む
- または、計画保存後にページをリロードしない（現在の実装）

### 2. Homeページの日付表示問題

**問題**: 全てのタスクが同じ日付で表示される

**原因**:
- `currentWeek`の計算が正しくない可能性
- 計画の`startDate`と現在日時の差分計算に問題がある
- `thisWeekMonday`の計算が正しくない可能性
- または、`weeklyPlans`の`week`が正しく設定されていない

**解決策**:
- `currentWeek`の計算ロジックを確認・修正
- 計画の`startDate`が正しく設定されているか確認
- `thisWeekMonday`の計算ロジックを確認・修正
- デバッグログを追加して、計算過程を確認

## 推奨される修正

### 1. 計画保存後の表示問題

```typescript
// 計画保存後、状態を確実に保持
const handleStartPlan = async (suggestion: AIPlanSuggestion) => {
  // ... 保存処理 ...
  
  // 保存成功後、状態を保持（既存の実装）
  setSavedPlanId(planId);
  setPlanEndDate(endDate);
  
  // 追加: 計画保存後、状態が確実に保持されることを確認
  // ページリロード時は、loadLatestPlanが実行される
}
```

```typescript
// 計画読み込み処理の改善
useEffect(() => {
  if (!isAuthReady || profileLoading) return;
  
  // 修正: savedPlanIdのみが設定されている場合も読み込む
  if (savedPlanId && formData && simulationResult) {
    return; // すべての状態が揃っている場合は読み込まない
  }
  
  // savedPlanIdのみが設定されている場合（ページリロード後など）は読み込む
  const loadLatestPlan = async () => {
    // ... 読み込み処理 ...
  };
  
  loadLatestPlan();
}, [isAuthReady, profileLoading, savedPlanId]); // savedPlanIdを依存配列に追加
```

### 2. Homeページの日付表示問題

```typescript
// currentWeekの計算を改善
const now = new Date();
const planStart = planStartDate || now;

// 計画開始日を基準に週を計算
const diffTime = now.getTime() - planStart.getTime();
const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
const currentWeek = Math.max(1, Math.floor(diffDays / 7) + 1);

// デバッグログを追加
console.log("週計算デバッグ", {
  planStart: planStart.toISOString(),
  now: now.toISOString(),
  diffDays,
  currentWeek,
  weeklyPlans: aiSuggestion.weeklyPlans?.map((p: any) => p.week),
});

// thisWeekMondayの計算を確認
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const dayOfWeek = today.getDay();
const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
const thisWeekMonday = new Date(today);
thisWeekMonday.setDate(today.getDate() + mondayOffset);

console.log("月曜日計算デバッグ", {
  today: today.toISOString(),
  dayOfWeek,
  mondayOffset,
  thisWeekMonday: thisWeekMonday.toISOString(),
});
```

## テストケース

### 計画保存後の表示
1. 計画を作成・保存
2. ページをリロード
3. 計画が正しく表示されることを確認

### Homeページの日付表示
1. 計画を作成・保存
2. Homeページに移動
3. 「今週やること」の日付が正しく表示されることを確認
4. 各タスクの日付が異なることを確認

## 関連ファイル

- `src/app/instagram/plan/page.tsx` - 計画ページのメインコンポーネント
- `src/app/api/plans/route.ts` - 計画API（GET/POST）
- `src/app/api/plans/[id]/route.ts` - 計画API（PATCH/DELETE）
- `src/app/api/home/dashboard/route.ts` - HomeページのダッシュボードAPI
- `src/app/api/home/today-tasks/route.ts` - 今日のタスクAPI

