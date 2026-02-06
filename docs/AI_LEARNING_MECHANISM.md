# AI学習メカニズム詳細ドキュメント

作成日: 2026-01-30

## 概要

このドキュメントでは、サイドバーにリンクされている各ページで、AIがどのように学習していくのか、具体的にどのページで何をしたらどう学習するのかを詳しく説明します。

「使えば使うほどAIが学習しますよ」という機能の具体的な仕組みを可視化します。

---

## AI学習の全体像

### 学習データの種類

AIは以下の4種類のデータを学習に使用します：

1. **フィードバック** (`ai_post_feedback`)
   - ユーザーが投稿に対して「満足/不満足」を選択
   - コメントを追加可能

2. **アクションログ** (`ai_action_logs`)
   - AIが提案したアクションを実行したかどうか
   - 実行結果の効果（パーセンテージ）

3. **投稿スナップショット** (`postPerformanceSnapshots`)
   - 投稿のパフォーマンスを自動的に記録
   - 成功（gold）、改善（negative）、参考（normal）の3段階

4. **マスターコンテキスト** (`ai_master_context_cache`)
   - 上記データを集約・分析した学習状態
   - 学習フェーズ（初期期/成長期/成熟期/マスター期）

### 学習データの流れ

```
ユーザーの行動
    ↓
学習データの収集（各ページ）
    ↓
Firestoreに保存
    ↓
マスターコンテキストの更新（バックグラウンド）
    ↓
AI生成時に参照（buildAIContext）
    ↓
AIプロンプトに組み込まれる
    ↓
より良い投稿・提案の生成
```

---

## 各ページでの学習データ収集

### 1. 投稿一覧 (`/instagram/posts`)

**学習データ**: なし（直接的な収集はなし）

**備考**: 
- 投稿の表示のみ
- 学習データの収集は行わないが、AI生成時に投稿データを参照

---

### 2. 投稿分析ページ（フィード/リール）

**ページ**: `/analytics/feed` または `/analytics/reel`

**学習データ**: **フィードバック**

#### 何をしたら学習するか

1. **投稿分析データを保存する**
   - 分析ページで「満足」または「不満足」を選択
   - メモを追加（任意）

#### 具体的な操作

```
1. 投稿一覧から投稿を選択
2. 分析データ（リーチ、いいね、コメントなど）を入力
3. 「満足」または「不満足」を選択
4. メモを入力（任意）
5. 「保存」ボタンをクリック
```

#### 保存されるデータ

**コレクション**: `ai_post_feedback`

```typescript
{
  userId: string;
  postId: string;
  sentiment: "positive" | "negative" | "neutral"; // 満足→positive, 不満足→negative
  comment: string; // メモ
  weight: number; // デフォルト1
  createdAt: Timestamp;
}
```

#### 学習への反映

- **即座**: フィードバックは即座に保存される
- **AI生成時**: 次回の投稿生成時に、過去のフィードバックを参照
- **マスターコンテキスト**: バックグラウンドで集計され、学習フェーズの判定に使用

#### コード実装

**ファイル**: `src/app/analytics/feed/page.tsx` (672-701行目)

```typescript
// フィードバックを保存
const feedbackResponse = await fetch("/api/ai/feedback", {
  method: "POST",
  body: JSON.stringify({
    userId: user.uid,
    postId: postData.id,
    sentiment: sentimentMap[sentimentData.sentiment], // "positive" or "negative"
    comment: sentimentData.memo?.trim() || undefined,
  }),
});
```

---

### 3. 学習ダッシュボード (`/learning`)

**学習データ**: **アクションログ**

#### 何をしたら学習するか

1. **AIが提案したアクションを実行済みにマークする**
   - 学習ダッシュボードで「次のアクション」のチェックボックスをON/OFF
   - 効果（パーセンテージ）を記録（任意）
   - フィードバック（メモ）を追加（任意）

#### 具体的な操作

```
1. 学習ダッシュボードを開く
2. 「投稿詳細分析」セクションで投稿を選択
3. 「AIサマリーを生成」ボタンをクリック（初回のみ）
4. 「次のアクション」リストが表示される
5. 実行したアクションのチェックボックスをONにする
6. （任意）効果を記録、メモを追加
```

#### 保存されるデータ

**コレクション**: `ai_action_logs`

