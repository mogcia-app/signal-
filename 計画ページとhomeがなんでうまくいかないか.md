# 計画ページとホームページの連携問題と解決策

## 問題の概要

計画ページで計画を削除・作成・更新した後、ホームページのAI生成セクション（「今日やること」「明日の準備」「今週の予定」「今週の投稿スケジュール」）が正しく更新されない問題が発生していました。

## ホームページの4つのAI生成セクション

ホームページには以下の4つのAI生成セクションがあります：

1. **📅 今日やること** (`todayTasks`)
   - 今日の投稿タスク（フィード、リール、ストーリーズ）
   - `aiSuggestion.weeklyPlans`から今日の曜日に該当するタスクを抽出
   - 各タスクには生成された投稿文とハッシュタグが含まれる

2. **🌅 明日の準備** (`tomorrowPreparation`)
   - 明日の投稿タスクの準備事項
   - `aiSuggestion.weeklyPlans`から明日の曜日に該当するタスクを抽出
   - 投稿内容の準備や撮影のヒントなど

3. **📊 今月の目標** (`monthlyGoals`)
   - `aiSuggestion.monthlyGoals`から取得
   - メトリクス（フォロワー数、エンゲージメント率など）と目標値

4. **📅 今週の投稿スケジュール** (`weeklySchedule`)
   - 今週の全投稿スケジュール（週のテーマ、アクション、日別タスク）
   - `aiSuggestion.weeklyPlans`から今週の計画を取得し、AIで詳細化

## 発生していた問題

### 1. 計画更新後のホームページ再取得が実行されない

**問題:**
- 計画ページで計画を編集・保存しても、ホームページのAI生成セクションが古い計画データを参照し続ける
- 計画を削除して新しく計画を作成しても、ホームページに古い計画の内容が表示される

**原因:**
- ホームページの`useEffect`が初回マウント時のみ実行される（依存配列が空`[]`）
- 計画変更を検知する仕組みがなかった
- 計画保存時にホームページへの通知フラグが設定されていなかった

**現在の実装:**
- ホームページは初回マウント時にのみAI生成セクションを取得
- 計画保存後、手動でホームページをリロードしないと更新されない

**改善案:**
- 計画保存・削除時に`localStorage`に`planChangedAt`フラグを設定
- ホームページで`planChangedAt`フラグを監視し、検知時にAI生成セクションを再取得
- 計画保存成功後、ホームページに自動リダイレクト（オプション）

### 2. キャッシュキーが日付のみで、計画更新を検知できない

**問題:**
- ホームページのAI生成セクションAPIが日付ベースのキャッシュを使用
- キャッシュキー: `${uid}_${todayStr}`（日付のみ）
- 計画が更新されても、同じ日付のキャッシュが使われ続ける

**原因:**
- キャッシュキーに計画の更新日時が含まれていない
- 計画が更新されても、キャッシュキーが変わらないため、古いキャッシュが返される
- 同じ日のうちに計画を更新しても、古いキャッシュが返される

**現在の実装:**
```typescript
// src/app/api/home/ai-generated-sections/route.ts
const cacheDocId = `${uid}_${todayStr}`;
```

**改善案:**
- キャッシュキーに計画IDと更新日時を含める
- キャッシュキー: `${uid}_${todayStr}_${planId}_${planUpdatedAt}`
- 計画が更新されると`updatedAt`が変わるため、新しいキャッシュキーが生成される
- キャッシュの検証時に計画IDと更新日時を確認

### 3. 計画保存時に`aiSuggestion`が含まれていない

**問題:**
- 計画保存時に`aiSuggestion`が計画データに含まれていない
- ホームページで`aiSuggestion`が取得できず、AI生成セクションが空になる
- 「計画データにaiSuggestionがありません」というログが表示される

**原因:**
- 計画保存処理（`handleStartPlan`）で`aiSuggestion`を計画データに含めていなかった
- 計画読み込み時に`aiSuggestion`をstateに保存していなかった
- `AIPlanSuggestion`コンポーネントで生成された`aiSuggestion`が計画保存時に渡されていない

**現在の実装:**
```typescript
// src/app/instagram/plan/page.tsx
const planData = {
  snsType: "instagram",
  status: "active",
  // ... その他のフィールド
  formData: formData,
  simulationResult: simulationResult,
  // aiSuggestion が含まれていない
};
```

