# 計画ページとホームページのアーキテクチャ再設計

## 要件
計画ページで、ユーザーが立てた計画をもとにAIが今月の目標・週次スケジュールを生成（４週分）
保存後
homeページで今月の目標・週次スケジュール表示(リアルタイムで７日間立てば次の週次を表示に切り替える)
週次スケジュールで生成された予定をもとに、homeでAIが今日すべきこと・明日の準備を表示
ユーザーはログイン後投稿することがあれば「今日すべきこと」に準備されている投稿文・ハッシュタグをコピペして投稿をする

途中で計画内容を変更・計画ページから編集をして、新しく計画内容が更新されたら、それに基づきhomeの月の目標・週次スケジュールも更新されるため、今日すべきこと・明日の準備も更新される

計画は1ヶ月単位なので、計画終了日にはhomeでも新しく計画を作成してくださいと表示され、今日すべきこと・明日の準備・月の目標・週次スケジュールは何も表示されない

保存はローカルストレージではなく、ユーザー認証を行いファイヤーベースに保存

毎日ユーザーがログインをした時（初回目）に今日すべきこと・明日の準備を作るAIが動く
同日に何度ユーザーがログインをしても、今日すべきこと・明日の準備の生成は初回の一回きり





---

## 新しい設計方針

### 基本原則
1. **計画が一次ソース（Source of Truth）**
   - ホームページは常に「現在のアクティブ計画」から直接導出される
   - キャッシュは「計算コスト削減のための副次物」に過ぎない

2. **計画は2層構造**
   - **真実の層**: `PlanFormData` + `SimulationResult` = `Plan`（ユーザーデータ）
   - **派生の層**: `aiSuggestion` = 計画から導出される生成結果（再生成可能）
   - `aiSuggestion`は「保存していい」が「真実ではない」

3. **aiSuggestionの正体**
   - `aiSuggestion`は「データ」ではなく「生成結果」
   - 計画の「コンパイル結果」であり、ソースコードではない
   - AIモデル変更・プロンプト改善時に再生成可能である必要がある
   - **source code**: `formData` + `simulationResult`
   - **build artifact**: `aiSuggestion`

4. **ホームページは計画のリアルタイム投影ビュー（Projection / Read Model）**
   - 保存データを見るページではなく、計画の派生状態を表示
   - ホームは「データ」ではなく、計画から導出される「状態の表示装置」
   - CQRSの考え方: 計画（Plan）= Write Model、ホーム = Read Model
   - **最重要**: ホームは「Planを読む」だけの存在に固定する
     - Planを生成しない
     - Planを補完しない
     - Planを推測しない
     - Planを再構築しない

5. **aiSuggestionの役割（計画ページ専用）**
   - `aiSuggestion`は「計画説明用キャッシュ」に格下げ
   - 計画ページ専用の補助データとする
   - **HomeではaiSuggestionの生成を行ってはならない**（完全禁止）
   - Homeは必ず`plan.formData + simulationResult`から`weeklyPlans`を導出して使用する
   - `aiSuggestion`は存在する場合のみ表示補助として利用可能（任意）
   - **重要**: HomeはAIに「計画」を作らせてはいけない。HomeのAIは「文章化」だけ

6. **Single Active Plan制約（最重要）**
   - ユーザーは「アクティブ計画を1つしか持てない」
   - `status: "active"`での検索は禁止（複数のactive計画が存在する可能性があるため）
   - `users.activePlanId`で管理する

7. **状態遷移の原子性（最重要・実装必須）**
   - `users.activePlanId`は「ユーザーの現在という概念そのもの」
   - ホーム = Active Plan の実行状態ビュー
   - 「計画を保存」と「現在を切り替える」は**別APIにしてはいけない**（絶対）
   - Firestore Transactionで1操作として実行する必要がある
   - フロントからFirestoreに直接書き込んではいけない（BFF経由のトランザクション必須）
   - **旧planIdに紐づくhomeキャッシュをすべて無効化（削除）する**（必須）

8. **ホームの状態固定（UX成立条件）**
   - ホームは「その日の状態」を固定する
   - 同じ日付の間はホームの内容を変えない
   - リロードで内容が変わらない、0時跨ぎで崩れない、投稿中に指示が変わらない

---

## 新しいフロー

### 計画ページでの生成と保存（重要：状態遷移の原子性）

**⚠️ 最重要**: 「この計画で始める」ボタンは**フロントからFirestoreに直接書き込んではいけない**。必ずBFF経由のトランザクションを使用する。

```
1. ユーザーが「AIに計画を作ってもらう」をクリック
2. /api/instagram/plan-suggestion でAI生成
   - monthlyGoals（今月の目標）
   - weeklyPlans（週ごとのスケジュール）
   - monthlyStrategy（週ごとの戦略テーマ）
3. 生成されたaiSuggestionをstateに保存
4. 「この計画で始める」をクリック
5. /api/plans/start を呼び出し（BFF経由、Firestore Transaction使用）
   - この操作は1つのドメイン操作「StartNewPlan」として実装
   - 1トランザクションで以下を同時に実行:
     a. 新しい plan を作成
     b. users.activePlanId を newPlanId に変更
     c. 旧 plan を archived に変更（存在する場合）
     d. plan.version = 1 を確定
   - aiSuggestionは「キャッシュ付き派生データ」として保存（オプション）
   - 保存されていなくても、後で再生成可能
   - **並行実行時の競合処理**: トランザクション内で現在のactivePlanIdを取得し、競合を防止
```

**`/api/plans/start` の実装例（並行実行時の競合処理を含む）**:
```typescript
export async function POST(request: NextRequest) {
  const { uid: userId } = await requireAuthContext(request);
  const body = await request.json();
  
  let newPlanRef: admin.firestore.DocumentReference;
  
  await adminDb.runTransaction(async (transaction) => {
    // 1. ユーザーの現在のactivePlanIdを取得（トランザクション内で）
    const userRef = adminDb.collection("users").doc(userId);
    const userDoc = await transaction.get(userRef);
    const currentActivePlanId = userDoc.data()?.activePlanId;
    
    // 2. 新計画を作成
    newPlanRef = adminDb.collection("plans").doc();
    const planData = {
      ...body.planData,
      version: 1,
      timezone: body.timezone || "Asia/Tokyo",
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    transaction.set(newPlanRef, planData);
    
    // 3. activePlanIdを更新（トランザクション内で）
    transaction.update(userRef, { 
      activePlanId: newPlanRef.id,
      timezone: body.timezone || userDoc.data()?.timezone || "Asia/Tokyo"
    });
    
    // 4. 旧計画をarchivedに（存在する場合）
    if (currentActivePlanId) {
      const oldPlanRef = adminDb.collection("plans").doc(currentActivePlanId);
      transaction.update(oldPlanRef, { status: "archived" });
    }
    
    // 注意: 旧計画のキャッシュ削除はトランザクション外で実行
    // Firestore Transactionは500ドキュメント制限があるため
  });
  
  // 5. 旧計画のキャッシュを削除（トランザクション外で非同期実行）
  if (currentActivePlanId) {
    await invalidatePlanCache(currentActivePlanId);
  }
  
  return NextResponse.json({ success: true, planId: newPlanRef.id });
}

// 旧planIdに紐づくキャッシュを削除
async function invalidatePlanCache(oldPlanId: string) {
  const cacheRef = adminDb.collection("homeAiSectionsCache");
  const snapshot = await cacheRef.where("planId", "==", oldPlanId).get();
  
  // バッチ削除（500件ずつ）
  let batch = adminDb.batch();
  let count = 0;
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    count++;
    if (count >= 500) {
      await batch.commit();
      batch = adminDb.batch();
      count = 0;
    }
  }
  if (count > 0) {
    await batch.commit();
  }
}
```