```typescript
{
  userId: string;
  actionId: string; // 例: "learning-post-123-next-0"
  title: string; // アクションのタイトル
  focusArea: string; // 例: "learning-post-123"
  applied: boolean; // 実行済みかどうか
  resultDelta: number | null; // 効果（パーセンテージ）
  feedback: string; // メモ
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 学習への反映

- **即座**: アクションログは即座に保存される
- **AI生成時**: 次回の投稿生成時に、過去のアクションログを参照
  - 実行済みのアクションは「成功した施策」として参照
  - 未実行のアクションは「まだ試していない施策」として参照
- **マスターコンテキスト**: バックグラウンドで集計され、採用率（adoptionRate）を計算

#### コード実装

**ファイル**: `src/app/learning/page.tsx` (74-123行目)

```typescript
const handleActionLogToggle = useCallback(
  async ({ actionId, title, focusArea, applied }) => {
    await actionLogsApi.upsert({
      userId: user.uid,
      actionId,
      title,
      focusArea,
      applied,
    });
  },
  [user?.uid]
);
```

---

### 4. 投稿ラボ（フィード/リール/ストーリー）

**ページ**: `/instagram/lab/feed`, `/instagram/lab/reel`, `/instagram/lab/story`

**学習データ**: **間接的**（AI生成時に過去の学習データを参照）

#### 何をしたら学習するか

1. **AI生成機能を使用する**
   - 投稿を生成すると、過去の学習データが参照される
   - 生成された投稿のパフォーマンスが後でスナップショットとして記録される

#### 具体的な操作

```
1. 投稿ラボを開く
2. 「AI生成」ボタンをクリック
3. プロンプトを入力（任意）
4. 投稿が生成される
```

#### 学習データの参照

**AI生成時に参照されるデータ**:

1. **スナップショット参照** (`snapshotReferences`)
   - 過去の成功投稿（gold）
   - 過去の改善が必要だった投稿（negative）
   - 参考になる投稿（normal）

2. **アクションログ** (`actionLogs`)
   - 実行済みのアクション
   - 効果があった施策

3. **フィードバック** (マスターコンテキスト経由)
   - 過去のフィードバック統計
   - ポジティブ率

#### コード実装

**ファイル**: `src/app/api/ai/post-generation/route.ts` (119-123行目)

```typescript
const contextResult = await buildAIContext(userId, {
  snapshotLimit: 3,
  includeMasterContext: true,
});
const snapshotReferences = contextResult.snapshotReferences;
const aiReferences = contextResult.references;
```

**AIプロンプトへの組み込み** (497-520行目):

```typescript
if (snapshotReferences.length > 0) {
  const snapshotSummary = snapshotReferences
    .map((snapshot) => {
      const statusLabel = snapshot.status === "gold" ? "成功" : snapshot.status === "negative" ? "改善" : "参考";
      return `${statusLabel}: ${snapshot.title || "無題"}（${snapshot.summary}）`;
    })
    .join("\n");

  systemPrompt += `

【過去の投稿実績（参考）】
${snapshotSummary}

上記の成功例を参考に、同様のアプローチを取ってください。
改善が必要だった投稿のパターンは避けてください。`;
}
```

---

### 5. 月次レポート (`/instagram/report`)

**学習データ**: **間接的**（レポート生成時に学習データを参照）

#### 何をしたら学習するか

1. **月次レポートを表示する**
   - レポート生成時に、過去の学習データが参照される
   - レポートに「AI学習リファレンス」セクションが表示される

#### 具体的な操作

```
1. 月次レポートページを開く
2. 月を選択（デフォルトは現在の月）
3. レポートが生成される
```

#### 学習データの参照

**レポート生成時に参照されるデータ**:

1. **スナップショット参照** (最大10件)
   - 成功投稿（gold）
   - 改善が必要だった投稿（negative）

2. **マスターコンテキスト**
   - 学習フェーズ
   - フィードバック統計
   - アクション統計

3. **AIリファレンス**
   - プロフィール情報
   - 運用計画
   - 過去のアクションログ

#### コード実装

**ファイル**: `src/app/api/analytics/report-complete/route.ts` (779-807行目)

```typescript
const aiContextBundle = await buildAIContext(uid, {
  includeUserProfile: true,
  includePlan: true,
  includeSnapshots: true,
  includeMasterContext: true,
  includeActionLogs: false,
  includeAbTests: false,
  snapshotLimit: 10,
});