**改善案:**
- 計画読み込み時に`aiSuggestion`をstateに保存
- 計画保存時にstateの`aiSuggestion`を計画データに含める
- stateにない場合は、既存の計画から`aiSuggestion`を取得して含める
- `AIPlanSuggestion`コンポーネントから`aiSuggestion`を受け取る仕組みを実装

## AI生成セクションの生成フロー

### 1. ホームページの初回読み込み時

```
1. ホームページがマウントされる
2. useEffectが実行され、fetchData()が呼ばれる
3. 並列で以下を取得:
   - /api/home/dashboard (ダッシュボードデータ)
   - /api/home/ai-generated-sections (AI生成セクション)
4. AI生成セクションAPIの処理:
   a. ユーザーのアクティブな計画を取得
   b. 計画からaiSuggestionを取得
   c. キャッシュをチェック（日付ベース）
   d. キャッシュがあれば返す、なければ生成
5. 生成処理:
   a. 今日の曜日を取得
   b. aiSuggestion.weeklyPlansから今週の計画を取得
   c. 今日のタスクを抽出（todayTasks）
   d. 明日のタスクを抽出（tomorrowPreparation）
   e. 今週のスケジュールをAIで詳細化（weeklySchedule）
   f. aiSuggestion.monthlyGoalsを取得（monthlyGoals）
6. 生成されたデータをキャッシュに保存
7. ホームページに表示
```

### 2. 計画保存時のフロー（現在の実装）

```
1. 計画ページで計画を編集・保存
2. 計画データをAPIに送信（aiSuggestionは含まれていない可能性）
3. 計画が保存される（updatedAtが更新される）
4. ホームページは更新されない（手動リロードが必要）
```

### 3. 計画保存時のフロー（改善案）

```
1. 計画ページで計画を編集・保存
2. aiSuggestionを計画データに含める
3. planSavedAtとplanChangedAtフラグを設定
4. 500ms待機後、ホームページにリダイレクト
5. ホームページでplanChangedAtフラグを検知
6. フラグをクリアしてAI生成セクションを再取得
7. 新しい計画データ（planUpdatedAtを含む）でキャッシュキーを生成
8. キャッシュが無効なため、新しい計画データでAI生成セクションを再生成
9. 新しいキャッシュを保存（計画IDと更新日時を含む）
```

## 実装した解決策（過去の実装）

### 1. 計画変更の検知と通知

**計画ページ（`src/app/instagram/plan/page.tsx`）:**

```typescript
// 計画保存成功時
localStorage.setItem("planSavedAt", Date.now().toString());
localStorage.setItem("planChangedAt", Date.now().toString());

// 計画保存成功後、ホームページにリダイレクト
setTimeout(() => {
  router.push("/home");
}, 500);

// 計画削除成功時
localStorage.setItem("planChangedAt", Date.now().toString());
```

**ホームページ（`src/app/home/page.tsx`）:**

```typescript
// 計画変更フラグをチェック
const planChangedAt = localStorage.getItem("planChangedAt");
if (planChangedAt) {
  const changedTime = parseInt(planChangedAt, 10);
  const now = Date.now();
  const timeDiff = now - changedTime;
  // 5分以内に変更された場合は再取得
  if (timeDiff < 5 * 60 * 1000) {
    localStorage.removeItem("planChangedAt");
    fetchAiSections(); // AI生成セクションを再取得
  }
}

// ポーリング監視（500msごとにチェック）
const interval = setInterval(checkPlanChanged, 500);
```

### 2. キャッシュキーの改善

**AI生成セクションAPI（`src/app/api/home/ai-generated-sections/route.ts`）:**

```typescript
// 計画の更新日時を取得
let planUpdatedAt: string = "";
const updatedAtRaw = planData.updatedAt;
if (updatedAtRaw) {
  const updatedAt = updatedAtRaw instanceof Date 
    ? updatedAtRaw 
    : updatedAtRaw.toDate 
      ? updatedAtRaw.toDate() 
      : new Date(updatedAtRaw);
  planUpdatedAt = updatedAt.toISOString();
}

// キャッシュキーに計画IDと更新日時を含める
const cacheDocId = planUpdatedAt 
  ? `${uid}_${todayStr}_${planId}_${planUpdatedAt}` 
  : `${uid}_${todayStr}_${planId}`;

// キャッシュの検証時に計画IDと更新日時を確認
if (cacheData?.data && cachePlanId === planId) {
  if (!planUpdatedAt || cachePlanUpdatedAt === planUpdatedAt) {
    // キャッシュ有効
    return cachedData;
  } else {
    // 計画が更新されたため、キャッシュ無効
    // 再生成を実行
  }
}
```