**なぜこれが必須か**:
- FirestoreはACIDなRDBではなく、複数書き込みの順序保証がない
- 「計画を保存」と「現在を切り替える」を別APIにすると、分散状態の切り替え瞬間に矛盾が発生する
- 例: 新plan作成 → ユーザーがホームを開く → activePlanIdまだ旧plan → activePlanId更新
- このときホームは「新しい計画が存在するが、旧計画が"現在"」という矛盾状態を読み込む
- これが「新しく作ったのに古いのが表示される」バグの再発原因

### ホームページでの表示（重要：状態固定）

**⚠️ 最重要**: ホームは「その日の状態」を固定する。同じ日付の間は内容を変えない。

```
1. ホームページがマウントされる
2. /api/home/ai-generated-sections を呼び出し
3. APIの処理:
   a. ユーザーのactivePlanIdを取得（必須）
   b. activePlanIdが無ければ空データを返す（ホームが空になるのは計画がない時だけ）
   c. アクティブな計画を直接取得（activePlanIdから）
   d. 計画が無ければ空データを返す（データ不整合の自動修復）
   e. タイムゾーンを取得（必ずplan.timezoneを使用。Homeでuser.timezoneを参照してはならない）
   f. ローカル日付を取得（plan.timezoneで「今日」を判定）
   g. キャッシュキー生成: planId + plan.version + localDate + timezone（userIdは含めない）
   h. キャッシュをチェック（同じ日付の間は内容を固定）
   i. キャッシュが無い、または無効な場合:
      - plan.formData + simulationResultからweeklyPlansを導出（必須）
      - aiSuggestionは存在する場合のみ表示補助として利用可能（任意）
      - **重要**: HomeではaiSuggestionの生成を行ってはならない（完全禁止）
      - monthlyGoals: plan.formData + simulationResultから導出（必須。aiSuggestionを参照してはならない）
      - weeklySchedule: 導出したweeklyPlansから今週の計画を取得（タイムゾーン考慮。aiSuggestionを参照してはならない）
      - todayTasks: 導出したweeklyPlansから今日のタスクを抽出 → AIで投稿文生成（文章化のみ）
      - tomorrowPreparation: 導出したweeklyPlansから明日のタスクを抽出 → AIで準備事項生成（文章化のみ）
      - 生成したデータをキャッシュに保存（localDateをキーに）
   j. キャッシュがある場合:
      - キャッシュの内容をそのまま返す（同じ日付の間は内容を変えない）
4. キャッシュは「計算コスト削減」と「状態固定」のため使用
   - キャッシュキー: planId + plan.version + localDate + timezone（userIdは含めない）
   - 計画が更新されるとversionが変わるため、新しいキャッシュが生成される
   - AIエンジンが更新されるとaiEngineVersionが変わるため、再生成される
   - 日付が変わるとlocalDateが変わるため、新しいキャッシュが生成される
   - 同じ日付の間は内容を固定（リロードで内容が変わらない、0時跨ぎで崩れない）
```

**なぜ状態固定が必須か**:
- SNS運用ツールでは「今日やること」が日付に依存する
- Cloud FunctionsはUTCで動くが、ユーザーは日本時間
- 夜23:30に投稿準備中に、サーバーでは翌日になると「今日のタスクが消える」「明日の準備が今日に出る」という致命的な問題が発生
- 同じ日付の間は内容を固定することで、リロードで内容が変わらない、0時跨ぎで崩れない、投稿中に指示が変わらない

---

## データ構造

### ユーザーデータ（Firestore usersコレクション）
```typescript
{
  id: string;
  activePlanId: string | null; // ← 唯一のアクティブ計画ID（最重要）
  timezone: string; // ← ユーザーのタイムゾーン（例: "Asia/Tokyo"）
  // ... その他のユーザー情報
}
```