const aiLearningReferences = {
  masterContext: aiContextBundle.masterContext || null,
  references: aiContextBundle.references || [],
  snapshotReferences: filteredSnapshotRefs,
};
```

---

### 6. ホーム (`/home`)

**学習データ**: **なし**（直接的な収集はなし）

**備考**: 
- ダッシュボードの表示のみ
- 学習データの収集は行わない

---

### 7. 運用計画 (`/instagram/plan`)

**学習データ**: **間接的**（計画生成時に学習データを参照）

#### 何をしたら学習するか

1. **運用計画を生成する**
   - 計画生成時に、過去の学習データが参照される可能性がある

#### 備考

- 現在の実装では、運用計画生成時に学習データを直接参照していない
- 将来的に学習データを活用する可能性がある

---

### 8. KPIコンソール (`/instagram/kpi`)

**学習データ**: **なし**（直接的な収集はなし）

**備考**: 
- KPIデータの表示のみ
- 学習データの収集は行わない

---

## 自動的な学習データ収集

### 投稿スナップショット（自動生成）

**タイミング**: バックグラウンドで自動生成

**コレクション**: `users/{userId}/postPerformanceSnapshots`

#### 何が自動で記録されるか

1. **投稿のパフォーマンス分析**
   - 過去90日間の投稿データを分析
   - エンゲージメント率、保存率、リーチを評価
   - Zスコアを計算して、成功（gold）、改善（negative）、参考（normal）を判定

#### 保存されるデータ

```typescript
{
  userId: string;
  postId: string;
  status: "gold" | "negative" | "normal";
  score: number; // Zスコア（-3〜3の範囲）
  metrics: {
    engagementRate: number;
    saveRate: number;
    reach: number;
    saves: number;
  };
  deltaMetrics: {
    saveRateDeltaPct: number;
    engagementRateDeltaPct: number;
    reachDelta: number;
  };
  textFeatures: {
    // 投稿文の特徴（文字数、ハッシュタグ数など）
  };
  source: {
    title: string;
    postType: "feed" | "reel" | "story";
    hashtags: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}
```

#### 判定基準

- **gold（成功）**: Zスコア >= 1.0
- **negative（改善）**: Zスコア <= -1.0
- **normal（参考）**: -1.0 < Zスコア < 1.0

#### コード実装

**ファイル**: `src/lib/analytics/snapshot-generator.ts`

```typescript
export async function generatePostPerformanceSnapshots(
  userId: string,
  options: SnapshotGenerationOptions = {}
) {
  // 過去90日間の投稿データを取得
  // Zスコアを計算
  // gold/negative/normalを判定
  // スナップショットを保存
}
```

---

## 学習データの活用方法

### AI生成時の参照フロー

```
1. ユーザーが投稿生成をリクエスト
    ↓
2. buildAIContext() が呼ばれる
    ↓
3. 以下のデータを取得:
   - スナップショット参照（成功/改善/参考投稿）
   - アクションログ（実行済み/未実行の施策）
   - マスターコンテキスト（学習フェーズ、統計）
    ↓
4. AIプロンプトに組み込まれる
    ↓
5. OpenAI APIに送信
    ↓
6. より良い投稿が生成される
```

### 具体的なプロンプトへの組み込み例

#### スナップショット参照の組み込み

```typescript
if (snapshotReferences.length > 0) {
  systemPrompt += `

【過去の投稿実績（参考）】
${snapshotReferences.map(snapshot => {
  const statusLabel = snapshot.status === "gold" ? "成功" : 
                      snapshot.status === "negative" ? "改善" : "参考";
  return `${statusLabel}: ${snapshot.title}（${snapshot.summary}）`;
}).join("\n")}

上記の成功例を参考に、同様のアプローチを取ってください。
改善が必要だった投稿のパターンは避けてください。`;
}
```

#### アクションログの組み込み

```typescript
if (actionLogs.length > 0) {
  const appliedActions = actionLogs.filter(log => log.applied);
  const notAppliedActions = actionLogs.filter(log => !log.applied);
  
  if (appliedActions.length > 0) {
    systemPrompt += `

【成功した施策（過去に実行済み）】
${appliedActions.map(log => `- ${log.title}（効果: ${log.resultDelta}%）`).join("\n")}

これらの施策は効果があったため、同様のアプローチを推奨します。`;
  }
  
  if (notAppliedActions.length > 0) {
    systemPrompt += `

【まだ試していない施策】
${notAppliedActions.map(log => `- ${log.title}`).join("\n")}

これらの施策はまだ試していないため、検討の余地があります。`;
  }
}
```

---

## 学習フェーズの進化

### マスターコンテキスト

**コレクション**: `ai_master_context_cache`

マスターコンテキストは、すべての学習データを集約・分析した結果です。

#### 学習フェーズ

1. **初期期** (`initial`)
   - フィードバック: 0-3件
   - 特徴: まだ学習データが少ない

2. **成長期** (`learning`)
   - フィードバック: 4-7件
   - 特徴: 学習データが蓄積され始める

3. **成熟期** (`optimized`)
   - フィードバック: 8-11件
   - 特徴: 十分な学習データが蓄積されている

4. **マスター期** (`master`)
   - フィードバック: 12件以上
   - 特徴: 最適化された状態

#### 統計データ

```typescript
{
  learningPhase: "initial" | "learning" | "optimized" | "master";
  ragHitRate: number; // RAG（検索）のヒット率
  totalInteractions: number; // 総インタラクション数
  feedbackStats: {
    total: number;
    positiveRate: number; // ポジティブフィードバックの割合
    averageWeight: number;
  };
  actionStats: {
    total: number;
    adoptionRate: number; // アクションの採用率
    averageResultDelta: number; // 平均効果
  };
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    status: string;
    progress: number;
  }>;
}
```

---

## 学習の可視化

### 学習ダッシュボード (`/learning`)

学習ダッシュボードでは、以下の情報を確認できます：

1. **学習フェーズ**
   - 現在のフェーズ（初期期/成長期/成熟期/マスター期）
   - 次のフェーズへの進捗

2. **フィードバック履歴**
   - 過去のフィードバック一覧
   - ポジティブ/ネガティブ/ニュートラルの割合

3. **アクション履歴**
   - 実行済み/未実行のアクション一覧
   - 効果の記録

4. **投稿パターン分析**
   - 成功パターン
   - 改善パターン
   - ハッシュタグ分析

5. **AI学習リファレンス**
   - 現在AIが参照している学習データ
   - スナップショット参照
   - アクションログ

---

## まとめ

### 学習データを収集するページ

| ページ | 学習データ | 操作 |
|--------|----------|------|
| 投稿分析（フィード/リール） | フィードバック | 「満足/不満足」を選択して保存 |
| 学習ダッシュボード | アクションログ | アクションのチェックボックスをON/OFF |
| 投稿ラボ | 間接的（参照のみ） | AI生成を使用 |
| 月次レポート | 間接的（参照のみ） | レポートを表示 |

### 自動的に収集されるデータ

- **投稿スナップショット**: バックグラウンドで自動生成（過去90日間の投稿を分析）

### 学習の効果

1. **即座の効果**
   - フィードバックやアクションログは即座に保存される
   - 次回のAI生成から参照される

2. **段階的な効果**
   - 学習データが蓄積されるにつれて、AIの提案がより精度が高くなる
   - 学習フェーズが進むと、より最適化された提案が生成される

3. **長期的な効果**
   - マスター期に到達すると、AIはユーザーの好みや成功パターンを深く理解している
   - よりパーソナライズされた投稿が生成される

---

## よくある質問

### Q: フィードバックを何件くらい送れば効果が出ますか？

A: 4件以上のフィードバックで「成長期」に進み、8件以上で「成熟期」、12件以上で「マスター期」になります。ただし、1件でも次回のAI生成から参照されます。

### Q: アクションログは必須ですか？

A: 必須ではありませんが、実行済みのアクションを記録することで、AIは「成功した施策」を学習し、より良い提案ができるようになります。

### Q: スナップショットはいつ生成されますか？

A: バックグラウンドで自動生成されます。投稿分析データが保存されると、自動的にスナップショットが生成されます。

### Q: 学習データはどこで確認できますか？

A: 学習ダッシュボード (`/learning`) で確認できます。フィードバック履歴、アクション履歴、学習フェーズなどを確認できます。

---

## 参考資料

- [Onboarding参照分析](./ONBOARDING_REFERENCE_ANALYSIS.md)
- [学習ダッシュボード詳細](../product/LEARNING_PAGE_DETAILS.md)
- [アクションログAPI](../dev/report/アクションログAPI.md)