### 3. `aiSuggestion`の保存と読み込み

**計画ページ（`src/app/instagram/plan/page.tsx`）:**

```typescript
// stateにaiSuggestionを追加
const [aiSuggestion, setAiSuggestion] = useState<AIPlanSuggestion | null>(null);

// 計画読み込み時にaiSuggestionを保存
if (validPlan.aiSuggestion) {
  setAiSuggestion(validPlan.aiSuggestion as AIPlanSuggestion);
}

// 計画保存時にaiSuggestionを含める
if (aiSuggestion) {
  planData.aiSuggestion = aiSuggestion;
} else if (savedPlanId) {
  // stateにない場合は既存の計画から取得
  const existingPlanResponse = await authFetch(`/api/plans/${savedPlanId}`);
  if (existingPlanResponse.ok) {
    const existingPlan = await existingPlanResponse.json();
    if (existingPlan.data?.aiSuggestion) {
      planData.aiSuggestion = existingPlan.data.aiSuggestion;
    }
  }
}
```

## 現在の実装状況

### 計画ページ

- ✅ 計画の作成・更新・削除機能
- ✅ 計画データの読み込み
- ✅ ローディング表示
- ❌ `aiSuggestion`のstate管理（削除済み）
- ❌ 計画保存時の`aiSuggestion`保存（削除済み）
- ❌ 計画保存後のホームページリダイレクト（削除済み）
- ❌ 計画変更通知フラグ（削除済み）

### ホームページ

- ✅ 初回マウント時のAI生成セクション取得
- ✅ ローディング表示（動的メッセージ付き）
- ✅ 4つのセクションの表示
- ❌ 計画変更の監視（削除済み）
- ❌ 計画変更時の自動再取得（削除済み）

### AI生成セクションAPI

- ✅ 計画データの取得
- ✅ `aiSuggestion`の取得
- ✅ キャッシュ機能（日付ベース）
- ✅ 4つのセクションの生成
- ❌ 計画更新日時を含むキャッシュキー（削除済み）
- ❌ キャッシュの検証（計画IDと更新日時）

## 動作フロー（現在の実装）

### 計画保存時のフロー

1. 計画ページで計画を編集・保存
2. 計画データをAPIに送信（`aiSuggestion`は含まれていない可能性）
3. 計画が保存される（`updatedAt`が更新される）
4. ホームページは更新されない（手動リロードが必要）
5. 手動でホームページをリロードすると、新しい計画データが取得される
6. ただし、同じ日のキャッシュが使われるため、古いデータが表示される可能性がある

### 計画削除時のフロー

1. 計画ページで計画を削除
2. 計画ページをリロード
3. ホームページに移動した際、計画が存在しないため空のデータが表示される
4. ただし、キャッシュが残っている場合は古いデータが表示される可能性がある

## AI生成セクションの詳細な生成ロジック

### 1. 今日やること（todayTasks）

```typescript
// aiSuggestion.weeklyPlansから今週の計画を取得
const weekPlan = aiSuggestion?.weeklyPlans?.find((p) => p.week === currentWeek);

// 今日の曜日に該当するタスクを抽出
const todayTasks = weekPlan?.tasks
  .filter(task => matchDay(task.day, todayDayName))
  .map(task => ({
    type: task.type, // "feed" | "reel" | "story" | "feed+reel"
    description: task.description,
    time: task.time,
    generatedContent: null, // 後でAI生成
    generatedHashtags: [] // 後でAI生成
  }));
```

### 2. 明日の準備（tomorrowPreparation）

```typescript
// 明日の曜日に該当するタスクを抽出
const tomorrowTasks = weekPlan?.tasks
  .filter(task => matchDay(task.day, tomorrowDayName))
  .map(task => ({
    type: task.type,
    description: task.description,
    time: task.time,
    preparation: null // 後でAI生成
  }));
```