### 計画データ（Firestore plansコレクション）
```typescript
{
  id: string;
  userId: string;
  snsType: "instagram";
  status: "active" | "completed" | "archived"; // ← 参考用（検索には使わない）
  formData: PlanFormData; // ← 真実の層（ユーザーデータ）
  simulationResult: SimulationResult; // ← 真実の層（ロジック計算）
  aiSuggestion?: AIPlanSuggestion; // ← 派生の層（オプション、再生成可能）
  version: number; // ← 計画のバージョン（ホーム表示に影響する変更が発生した場合に必ずインクリメント）
  timezone: string; // ← 計画作成時のタイムゾーン（例: "Asia/Tokyo"）
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 重要な制約
- **Single Active Plan制約**: ユーザーは同時に1つのアクティブ計画しか持てない
- **activePlanIdの管理**: `users.activePlanId`で管理し、`status`検索は禁止
- **新計画開始時**: 旧計画を自動的に非アクティブにする

### versionの責務（最重要）

`plan.version`は「ホーム表示に影響する変更」が発生した場合に必ずインクリメントする。

**対象変更**:
- 投稿頻度の変更
- 期間の変更
- 開始日の変更
- `simulationResult`再計算
- `weeklyPlans`に影響する全編集

**versionを変更しない変更**:
- `aiSuggestion`の再生成のみ（計画構造に影響しない）

**重要**: Homeの再描画トリガーは`version`だけに固定します。
- 計画を更新しても`version`が変わらなければ、ホームは変更されない
- `version`が変われば、新しいキャッシュが生成され、ホームが更新される

### aiSuggestionの保存場所（2つの選択肢）

#### 選択肢1: 計画ドキュメント内（現在の実装）
- 利点: 1回のクエリで取得可能
- 欠点: 計画ドキュメントが肥大化、AIエンジン更新時に全計画を再生成する必要がある

#### 選択肢2: 別コレクション（推奨）
```typescript
// plans/{planId}/aiSuggestions/{version}
{
  planId: string;
  version: number; // 計画のバージョン
  aiEngineVersion: string; // AIエンジンのバージョン（プロンプトバージョン）
  data: AIPlanSuggestion;
  createdAt: Date;
}
```
- 利点: 計画と分離、AIエンジン更新時に柔軟に対応可能
- 欠点: 追加のクエリが必要

**推奨**: 初期実装は選択肢1、将来的に選択肢2に移行

### AIPlanSuggestion（計画ページで生成）
```typescript
{
  monthlyGoals: Array<{
    metric: string;
    target: string;
  }>;
  weeklyPlans: Array<{
    week: number;
    startDate: string;
    endDate: string;
    tasks: Array<{
      day: string; // "月", "火", etc.
      type: "feed" | "reel" | "story";
      description: string;
      time: string;
    }>;
  }>;
  monthlyStrategy: Array<{
    week: number;
    theme: string;
    actions: string[];
  }>;
}
```

### ホームページの表示データ
```typescript
{
  // plan.formData + simulationResult から導出
  monthlyGoals: Array<{
    metric: string;
    target: string;
  }>;
  
  // plan.formData + simulationResult から導出
  weeklySchedule: {
    week: number;
    theme: string;
    actions: string[];
    tasks: Array<{
      day: string;
      date?: string;
      time: string;
      type: string;
      description: string;
    }>;
    startDate?: string;
    endDate?: string;
  } | null;
  
  // 計画から抽出 + AI生成（weeklyPlansから今日のタスクを抽出し、AIで投稿文生成）
  todayTasks: Array<{
    time: string;
    type: string;
    description: string;
    tip?: string;
    generatedContent?: string; // ← AI生成
    generatedHashtags?: string[]; // ← AI生成
    reason?: string;
  }>;
  
  // 計画から抽出 + AI生成（weeklyPlansから明日のタスクを抽出し、AIで準備事項生成）
  tomorrowPreparation: Array<{
    time: string;
    type: string;
    description: string;
    preparation: string; // ← AI生成
  }>;
}
```

---

## API設計

### `/api/home/ai-generated-sections` (GET)

#### 処理フロー
1. **ユーザーのactivePlanIdを取得（必須）**
   ```typescript
   const user = await getUser(userId);
   if (!user || !user.activePlanId) {
     // アクティブ計画が無い場合のみ空データを返す
     return { monthlyGoals: [], weeklySchedule: null, todayTasks: [], tomorrowPreparation: [] };
   }
   ```

2. **アクティブな計画を直接取得（必須）**
   ```typescript
   const plan = await getPlan(user.activePlanId);
   if (!plan) {
     // 計画が存在しない場合（データ不整合）、自己修復を実行
     // users.activePlanId が存在するが plan が存在しない場合、
     // user.activePlanId を null に更新し、空データを返す（自己修復）
     await adminDb.collection("users").doc(userId).update({
       activePlanId: null
     });
     return { monthlyGoals: [], weeklySchedule: null, todayTasks: [], tomorrowPreparation: [] };
   }
   
   // Homeのローカル日付判定は必ず plan.timezone を使用する
   // plan作成時に user.timezone を plan.timezone にコピーして固定する
   // Homeで user.timezone を参照してはならない
   const timezone = plan.timezone || "Asia/Tokyo";
   const localDate = getLocalDate(timezone); // タイムゾーンを考慮したローカル日付（YYYY-MM-DD）
   // 重要: localDateは「状態固定」のためのキー。同じ日付の間は内容を変えない
   
   // 計画終了日のチェック（最重要）
   // 取得したplanの endDate < localDate の場合、そのplanは「期限切れ」とみなす
   if (plan.endDate) {
     const endDate = plan.endDate instanceof Date 
       ? plan.endDate 
       : plan.endDate.toDate 
         ? plan.endDate.toDate() 
         : new Date(plan.endDate);
     
     // タイムゾーンを考慮したendDateのローカル日付を取得（YYYY-MM-DD形式）
     // getLocalDateForDate関数: 特定のDateオブジェクトに対してタイムゾーンを考慮したローカル日付を取得
     const endLocalDate = getLocalDateForDate(endDate, timezone);
     
     if (endLocalDate < localDate) {
       // 期限切れplanの場合:
       // 1. 表示用データは返さない
       // 2. 「新しい計画を作成してください」フラグを返す
       // 3. activePlanIdは変更しない（履歴保持のため）
       // 期限切れplanに対して todayTasks / tomorrowPreparation の生成は行ってはならない
       return {
         monthlyGoals: [],
         weeklySchedule: null,
         todayTasks: [],
         tomorrowPreparation: [],
         isExpired: true, // 期限切れフラグ
         message: "計画期間が終了しました。新しい計画を作成してください。"
       };
     }
   }
   ```

3. **キャッシュをチェック（状態固定のため）**
   ```typescript
   // 重要: キャッシュキーからuserIdを削除（plan中心にする）
   const cacheKey = `${planId}_${plan.version}_${localDate}_${timezone}`;
   const cache = await getCache(cacheKey);
   if (cache && 
       cache.planId === planId && 
       cache.planVersion === plan.version && 
       cache.timezone === timezone &&
       cache.localDate === localDate) {
     // キャッシュが有効な場合のみ使用（同じ日付の間は内容を固定）
     return cache.data;
   }
   ```

4. **weeklyPlansを導出（必須）**
   ```typescript
   // 重要: HomeではaiSuggestionの生成を行ってはならない（完全禁止）
   // Homeは必ずplan.formData + simulationResultからweeklyPlansを導出する
   const weeklyPlans = deriveWeeklyPlans(plan.formData, plan.simulationResult);
   
   // aiSuggestionは存在する場合のみ表示補助として利用可能（任意）
   const aiSuggestion = plan.aiSuggestion; // 計画ドキュメントから取得（存在する場合のみ）
   ```
   
   **deriveWeeklyPlans関数の実装**:
   ```typescript
   function deriveWeeklyPlans(
     formData: PlanFormData,
     simulationResult: SimulationResult
   ): WeeklyPlan[] {
     // formDataから投稿頻度を取得
     const weeklyFeedPosts = formData.weeklyFeedPosts;
     const weeklyReelPosts = formData.weeklyReelPosts;
     const weeklyStoryPosts = formData.weeklyStoryPosts;
     
     // 計画開始日から各週の日付範囲を計算
     const startDate = new Date(formData.startDate);
     const periodMonths = formData.periodMonths;
     const totalWeeks = periodMonths * 4;
     
     const weeklyPlans: WeeklyPlan[] = [];
     for (let week = 1; week <= totalWeeks; week++) {
       const weekStart = new Date(startDate);
       weekStart.setDate(startDate.getDate() + (week - 1) * 7);
       const weekEnd = new Date(weekStart);
       weekEnd.setDate(weekStart.getDate() + 6);
       
       // 投稿を週内に分散配置
       const tasks = distributePostsToWeek(
         week,
         weeklyFeedPosts,
         weeklyReelPosts,
         weeklyStoryPosts,
         weekStart
       );
       
       weeklyPlans.push({
         week,
         startDate: formatDate(weekStart),
         endDate: formatDate(weekEnd),
         tasks
       });
     }
     
     return weeklyPlans;
   }
   ```
   
   **weeklyPlans導出のパフォーマンス考慮**:
   - 導出ロジックは軽量な計算のみ（日付計算、配列操作）
   - 重い処理（AI生成など）は行わない
   - キャッシュがない場合でも、導出は数ミリ秒以内に完了する想定
   - パフォーマンス問題が発生した場合は、導出結果もキャッシュに保存することを検討

   **週番号の判定ルール（最重要）**:
   - 週番号の判定は`plan.startDate`を基準とする
   - `weekIndex = floor((localDate - startDate) / 7日)`
   - 0: 第1週、1: 第2週、2: 第3週、3: 第4週
   - **重要**: カレンダーの月曜ではない。計画開始日基準
   - これで「リアルタイム7日」が成立します
   
   ```typescript
   function getCurrentWeekIndex(startDate: Date, localDate: string, timezone: string): number {
     // localDateをDateオブジェクトに変換（タイムゾーン考慮）
     const [year, month, day] = localDate.split("-").map(Number);
     const localDateObj = new Date(year, month - 1, day);
     
     // 開始日をタイムゾーン考慮で取得
     const startDateObj = startDate instanceof Date 
       ? startDate 
       : startDate.toDate 
         ? startDate.toDate() 
         : new Date(startDate);
     
     // 日数の差分を計算
     const diffTime = localDateObj.getTime() - startDateObj.getTime();
     const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
     
     // 週番号を計算（0-indexed）
     const weekIndex = Math.floor(diffDays / 7);
     
     return Math.max(0, weekIndex); // 負の値は0に
   }
   ```

5. **データを生成**
   - **重要**: Homeの表示構造（monthlyGoals / weeklySchedule）はaiSuggestionを参照してはならない
   - これらは必ず`plan.formData`と`simulationResult`からサーバー側ロジックで導出する
   - `aiSuggestion`は説明文（解説・意図・アドバイス）表示にのみ使用可能。スケジュール構造の決定に使用してはならない
   - `monthlyGoals`: `plan.formData`と`simulationResult`から導出（必須）
   - `weeklySchedule`: 導出した`weeklyPlans`から今週の計画を取得（タイムゾーン考慮）
   - `todayTasks`: 導出した`weeklyPlans`から今日のタスクを抽出 → AIで投稿文生成（文章化のみ）
     - **重要**: `todayTasks`と`tomorrowPreparation`の生成は「localDate単位で1回のみ」とする
     - 判定はログインではなく、`homeAiSectionsCache`に`(planId + version + localDate + timezone)`のキャッシュが存在するかで決定する
     - **重要**: ログイン回数は関係ありません。キャッシュの有無だけが生成条件です
     - **「1日」の判定はUTCではなく`plan.timezone`のローカル日付を使用する**
       - キャッシュの有効期限は`00:00:00 (plan.timezone)`の日付変更で切り替える
       - サーバー時刻（UTC）は判定に使用してはならない
       - これを入れないと`23:30`に投稿中 → 途中で内容が変わります
   - `tomorrowPreparation`: 導出した`weeklyPlans`から明日のタスクを抽出 → AIで準備事項生成（文章化のみ）
   
   **todayTasksの抽出ロジック（最重要）**:
   `todayTasks`の抽出は以下の手順で行う：
   
   1. `localDate`を`plan.timezone`で取得
   2. `localDate`の曜日を取得（0=日〜6=土）
   3. 曜日を`weeklyPlans.tasks.day`にマッピング
      - 日→"日"
      - 月→"月"
      - 火→"火"
      - 水→"水"
      - 木→"木"
      - 金→"金"
      - 土→"土"
   4. 一致する`tasks`をすべて抽出
   
   **重要**: 一致するタスクが0件の場合、`todayTasks`は「休養日」として空配列を返す（AI生成を行わない）
   - これを書かないと、AIが勝手に「やること」を作ります
   
   ```typescript
   function extractTodayTasks(weeklyPlans: WeeklyPlan[], localDate: string, timezone: string): Task[] {
     // localDateから曜日を取得
     const [year, month, day] = localDate.split("-").map(Number);
     const dateObj = new Date(year, month - 1, day);
     const dayOfWeek = dateObj.getDay(); // 0=日, 1=月, ..., 6=土
     
     // 曜日を文字列に変換
     const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
     const todayDayName = dayNames[dayOfWeek];
     
     // 現在の週を取得（plan.startDate基準）
     const currentWeekIndex = getCurrentWeekIndex(plan.startDate, localDate, timezone);
     const currentWeek = weeklyPlans[currentWeekIndex];
     
     if (!currentWeek) {
       return []; // 週が存在しない場合は空配列
     }
     
     // 今日のタスクを抽出
     const todayTasks = currentWeek.tasks.filter(task => {
       // "月" "月曜" "月曜日" などに対応
       return task.day === todayDayName || 
              task.day.startsWith(todayDayName) || 
              task.day === `${todayDayName}曜`;
     });
     
     // 一致するタスクが0件の場合、空配列を返す（休養日）
     return todayTasks;
   }
   ```
   
   **HomeのAI生成の唯一の入力ソース**:
   - 「activePlanIdが指すplanのweeklyPlansから抽出した当日タスク」のみ
   - 投稿履歴、分析データ、過去AI結果を入力に使用してはならない
   
   **AIの役割（限定）**:
   - 投稿文の提案（文章化）
   - 準備内容の文章化
   - 補足アドバイス
   
   **AIの禁止役割**:
   - タスク決定
   - スケジュール変更
   - 今日やることの選定

6. **キャッシュに保存（状態固定のため）**
   ```typescript
   await saveCache(cacheKey, {
     planId,
     planVersion: plan.version,
     timezone,
     localDate, // 状態固定のためのキー
     data: generatedData
   });
   ```

#### 重要なポイント
- **activePlanIdが無い場合**: 空データを返す（ホームが空になるのは計画がない時だけ）
- **activePlanId不整合の自己修復**: `users.activePlanId`が存在するが`plan`が存在しない場合、APIは`user.activePlanId`を`null`に更新し、空データを返す（自己修復）
- **計画終了日の扱い**: 取得した`plan`の`endDate < localDate`の場合、そのplanは「期限切れ」とみなす。このとき表示用データは返さず、「新しい計画を作成してください」フラグを返す。`activePlanId`は変更しない（履歴保持のため）。期限切れplanに対して`todayTasks`/`tomorrowPreparation`の生成は行ってはならない
- **status検索は禁止**: `status: "active"`での検索は行わない（複数のactive計画が存在する可能性があるため）
- **aiSuggestionの生成は禁止**: HomeではaiSuggestionの生成を行ってはならない（完全禁止）
- **monthlyGoals/weeklyScheduleはaiSuggestionを参照しない**: これらは必ず`plan.formData + simulationResult`から導出する。aiSuggestionは説明文表示にのみ使用可能
- **weeklyPlansの導出**: 必ず`plan.formData + simulationResult`から導出する
- **週番号の判定**: `plan.startDate`を基準とする。`weekIndex = floor((localDate - startDate) / 7日)`。カレンダーの月曜ではない。計画開始日基準で「リアルタイム7日」が成立
- **今日のタスク抽出**: `localDate`の曜日を取得し、`weeklyPlans.tasks.day`にマッピングして一致するタスクを抽出。一致するタスクが0件の場合、`todayTasks`は「休養日」として空配列を返す（AI生成を行わない）
- **タイムゾーンは必ずplan.timezoneを使用**: Homeのローカル日付判定は必ず`plan.timezone`を使用する。`user.timezone`を参照してはならない（Cloud FunctionsはUTCで動くため重要）
- **状態固定**: 同じ`localDate`の間はホームの内容を変えない（リロードで内容が変わらない、0時跨ぎで崩れない）
- **1日1回生成**: `todayTasks`と`tomorrowPreparation`の生成は「localDate単位で1回のみ」。判定はログインではなく、キャッシュの有無で決定する
- **「1日」の判定**: UTCではなく`plan.timezone`のローカル日付を使用する。キャッシュの有効期限は`00:00:00 (plan.timezone)`の日付変更で切り替える。サーバー時刻（UTC）は判定に使用してはならない（23:30に投稿中 → 途中で内容が変わらないようにするため）
- **キャッシュキー**: `planId + plan.version + localDate + timezone`（userIdは含めない）
- **キャッシュは検証してから使用**: 計画ID・バージョン・タイムゾーン・ローカル日付を確認
- **計画が更新されると**: `version`が変わるため、新しいキャッシュが生成される（versionはホーム表示に影響する変更のみでインクリメント）
- **日付が変わると**: `localDate`が変わるため、新しいキャッシュが生成される
- **activePlan切替時**: 旧planIdに紐づくキャッシュをすべて無効化（削除）

---

## 実装の優先順位（正しい順番）

### Step 1: Single Active Plan制約の導入（最優先・必須）
- [ ] `users`コレクションに`activePlanId`フィールドを追加
- [ ] `users`コレクションに`timezone`フィールドを追加（デフォルト: "Asia/Tokyo"）
- [ ] 計画に`timezone`フィールドを追加（計画作成時のタイムゾーンを保存）
- [ ] 計画に`version`フィールドを追加（ホーム表示に影響する変更が発生した場合に必ずインクリメント）
- [ ] `/api/plans/start` APIを実装（Firestore Transaction使用）
  - 新plan作成、activePlanId更新、旧plan非アクティブ化を1トランザクションで実行
- [ ] 計画ページの「この計画で始める」ボタンを`/api/plans/start`経由に変更
  - **重要**: フロントからFirestoreに直接書き込まない

**重要**: このステップが完了するまで、次のステップに進まないこと。
**最重要**: 「計画を保存」と「現在を切り替える」は別APIにしてはいけない。必ず1トランザクションで実行する。

### Step 2: ホームAPIをactivePlanIdベースに書き換え（必須）
- [ ] `status: "active"`での検索を削除（禁止）
- [ ] `user.activePlanId`から計画を直接取得するように変更
- [ ] 計画が無い場合のみ空データを返す
- [ ] タイムゾーンを考慮したローカル日付の判定を実装
- [ ] `getLocalDate(timezone)`関数を実装（YYYY-MM-DD形式）
- [ ] `getLocalDateForDate(date, timezone)`関数を実装（特定のDateオブジェクトに対してタイムゾーンを考慮したローカル日付を取得）
- [ ] 状態固定の実装: 同じ`localDate`の間はホームの内容を変えない
- [ ] 計画終了日のチェック: `endDate < localDate`の場合、期限切れフラグを返す
- [ ] 週番号の判定: `plan.startDate`基準で`weekIndex = floor((localDate - startDate) / 7日)`を実装
- [ ] 今日のタスク抽出ロジック: 曜日マッピングとタスク抽出を実装

**重要**: キャッシュはまだ実装しない。まず整合性を確保する。
**重要**: 状態固定はUX改善ではなく、プロダクト成立条件です。

### Step 3: weeklyPlans導出とAI文章化機能（必須）
- [ ] `plan.formData + simulationResult`から`weeklyPlans`を導出する関数を実装
- [ ] **重要**: HomeではaiSuggestionの生成を行ってはならない（完全禁止）
- [ ] `monthlyGoals`: `plan.formData`と`simulationResult`から導出（必須。aiSuggestionを参照してはならない）
- [ ] `weeklySchedule`: 導出した`weeklyPlans`から今週の計画を取得（タイムゾーン考慮）
- [ ] 週番号の判定ロジックを実装: `plan.startDate`基準で`weekIndex = floor((localDate - startDate) / 7日)`
- [ ] `todayTasks`: 導出した`weeklyPlans`から今日のタスクを抽出 → AIで投稿文生成（文章化のみ）
  - [ ] 今日のタスク抽出ロジックを実装: `localDate`の曜日を取得し、`weeklyPlans.tasks.day`にマッピング
  - [ ] 一致するタスクが0件の場合、空配列を返す（休養日、AI生成を行わない）
- [ ] `tomorrowPreparation`: 導出した`weeklyPlans`から明日のタスクを抽出 → AIで準備事項生成（文章化のみ）
- [ ] **HomeのAI生成の唯一の入力ソース**: 「activePlanIdが指すplanのweeklyPlansから抽出した当日タスク」のみ
- [ ] **AIの役割を限定**: 投稿文の提案、準備内容の文章化、補足アドバイスのみ
- [ ] **AIの禁止役割**: タスク決定、スケジュール変更、今日やることの選定

### Step 4: キャッシュ導入（最後）
- [ ] キャッシュキーを`planId + plan.version + localDate + timezone`に変更（userIdを削除）
- [ ] キャッシュ使用前に計画ID・バージョン・タイムゾーン・ローカル日付を検証
- [ ] キャッシュに保存（状態固定のため）
- [ ] 同じ`localDate`の間は内容を固定することを確認
- [ ] `/api/plans/start`に旧planIdに紐づくhomeキャッシュ無効化を追加

**重要**: キャッシュは最後。いまの問題はパフォーマンスではなく整合性です。
**重要**: キャッシュは「計算コスト削減」と「状態固定」の両方の目的で使用します。
**重要**: キャッシュキーからuserIdを削除することで、activePlan切替＝キャッシュ自動断絶、別端末でも同じ内容、ホームの安定化を実現します。

### Step 5: 週切り替え機能（UI改善・オプション）
- [ ] ホームページに週切り替えUIを追加
- [ ] 選択された週の`weeklySchedule`を表示
- [ ] 週切り替え時に`todayTasks`と`tomorrowPreparation`も更新

---

## キャッシュ戦略

### キャッシュの役割
- **一次ソースではない**: 計画が一次ソース
- **計算コスト削減のための副次物**: AI生成のコスト削減のみ

### キャッシュストレージ
- **初期実装**: Firestore `homeAiSectionsCache`コレクション
  - ドキュメントID: `${planId}_${plan.version}_${localDate}_${timezone}`
  - フィールド: `planId`, `planVersion`, `timezone`, `localDate`, `data`, `createdAt`, `updatedAt`
- **将来的な選択肢**: Redis（スケール時）
  - より高速なアクセス
  - TTL管理が容易
  - ただし、状態固定の要件を満たす必要がある

### キャッシュキー（状態固定のため）
```typescript
// 重要: キャッシュキーからuserIdを削除（plan中心にする）
// 重要: Homeのローカル日付判定は必ずplan.timezoneを使用する
const timezone = plan.timezone || "Asia/Tokyo";
const localDate = getLocalDate(timezone); // タイムゾーンを考慮したローカル日付（YYYY-MM-DD）
const cacheKey = `${planId}_${plan.version}_${localDate}_${timezone}`;
```

**重要**: 
- `localDate`は「状態固定」のためのキーです
- 同じ`localDate`の間は、ホームの内容を変えない
- 日付が変わると`localDate`が変わるため、新しいキャッシュが生成される
- これにより、リロードで内容が変わらない、0時跨ぎで崩れない、投稿中に指示が変わらない
- **userIdを削除する理由**: Homeは「ユーザー」ではなく「現在の計画の実行状態ビュー」なので、キャッシュの主体はuserではなくplan
- **効果**: activePlan切替＝キャッシュ自動断絶、別端末でも同じ内容、ホームの安定化

### タイムゾーンの重要性
- **SNS運用ツールでは致命的に重要**: 「今日やること」を出すアプリのため、日付がロジックの中心
- **Cloud FunctionsはUTCで動く**: ユーザーがJSTの場合、00:30 JST = 前日15:30 UTCとなり、日付がズレる
- **解決策**: 計画に`timezone`を保存し、キャッシュキーと日付判定に使用
- **状態固定**: 同じ`localDate`の間はホームの内容を変えない（リロードで内容が変わらない、0時跨ぎで崩れない）

### タイムゾーン変更時の挙動

ユーザーがタイムゾーンを変更した場合の挙動を明確にします。

#### タイムゾーンの使用方針（最重要）

**Homeのローカル日付判定は必ず`plan.timezone`を使用する。**
- `plan`作成時に`user.timezone`を`plan.timezone`にコピーして固定する
- **Homeで`user.timezone`を参照してはならない**

これをやらないと：
- 海外出張時
- iPhone設定変更
- PCとスマホ併用

で「今日やることが昨日になる」が起きます。

#### タイムゾーンの優先順位（Home API）
1. **計画のタイムゾーン** (`plan.timezone`) - 計画作成時のタイムゾーンを保持（必須）
2. **デフォルト** (`"Asia/Tokyo"`) - フォールバック（plan.timezoneが存在しない場合のみ）

```typescript
// Home APIで使用（user.timezoneは参照しない）
const timezone = plan.timezone || "Asia/Tokyo";
```

#### タイムゾーン変更時の影響
- **既存の計画**: 作成時のタイムゾーン（`plan.timezone`）を保持
  - 計画作成後にユーザーがタイムゾーンを変更しても、既存計画のタイムゾーンは変わらない
  - これにより、計画期間中の一貫性が保たれる
- **新しい計画**: 計画作成時の`user.timezone`を`plan.timezone`にコピーして保存
- **ホームAPI**: 必ず`plan.timezone`を使用（`user.timezone`を参照しない）
- **キャッシュ**: `plan.timezone`ベースなので、タイムゾーン変更時に自動的に無効化される
  - キャッシュキーに`timezone`が含まれるため、タイムゾーンが変わると新しいキャッシュが生成される

#### 実装例
```typescript
// 計画作成時（/api/plans/start）
const planData = {
  ...otherData,
  timezone: user.timezone || "Asia/Tokyo", // 計画作成時のタイムゾーンを保存（固定）
};

// ホームAPIで使用（user.timezoneは参照しない）
const timezone = plan.timezone || "Asia/Tokyo";
const localDate = getLocalDate(timezone); // タイムゾーンを考慮したローカル日付
```

### 状態固定の重要性
- **UX改善ではなく、プロダクト成立条件**: 同じ日付の間はホームの内容を固定する
- **問題例**: 夜23:30に投稿準備中に、サーバーでは翌日になると「今日のタスクが消える」「明日の準備が今日に出る」
- **解決策**: `localDate`をキャッシュキーに含め、同じ日付の間は内容を変えない
- **効果**: リロードで内容が変わらない、0時跨ぎで崩れない、投稿中に指示が変わらない

### AIエンジンバージョンの管理（Homeでは使用しない）

**重要**: キャッシュキーから`aiEngineVersion`を削除しました。

理由:
- Homeは「計画を読む」だけの存在に固定する
- HomeのAIは「文章化」だけであり、計画生成ではない
- プロンプト改善は投稿文の品質に影響するが、計画自体には影響しない
- キャッシュキーは`planId + plan.version + localDate + timezone`のみ

**注意**: 計画ページでの`aiSuggestion`生成には`aiEngineVersion`を使用する（計画ページ専用の補助データのため）

### キャッシュの検証（状態固定のため）
```typescript
// 重要: キャッシュキーからuserIdを削除（plan中心にする）
// 重要: Homeのローカル日付判定は必ずplan.timezoneを使用する
const timezone = plan.timezone || "Asia/Tokyo";
const localDate = getLocalDate(timezone);
if (cache && 
    cache.planId === planId && 
    cache.planVersion === plan.version && 
    cache.timezone === timezone &&
    cache.localDate === localDate) {
  // キャッシュが有効（同じ日付の間は内容を固定）
  return cache.data;
}
// キャッシュが無効または存在しない場合は再生成
```

### キャッシュの無効化

#### 自動無効化
- 計画が更新されると`version`が変わる → 新しいキャッシュが生成される
- 日付が変わると`localDate`が変わる → 新しいキャッシュが生成される（状態固定のため）
- 古いキャッシュは自動的に無効化される（使用されない）
- **同じ`localDate`の間は内容を固定**: リロードで内容が変わらない、0時跨ぎで崩れない

#### activePlan切替時のキャッシュ無効化（必須）
**重要**: 旧planIdに紐づくhomeキャッシュをすべて無効化（削除）する必要があります。

**実装方法**:
```typescript
// 旧planIdに紐づくキャッシュを削除
async function invalidatePlanCache(oldPlanId: string) {
  const cacheRef = adminDb.collection("homeAiSectionsCache");
  
  // 旧planIdで始まるすべてのキャッシュを取得
  const snapshot = await cacheRef.where("planId", "==", oldPlanId).get();
  
  if (snapshot.empty) {
    return; // キャッシュが存在しない場合は何もしない
  }
  
  // バッチ削除（Firestoreは500件ずつ）
  const batch = adminDb.batch();
  let count = 0;
  
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    count++;
    
    // 500件に達したらコミットして新しいバッチを作成
    if (count >= 500) {
      await batch.commit();
      const batch = adminDb.batch();
      count = 0;
    }
  }
  
  // 残りのドキュメントをコミット
  if (count > 0) {
    await batch.commit();
  }
  
  console.log(`[Cache Invalidation] 旧計画のキャッシュを削除: planId=${oldPlanId}, count=${snapshot.size}`);
}
```

**実行タイミング**:
- `/api/plans/start`で新計画を開始した後（トランザクション外で非同期実行）
- 計画削除時（計画削除API内で実行）
- 注意: Firestore Transactionは500ドキュメント制限があるため、キャッシュ削除はトランザクション外で実行する

---

## エラーハンドリング

### 計画が存在しない場合
- 空データを返す（エラーではない）
- ホームページで「計画を作成しましょう」メッセージを表示

### aiSuggestionが無い場合
- **Homeでは生成しない**（完全禁止）
- `plan.formData + simulationResult`から`weeklyPlans`を導出して使用する
- `aiSuggestion`は存在する場合のみ表示補助として利用可能（任意）

### AI生成エラー

**基本方針**: AI生成が失敗しても、タスク情報は表示する。投稿文や準備事項が空になるだけ。

#### todayTasksのAI生成エラー
```typescript
try {
  const generatedContent = await generatePostContent(task, userProfile, aiDirection);
  task.generatedContent = generatedContent.text;
  task.generatedHashtags = generatedContent.hashtags;
} catch (error) {
  console.error("[Home API] 投稿文生成エラー:", error);
  // エラーでもタスク情報は表示（投稿文なし）
  task.generatedContent = null;
  task.generatedHashtags = null;
}
```

#### tomorrowPreparationのAI生成エラー
```typescript
try {
  const preparation = await generatePreparation(task, userProfile);
  task.preparation = preparation;
} catch (error) {
  console.error("[Home API] 準備事項生成エラー:", error);
  // エラーでもタスク情報は表示（準備事項なし）
  task.preparation = null;
}
```

#### エラーハンドリングの詳細
- **部分的な失敗**: 一部のタスクのAI生成が失敗した場合、成功したタスクのみ表示
- **完全な失敗**: すべてのAI生成が失敗した場合、タスク情報のみ表示（投稿文・準備事項なし）
- **エラーログ**: すべてのエラーをログに記録（監視サービスに送信）
- **ユーザーへの通知**: エラーが発生した場合、UIで「一部の情報を取得できませんでした」と表示（オプション）
- **リトライ**: AI生成はリトライしない（状態固定のため、同じ日付の間は内容を変えない）

---

## テストシナリオ

### シナリオ1: 計画作成 → ホーム表示
1. 計画ページで計画を作成（aiSuggestion含む）
2. ホームページに移動
3. 今月の目標と今週の予定が表示される
4. 今日やることと明日の準備が表示される

### シナリオ2: 計画更新 → ホーム更新
1. 計画ページで計画を更新
2. ホームページをリロード
3. 更新された内容が表示される

### シナリオ3: 計画削除 → ホーム空表示
1. 計画ページで計画を削除
2. ホームページに移動
3. 空データが表示される（エラーではない）

### シナリオ4: 計画作成（aiSuggestion無し） → ホーム表示
1. 計画ページで計画を作成（aiSuggestion無し）
2. ホームページに移動
3. `plan.formData + simulationResult`から`weeklyPlans`を導出
4. 今月の目標と今週の予定が表示される
5. **重要**: HomeではaiSuggestionの生成を行わない（完全禁止）

### シナリオ5: 計画更新 → ホーム更新
1. 計画ページで計画を更新（versionがインクリメント）
2. ホームページをリロード
3. 新しい`version`で新しいキャッシュが生成される
4. 更新された内容が表示される

---

## 移行計画

### 既存データの扱い
- 既存の計画で`aiSuggestion`が無い場合
- ホームページで自動的に再生成される（自己修復型）
- ユーザーは何もする必要がない

### 既存ユーザーのactivePlanId設定（重要）
既存ユーザーには`activePlanId`が設定されていないため、移行スクリプトが必要：

```typescript
// 移行スクリプト（一度だけ実行）
async function migrateActivePlanIds() {
  const users = await adminDb.collection("users").get();
  
  for (const userDoc of users.docs) {
    const user = userDoc.data();
    
    // 既にactivePlanIdがある場合はスキップ
    if (user.activePlanId) continue;
    
    // 最新のactive計画を取得（後方互換のため、一時的にstatus検索を使用）
    const activePlan = await adminDb
      .collection("plans")
      .where("userId", "==", userDoc.id)
      .where("snsType", "==", "instagram")
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();
    
    if (!activePlan.empty) {
      const planId = activePlan.docs[0].id;
      await adminDb.collection("users").doc(userDoc.id).update({
        activePlanId: planId,
        timezone: user.timezone || "Asia/Tokyo"
      });
    }
  }
}
```

### 後方互換性
- 既存のキャッシュは無視される（計画IDと更新日時で検証）
- 新しいキャッシュのみ使用される
- 移行期間中は`status: "active"`検索も許可（段階的移行）

---

## データ整合性とエッジケース

### activePlanIdが指す計画が存在しない場合
```typescript
const plan = await getPlan(user.activePlanId);
if (!plan) {
  // データ不整合を自動修復
  await adminDb.collection("users").doc(userId).update({
    activePlanId: null
  });
  return { monthlyGoals: [], weeklySchedule: null, todayTasks: [], tomorrowPreparation: [] };
}
```

### 計画期間が終了した場合

**⚠️ 重要**: ホームAPIで毎回`endDate`をチェックするのは非効率です。Cloud Functionsのスケジュール実行（cron）で定期チェックすることを推奨します。

#### 方法1: Cloud Functionsのスケジュール実行（推奨）
```typescript
// functions/src/index.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// 毎日0時（UTC）に実行されるCloud Function
export const checkExpiredPlans = functions.pubsub
  .schedule("0 0 * * *") // 毎日0時（UTC）
  .timeZone("UTC")
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    
    // 期間が終了した計画を取得
    const expiredPlans = await admin.firestore()
      .collection("plans")
      .where("endDate", "<=", now)
      .where("status", "==", "active")
      .get();
    
    if (expiredPlans.empty) {
      console.log("[Expired Plans Check] 期間終了した計画はありません");
      return null;
    }
    
    console.log(`[Expired Plans Check] ${expiredPlans.size}件の計画が期間終了しました`);
    
    // バッチ更新（500件ずつ）
    const batch = admin.firestore().batch();
    let count = 0;
    
    for (const planDoc of expiredPlans.docs) {
      const plan = planDoc.data();
      
      // ユーザーのactivePlanIdをクリア
      const userRef = admin.firestore().collection("users").doc(plan.userId);
      batch.update(userRef, { activePlanId: null });
      
      // 計画をcompletedに
      batch.update(planDoc.ref, { status: "completed" });
      
      count += 2; // ユーザー更新 + 計画更新
      
      // 500件に達したらコミット
      if (count >= 500) {
        await batch.commit();
        const batch = admin.firestore().batch();
        count = 0;
      }
    }
    
    // 残りをコミット
    if (count > 0) {
      await batch.commit();
    }
    
    console.log(`[Expired Plans Check] 完了: ${expiredPlans.size}件の計画を非アクティブ化`);
    return null;
  });