### 3. 今週の投稿スケジュール（weeklySchedule）

```typescript
// 今週の計画をAIで詳細化
if (weekPlan && openai) {
  const prompt = `今週（第${currentWeek}週）の投稿スケジュールを詳細化してください。
  計画開始日: ${planStart}
  今週の日付範囲: ${weekStartDate} 〜 ${weekEndDate}
  週次計画: ${JSON.stringify(weekPlan.tasks)}
  ...`;
  
  const aiResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });
  
  // AI生成された詳細スケジュールをパース
  const weeklySchedule = parseAIResponse(aiResponse);
}
```

### 4. 今月の目標（monthlyGoals）

```typescript
// aiSuggestion.monthlyGoalsから直接取得
const monthlyGoals = aiSuggestion?.monthlyGoals || [];
```

## デバッグ方法

### コンソールログで確認できる項目

**計画ページ:**
- `[Plan Page] 計画読み込み開始` - 計画読み込みが開始されたか
- `[Plan Page] 計画データにaiSuggestionがありません` - `aiSuggestion`が取得できなかった場合
- `[Plan Page] 計画保存成功` - 計画保存が成功したか

**ホームページ:**
- `[Home] ログイン→ホームページ表示開始` - ホームページの読み込みが開始されたか
- `[Home] データを読み込み中...` - ローディングメッセージ
- `[Home] AI生成セクション取得成功` - AI生成セクションが取得できたか

**AI生成セクションAPI:**
- `[Home AI Sections] 計画データ取得: planId=..., hasAiSuggestion=...` - 計画データと`aiSuggestion`の有無
- `[Home AI Sections] キャッシュキー: ...` - キャッシュキーが正しく生成されているか
- `[Home AI Sections] Firestoreキャッシュヒット: ...` - キャッシュが使われたか
- `[Home AI Sections] キャッシュなし、新規生成します: ...` - 新規生成が実行されたか

### 確認すべきポイント

1. **計画保存時:**
   - 計画データに`aiSuggestion`が含まれているか（Firestoreで確認）
   - 計画の`updatedAt`が更新されているか
   - 計画保存が成功しているか

2. **ホームページ表示時:**
   - 計画が正しく取得できているか
   - `aiSuggestion`が取得できているか
   - キャッシュキーが正しく生成されているか
   - AI生成セクションが正しく生成されているか

3. **キャッシュの問題:**
   - 同じ日のキャッシュが使われていないか
   - 計画更新後も古いキャッシュが返されていないか

## 今後の改善点

### 1. 計画変更の自動検知

- 計画保存・削除時に`localStorage`にフラグを設定
- ホームページでフラグを監視し、検知時に自動再取得
- 計画保存後の自動リダイレクト（オプション）

### 2. キャッシュキーの改善

- キャッシュキーに計画IDと更新日時を含める
- 計画更新時にキャッシュを無効化
- キャッシュの有効期限を設定

### 3. `aiSuggestion`の確実な保存

- 計画保存時に`aiSuggestion`を確実に含める
- `AIPlanSuggestion`コンポーネントから`aiSuggestion`を受け取る仕組み
- 計画読み込み時に`aiSuggestion`をstateに保存

### 4. エラーハンドリングの強化

- 計画保存失敗時の処理
- AI生成セクション取得失敗時のフォールバック
- `aiSuggestion`が取得できない場合の処理

### 5. パフォーマンスの最適化

- キャッシュの有効期限を設定
- 不要なキャッシュの削除
- AI生成の並列処理

### 6. ユーザー体験の改善

- 計画保存中のローディング表示
- ホームページでの更新中の表示
- 計画変更時の通知

## 関連ファイル

- `src/app/instagram/plan/page.tsx` - 計画ページ
- `src/app/home/page.tsx` - ホームページ
- `src/app/api/home/ai-generated-sections/route.ts` - AI生成セクションAPI
- `src/app/api/plans/route.ts` - 計画作成API
- `src/app/api/plans/[id]/route.ts` - 計画更新API
- `src/app/instagram/plan/components/AIPlanSuggestion.tsx` - AI計画提案コンポーネント
- `src/app/instagram/plan/types/plan.ts` - 計画データの型定義