```

#### 方法2: ホームAPIでのチェック（フォールバック）
ホームAPIで毎回チェックするのは非効率ですが、フォールバックとして実装することも可能です。

```typescript
// /api/home/ai-generated-sections 内で
const plan = await getPlan(user.activePlanId);
if (!plan) {
  return { monthlyGoals: [], weeklySchedule: null, todayTasks: [], tomorrowPreparation: [] };
}

// 計画期間が終了している場合（フォールバック）
const now = new Date();
if (plan.endDate && now > plan.endDate) {
  // 非同期でactivePlanIdをクリア（エラーを返さない）
  adminDb.collection("users").doc(userId).update({
    activePlanId: null
  }).catch(err => {
    console.error("[Home API] 計画期間終了時のactivePlanIdクリアに失敗:", err);
  });
  
  // 計画のstatusも更新（非同期）
  adminDb.collection("plans").doc(planId).update({
    status: "completed"
  }).catch(err => {
    console.error("[Home API] 計画期間終了時のstatus更新に失敗:", err);
  });
  
  return { monthlyGoals: [], weeklySchedule: null, todayTasks: [], tomorrowPreparation: [] };
}
```

**推奨**: 方法1（Cloud Functionsのスケジュール実行）を使用し、方法2はフォールバックとして実装

### 並行更新の問題（競合処理）

複数のタブで同時に計画を更新した場合、楽観的ロックを使用して競合を防止します。

#### 計画更新時の楽観的ロック
```typescript
await adminDb.runTransaction(async (transaction) => {
  const planRef = adminDb.collection("plans").doc(planId);
  const planDoc = await transaction.get(planRef);
  const currentVersion = planDoc.data()?.version || 0;
  
  if (currentVersion !== expectedVersion) {
    throw new Error("計画が他の場所で更新されています。ページをリロードしてください。");
  }
  
  transaction.update(planRef, {
    ...updateData,
    version: currentVersion + 1,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
});
```

#### 新計画開始時の並行実行防止
`/api/plans/start`では、トランザクション内で現在のactivePlanIdを取得することで、並行実行時の競合を防止します（実装例は「新しいフロー」セクションを参照）。

### isAISuggestionOutdatedの実装
```typescript
function isAISuggestionOutdated(
  aiSuggestion: AIPlanSuggestion,
  currentAiEngineVersion: string
): boolean {
  // aiSuggestionにaiEngineVersionが保存されていない場合は古いと判定
  if (!aiSuggestion.aiEngineVersion) {
    return true;
  }
  
  // バージョンが異なる場合は古いと判定
  return aiSuggestion.aiEngineVersion !== currentAiEngineVersion;
}
```

### 計画削除時のactivePlanIdクリア
```typescript
// 計画削除API
async function deletePlan(planId: string, userId: string) {
  await adminDb.runTransaction(async (transaction) => {
    // 計画を削除
    const planRef = adminDb.collection("plans").doc(planId);
    transaction.delete(planRef);
    
    // ユーザーのactivePlanIdがこの計画を指している場合はクリア
    const userRef = adminDb.collection("users").doc(userId);
    const userDoc = await transaction.get(userRef);
    if (userDoc.data()?.activePlanId === planId) {
      transaction.update(userRef, {
        activePlanId: null
      });
    }
  });
}
```

---

## パフォーマンスと監視

### AI生成のタイムアウトとリトライ
```typescript
async function generateAISuggestionWithRetry(
  formData: PlanFormData,
  simulationResult: SimulationResult,
  maxRetries = 3,
  timeout = 30000 // 30秒
): Promise<AIPlanSuggestion> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await Promise.race([
        generateAISuggestion(formData, simulationResult),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("タイムアウト")), timeout)
        )
      ]);
      return result;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // 指数バックオフ
    }
  }
  throw new Error("AI生成に失敗しました");
}
```

### 監視とロギング
```typescript
// 重要なイベントをログに記録
console.log("[Home API] アクティブ計画取得", {
  userId,
  activePlanId: user.activePlanId,
  hasPlan: !!plan,
  hasAiSuggestion: !!plan?.aiSuggestion,
  aiEngineVersion: getAIEngineVersion(),
  timezone
});

// エラーを監視
if (error) {
  console.error("[Home API] エラー", {
    userId,
    error: error.message,
    stack: error.stack
  });
  // エラー監視サービスに送信（例: Sentry）
}
```

### パフォーマンスメトリクス
- AI生成時間の計測
- キャッシュヒット率の計測
- API応答時間の計測

---

## セキュリティ

### activePlanIdの改ざん防止
- サーバーサイドでのみ`activePlanId`を更新
- クライアントからの`activePlanId`直接更新は禁止
- Firestore Security Rulesで保護

```javascript
// firestore.rules
match /users/{userId} {
  allow read: if request.auth.uid == userId;
  allow update: if request.auth.uid == userId 
    && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['activePlanId']);
  // activePlanIdはサーバーサイドでのみ更新可能
}
```

---

## ロールバック戦略

### 問題が起きた場合のロールバック
1. **環境変数のロールバック**: `AI_ENGINE_VERSION`を前のバージョンに戻す
2. **コードのロールバック**: 前のバージョンにデプロイ
3. **データの修復**: 移行スクリプトを再実行して`activePlanId`を修復

### 段階的ロールアウト
1. 10%のユーザーに新設計を適用
2. 問題が無ければ50%に拡大
3. 問題が無ければ100%に拡大
4. 問題が起きた場合は即座にロールバック

---

## 最終的な構造

```
[Plan]  ← 唯一の真実
   ├ formData（ユーザー入力）
   └ simulationResult（ロジック計算）
   ↓
[Derived Layer]  ← 派生データ（再生成可能）
  ├ aiSuggestion（戦略）
  ├ todayTasks（実行）
  └ tomorrowPrep（準備）
   ↓
[Home View]  ← 計画の実行インターフェース
```

## まとめ

### 変更点
1. **計画を2層構造に分離**
   - 真実の層: `PlanFormData` + `SimulationResult`
   - 派生の層: `aiSuggestion`（再生成可能）

2. **aiSuggestionは「保存していい」が「真実ではない」**
   - 計画の「コンパイル結果」であり、ソースコードではない
   - AIモデル変更・プロンプト改善時に再生成可能

3. **ホームページAPIを計画主導に変更**
   - `plan.formData + simulationResult`から`weeklyPlans`を導出（必須）
   - **最重要**: `monthlyGoals`と`weeklySchedule`はaiSuggestionを参照してはならない。必ず`plan.formData + simulationResult`から導出する
   - `aiSuggestion`は説明文（解説・意図・アドバイス）表示にのみ使用可能。スケジュール構造の決定に使用してはならない
   - **重要**: HomeではaiSuggestionの生成を行ってはならない（完全禁止）
   - ホームが空になるのは計画がない時だけ

4. **タイムゾーンは必ずplan.timezoneを使用**
   - Homeのローカル日付判定は必ず`plan.timezone`を使用する
   - `user.timezone`を参照してはならない（端末設定変更時の不整合を防ぐため）

5. **versionの責務を明確化**
   - `plan.version`は「ホーム表示に影響する変更」が発生した場合に必ずインクリメントする
   - 投稿頻度、期間、開始日、simulationResult再計算など
   - `aiSuggestion`の再生成のみではversionは変更しない
   - Homeの再描画トリガーは`version`だけに固定

6. **キャッシュキーにAIエンジンバージョンを含める**
   - プロンプト改善時に自動的に再生成される

7. **キャッシュは副次物として扱う**
   - 計画が一次ソース（Source of Truth）

8. **activePlanId不整合の自己修復**
   - `users.activePlanId`が存在するが`plan`が存在しない場合、APIは`user.activePlanId`を`null`に更新し、空データを返す（自己修復）

9. **1日1回生成のトリガー**
   - `todayTasks`と`tomorrowPreparation`の生成は「localDate単位で1回のみ」
   - 判定はログインではなく、キャッシュの有無で決定する

### 期待される効果
- **整合性の保証**: Single Active Plan制約により、ホームが常に正しい計画を表示
- **自己修復機能**: 古いデータ・消えたデータ・不完全データが自動的に復元される
- **タイムゾーン対応**: 計画のタイムゾーン（`plan.timezone`）で正確な「今日」を判定（端末設定変更の影響を受けない）
- **計画更新時の自動反映**: 計画を更新するとホームが自動的に更新される
- **計画削除時の自動反映**: 計画を削除するとホームが自動的に空になる
- **計画作成時の自動反映**: 計画を新規作成するとホームが自動的に表示される
- **AI改善の自動反映**: AIエンジン更新時に自動的に再生成される
- **不要な仕組みの削除**: localStorage、ポーリング、リダイレクトが不要になる
- **過去データの保護**: 過去データが壊れない（常に最新のAIエンジンで再生成可能）

### この設計の重要性
これは「バグ修正」ではなく、**Signal.がツールになるか、壊れ続けるかの分岐点の設計**です。

今回の設計が通ると、次に作る「毎日ログ」「進捗可視化」「自動改善提案」も全部つながります。
逆にここを曖昧にしたまま機能を増やすと、必ず破綻します。

### 実装の分岐点（最重要）

**この設計を成立させるための必須条件**:

1. **「この計画で始める」ボタンはフロントからFirestoreに書き込んではいけない**
   - 必ず **BFF（Cloud Functions / Route Handler）経由のトランザクション** にしてください

2. **Homeは「Planを読む」だけの存在に固定する**
   - Planを生成しない
   - Planを補完しない
   - Planを推測しない
   - Planを再構築しない

3. **HomeのAIは「文章化」だけ**
   - 投稿文の提案、準備内容の文章化、補足アドバイスのみ
   - タスク決定、スケジュール変更、今日やることの選定は禁止

4. **キャッシュキーからuserIdを削除**
   - `planId + plan.version + localDate + timezone`のみ
   - activePlan切替＝キャッシュ自動断絶を実現

5. **activePlan切替時に旧キャッシュを無効化**
   - 旧planIdに紐づくhomeキャッシュをすべて削除

これを守れば、今回の再設計は機能します。
守らなければ、キャッシュ設計がどれだけ正しくても壊れます。

**ここが、今回のアーキテクチャの分岐点です。**

### 仕様の1行まとめ

**Homeは「計画を表示するページ」ではなく、"現在実行中のPlanの当日タスク実行ビュー"**

そして技術的ルールは1つだけ覚えてください。

**Homeは「Planを読む」だけの存在に固定する**
- Planを生成しない
- Planを補完しない
- Planを推測しない
- Planを再構築しない

ここを破った瞬間、今回の「古いデータが出る問題」は100%再発します。

### 概念の整理

| 概念 | Signal.での正体 |
|------|----------------|
| Source code | `formData` + `simulationResult` |
| Compiler | AI生成 |
| Build artifact | `aiSuggestion` |
| Runtime | Home |
| Process | 今日のタスク |

つまりホームは「AI表示画面」ではありません。**運用の実行環境（Runtime）**です。

### 次のステップ
1. Step 1の実装（Single Active Plan制約 + 状態遷移の原子性）
2. Step 2の実装（ホームAPIをactivePlanIdベースに書き換え + 状態固定）
3. Step 3の実装（aiSuggestion自己生成機能）
4. Step 4の実装（キャッシュ導入）
5. Step 5の実装（週切り替え機能）

