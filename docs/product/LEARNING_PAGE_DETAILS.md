# /learningページ 詳細仕様書

## 📋 ページ概要

`/learning`ページは、AIとの学習状況を可視化し、投稿パターンの分析、フィードバック履歴、アクション実行ログを統合的に管理する学習ダッシュボードです。AIが学習したパターンや提案の採用状況を追跡し、継続的な改善をサポートします。

**URL**: `/learning`  
**レイアウト**: `SNSLayout`  
**認証**: 必須（`useAuth`フックを使用）

---

## 🏗️ コンポーネントツリー構造

```
LearningDashboardPage (src/app/learning/page.tsx)
├── SNSLayout
│   └── サイドバー + メインコンテンツエリア
└── メインコンテンツ
    ├── AIとの学習状況セクション（インライン）
    │   ├── 学習フェーズ表示
    │   ├── RAG精度表示
    │   ├── 蓄積分析件数表示
    │   └── 最新履歴再取得ボタン
    ├── LearningReferenceCard (src/app/instagram/monthly-report/components/learning-reference-card.tsx)
    │   ├── マスターコンテキストサマリー
    │   ├── スナップショット参照
    │   └── AI参照データ
    ├── 学習バッジセクション（インライン）
    │   └── バッジグリッド（達成済み/進行中）
    ├── 学習進捗タイムラインセクション（インライン）
    │   ├── 月次/週次切り替えボタン
    │   ├── Recharts LineChart（ポジティブ率・提案採用率）
    │   └── 最新期間の統計カード
    ├── SuccessImprovementGallery (src/app/learning/components/SuccessImprovementGallery.tsx)
    │   ├── 成功パターン（GOLD）グリッド
    │   └── 改善優先パターン（RED）グリッド
    ├── PostPatternLearningSection (src/app/learning/components/PostPatternLearningSection.tsx)
    │   ├── パターンタグ別カード（gold/gray/red/neutral）
    │   └── よく使われたハッシュタグ一覧
    ├── PostDeepDiveSection (src/app/learning/components/PostDeepDiveSection.tsx)
    │   └── 投稿ごとのディープダイブカード（最大10件）
    └── HistorySection (src/app/learning/components/HistorySection.tsx)
        ├── 最近のフィードバック一覧
        └── アクション実行ログ一覧
```

---

## 📊 データ取得元とAPIエンドポイント

### 1. **マスターコンテキスト（メインの学習データ）**

**API**: `GET /api/ai/master-context?userId={userId}&forceRefresh={0|1}`

**データソース**:
- Firestore `analytics`コレクション（投稿分析データ）
- Firestore `posts`コレクション（投稿データ）
- Firestore `ai_post_feedback`コレクション（フィードバックデータ）
- Firestore `ai_action_logs`コレクション（アクションログ）
- Firestore `snapshots`コレクション（スナップショットデータ）
- `getMasterContext()`関数（月次分析ルートから）
- `buildAIContext()`関数（AIコンテキスト構築）

**取得データ**:
```typescript
{
  success: boolean;
  data: {
    learningPhase: "initial" | "learning" | "optimized" | "master";
    ragHitRate: number; // 0-1
    totalInteractions: number;
    personalizedInsights: string[];
    recommendations: string[];
    postPatterns: {
      summaries: Partial<Record<"gold" | "gray" | "red" | "neutral", PatternSummary>>;
      topHashtags: Record<string, number>;
      signals: PatternSignal[]; // 最大24件
    } | null;
    timeline: LearningTimelinePoint[] | null; // 月次
    weeklyTimeline: LearningTimelinePoint[] | null; // 週次
    achievements: LearningBadge[] | null;
    postInsights: Record<string, PostInsight> | null;
    learningContext: {
      references?: AIReference[];
      snapshotReferences?: SnapshotReference[];
      masterContext?: {
        learningPhase?: string;
        ragHitRate?: number;
        totalInteractions?: number;
        feedbackStats?: {
          total?: number;
          positiveRate?: number;
        } | null;
        actionStats?: {
          total?: number;
          adoptionRate?: number;
          averageResultDelta?: number | null;
        } | null;
        achievements?: LearningBadge[] | null;
      } | null;
    } | null;
    lastUpdated: string | null; // ISO形式
  } | null;
}
```

**使用箇所**:
- ページ全体の学習データの基盤
- 投稿パターン分析、タイムライン、バッジ、学習フェーズなどすべてのセクションで使用

---

### 2. **フィードバック履歴**

**API**: `GET /api/ai/feedback?userId={userId}&limit={limit}`

**データソース**:
- Firestore `ai_post_feedback`コレクション
  - `userId`でフィルタ
  - `createdAt`で降順ソート
  - 最大100件（デフォルト20件）

**取得データ**:
```typescript
{
  success: boolean;
  data: Array<{
    id: string;
    userId: string;
    postId: string;
    sentiment: "positive" | "negative" | "neutral";
    comment: string;
    aiLabel: string;
    weight: number;
    createdAt: string | null; // ISO形式
  }>;
}
```

**使用箇所**:
- `HistorySection`コンポーネントで表示
- 最新10件を表示

---

### 3. **アクションログ履歴**

**API**: `GET /api/ai/action-logs?userId={userId}&limit={limit}`

**データソース**:
- Firestore `ai_action_logs`コレクション
  - `userId`でフィルタ
  - `updatedAt`で降順ソート
  - 最大100件（デフォルト20件）

**取得データ**:
```typescript
{
  success: boolean;
  data: Array<{
    id: string;
    userId: string;
    actionId: string;
    title: string;
    focusArea: string;
    applied: boolean;
    resultDelta: number | null;
    feedback: string;
    createdAt: string | null; // ISO形式
    updatedAt: string | null; // ISO形式
  }>;
}
```

**使用箇所**:
- `HistorySection`コンポーネントで表示
- `PostDeepDiveSection`でアクションの実行状況をチェックボックスで管理
- 最新10件を表示

---

### 4. **投稿AIサマリー生成**

**API**: `POST /api/ai/post-insight`

**リクエストボディ**:
```typescript
{
  userId: string;
  postId: string;
  forceRefresh?: boolean;
}
```

**データソース**:
- `getMasterContext()`から投稿パターンデータを取得
- OpenAI API（`gpt-4o-mini`）で投稿の強み・改善点・次のアクションを生成

**取得データ**:
```typescript
{
  success: boolean;
  data: {
    summary: string;
    strengths: string[];
    improvements: string[];
    nextActions: string[];
  };
}
```

**使用箇所**:
- `PostDeepDiveSection`で各投稿のAIサマリーを表示
- ユーザーが「AIサマリーを生成」ボタンをクリックしたときに生成

---

### 5. **アクションログ更新**

**API**: `POST /api/ai/action-logs`（`actionLogsApi.upsert()`経由）

**リクエストボディ**:
```typescript
{
  userId: string;
  actionId: string;
  title: string;
  focusArea?: string;
  applied: boolean;
  resultDelta?: number | null;
  feedback?: string;
}
```

**データソース**:
- Firestore `ai_action_logs`コレクション
  - ドキュメントID: `${userId}_${actionId}`
  - `merge: true`で更新または作成

**使用箇所**:
- `PostDeepDiveSection`で「次のアクション」のチェックボックスをトグルしたとき
- アクションの実行状況を記録

---

## 🔄 データフロー図

```
[認証確認]
    ↓
[useEffect トリガー]
    ↓
┌─────────────────────────────────────┐
│ 並列データ取得                       │
├─────────────────────────────────────┤
│ 1. fetchMasterContext()              │
│    → GET /api/ai/master-context     │
│    ├─ getMasterContext()            │
│    │  → Firestore: analytics, posts │
│    │  → Firestore: ai_post_feedback │
│    │  → Firestore: ai_action_logs   │
│    │  → パターン分析・クラスタリング │
│    └─ buildAIContext()              │
│       → Firestore: snapshots        │
│       → AI参照データ構築            │
│                                      │
│ 2. fetchHistories()                 │
│    ├─ GET /api/ai/feedback          │
│    │   → Firestore: ai_post_feedback│
│    └─ GET /api/ai/action-logs       │
│       → Firestore: ai_action_logs   │
└─────────────────────────────────────┘
    ↓
[状態更新]
    ↓
[コンポーネント再レンダリング]
    ↓
┌─────────────────────────────────────┐
│ ユーザー操作                        │
├─────────────────────────────────────┤
│ 1. AIサマリー生成ボタンクリック     │
│    → POST /api/ai/post-insight      │
│    → OpenAI API呼び出し             │
│                                      │
│ 2. アクションログトグル             │
│    → POST /api/ai/action-logs       │
│    → Firestore更新                  │
│                                      │
│ 3. 最新履歴再取得ボタンクリック     │
│    → refreshKey更新                 │
│    → useEffect再実行                │
└─────────────────────────────────────┘
```

---

## 📦 状態管理

### 状態変数一覧

```typescript
// 認証状態
const { user } = useAuth();
const isAuthReady = useMemo(() => Boolean(user?.uid), [user?.uid]);

// リフレッシュ制御
const [refreshKey, setRefreshKey] = useState(0);

// マスターコンテキスト
const [isContextLoading, setIsContextLoading] = useState(false);
const [contextError, setContextError] = useState<string | null>(null);
const [contextData, setContextData] = useState<MasterContextResponse | null>(null);
const [sharedLearningContext, setSharedLearningContext] = useState<LearningContextCardData | null>(null);

// 投稿AIサマリー
const [postInsights, setPostInsights] = useState<Record<string, PostInsight>>({});
const [generatingInsightId, setGeneratingInsightId] = useState<string | null>(null);
const [insightError, setInsightError] = useState<string | null>(null);

// タイムラインモード
const [timelineMode, setTimelineMode] = useState<"monthly" | "weekly">("monthly");

// 履歴データ
const [feedbackHistory, setFeedbackHistory] = useState<FeedbackEntry[]>([]);
const [actionHistory, setActionHistory] = useState<ActionLogEntry[]>([]);
const [actionLogPendingId, setActionLogPendingId] = useState<string | null>(null);
const [actionLogError, setActionLogError] = useState<string | null>(null);
const [isHistoryLoading, setIsHistoryLoading] = useState(false);
const [historyError, setHistoryError] = useState<string | null>(null);

// 計算済み値（useMemo）
const actionLogMap = useMemo(() => {
  const map = new Map<string, ActionLogEntry>();
  actionHistory.forEach((entry) => {
    map.set(entry.actionId, entry);
  });
  return map;
}, [actionHistory]);

const monthlyTimeline: TimelineChartPoint[] = useMemo(() => {
  // タイムラインデータの変換処理
}, [contextData?.timeline]);

const weeklyTimeline: TimelineChartPoint[] = useMemo(() => {
  // 週次タイムラインデータの変換処理
}, [contextData?.weeklyTimeline]);

const goldSignals = useMemo(() => {
  // ゴールドシグナルの抽出（最大3件）
}, [patternInsights?.signals]);

const redSignals = useMemo(() => {
  // レッドシグナルの抽出（最大3件）
}, [patternInsights?.signals]);

const patternCounts = useMemo(() => {
  // パターンタグ別の件数集計
}, [patternInsights]);

const goldSampleSignals = useMemo(() => {
  // ゴールドサンプルシグナル（最大3件）
}, [patternInsights]);

const topHashtagEntries = useMemo(() => {
  // トップハッシュタグ（最大12件）
}, [patternInsights]);
```

---

## 🎯 要件定義

### 機能要件

#### 1. AIとの学習状況表示
- **要件**: 学習フェーズ、RAG精度、蓄積分析件数を表示
- **データソース**: `/api/ai/master-context`
- **表示内容**:
  - 学習フェーズ: `initial` / `learning` / `optimized` / `master`
  - RAG精度: 0-100%のパーセンテージ
  - 蓄積分析: 総インタラクション数
- **機能**: 最新履歴再取得ボタン（`forceRefresh=1`で再取得）

#### 2. 学習リファレンスカード
- **要件**: AIが参照したデータを可視化
- **データソース**: `/api/ai/master-context`の`learningContext`
- **表示内容**:
  - マスターコンテキストサマリー（フェーズ、RAG精度、インタラクション数、フィードバック統計、アクション統計）
  - スナップショット参照（最大8件、status別に色分け）
  - AI参照データ（最大6件、sourceType別にアイコン表示）

#### 3. 学習バッジ表示
- **要件**: 学習進捗に応じたバッジを表示
- **データソース**: `/api/ai/master-context`の`achievements`
- **表示内容**:
  - バッジタイトル、説明、アイコン
  - 進捗率（0-100%）
  - 現在値 / 目標値
  - ステータス（達成済み / 進行中）
  - ショートカットリンク（オプション）
- **バッジアイコン**: 15種類（crown, message, sparkle, target, calendar, clock, repeat, zap, scale, compass, activity, flask, users, brain, default）

#### 4. 学習進捗タイムライン
- **要件**: 月次・週次のフィードバック量とAI提案採用率を可視化
- **データソース**: `/api/ai/master-context`の`timeline`と`weeklyTimeline`
- **表示内容**:
  - Recharts LineChart（ポジティブ率、提案採用率の推移）
  - 月次/週次切り替えボタン
  - 最新期間の統計カード（フィードバック件数、AI提案採用状況、対象期間）
- **ツールチップ**: フィードバック件数、コメント付き件数、ポジティブ率、提案採用、採用率

#### 5. 成功 & 改善投稿ギャラリー
- **要件**: ゴールド（成功）とレッド（改善優先）投稿をピックアップ
- **データソース**: `/api/ai/master-context`の`postPatterns.signals`
- **表示内容**:
  - ゴールド投稿（最大3件）: KPI、ER、保存率、コメント率、クラスタ比較、リーチ差分、エンゲージ差分、保存率差分
  - レッド投稿（最大3件）: 同様の指標 + 改善ヒント
- **リンク**: Labで開く、投稿詳細を見る、分析で開く

#### 6. 投稿パターン学習
- **要件**: KPIと満足度から自動抽出した投稿パターンを表示
- **データソース**: `/api/ai/master-context`の`postPatterns`
- **表示内容**:
  - パターンタグ別カード（gold/gray/red/neutral）:
    - 要約、共通点、次に活かす視点、注意点（gold以外）
    - 勝ちパターン例（goldのみ）
  - よく使われたハッシュタグ（最大12件、重み順）

#### 7. 投稿ディープダイブ
- **要件**: 投稿ごとの指標やクラスタ比較を深掘り
- **データソース**: `/api/ai/master-context`の`postPatterns.signals`（最大10件）
- **表示内容**:
  - 投稿タイトル、カテゴリ、KPI、エンゲージ率、保存率、コメント率
  - 指標の強み（リーチ差分、エンゲージ差分、保存率差分）
  - クラスタと類似投稿（ベースライン、類似投稿リスト）
  - AIサマリー（要約、強み、改善ポイント、次のアクション）
  - アクション実行チェックボックス（`actionLogsApi.upsert()`で更新）
- **機能**: AIサマリー生成ボタン（`POST /api/ai/post-insight`）

#### 8. フィードバック & アクション履歴
- **要件**: 最新のフィードバックとアクション実行ログを表示
- **データソース**: 
  - `/api/ai/feedback`（最新10件）
  - `/api/ai/action-logs`（最新10件）
- **表示内容**:
  - フィードバック: 感情（ポジティブ/ネガティブ/ニュートラル）、コメント、重み、作成日時
  - アクションログ: タイトル、フォーカスエリア、採用状況、効果、メモ、更新日時

---

## 🔍 データ取得の詳細

### マスターコンテキストの取得ロジック

```typescript
// 1. getMasterContext()の呼び出し
//    - 投稿分析データとフィードバックデータを集計
//    - パターン分析・クラスタリングを実行
//    - タイムライン（月次・週次）を生成
//    - バッジ進捗を計算

// 2. buildAIContext()の呼び出し
//    - スナップショット参照を取得（最大8件）
//    - AI参照データを構築

// 3. レスポンスの構築
//    - postPatterns: パターンサマリー、トップハッシュタグ、シグナル（最大24件）
//    - timeline: 月次タイムライン
//    - weeklyTimeline: 週次タイムライン
//    - achievements: バッジ一覧
//    - postInsights: 投稿AIサマリー（既に生成済みのもの）
//    - learningContext: 学習リファレンスデータ
```

### パターンシグナルの分類ロジック

```typescript
// PatternTagの決定ロジック（getMasterContext内で実行）
// - gold: 主観評価もKPIも高い投稿群
// - gray: 満足度は高いがKPIの伸びが控えめ
// - red: 満足度も指標も厳しい投稿
// - neutral: データが少ない投稿

// 各シグナルには以下が含まれる:
// - metrics: リーチ、保存、いいね、コメント、シェア、各種率
// - comparisons: 平均との差分（リーチ、エンゲージ率、保存率、コメント率、クラスタパフォーマンス）
// - significance: 各指標が平均より高い/低い/中性
// - cluster: クラスタID、ラベル、類似投稿リスト
// - tag: gold/gray/red/neutral
// - kpiScore: KPIスコア
// - engagementRate: エンゲージメント率
// - sentimentScore: 感情スコア
// - sentimentLabel: positive/negative/neutral
// - feedbackCounts: ポジティブ/ネガティブ/ニュートラル件数
```

### タイムラインの生成ロジック

```typescript
// 月次タイムライン
// - 各月のフィードバック件数、ポジティブ率、アクション件数、採用率を集計
// - 期間ラベル: "2024年1月" など

// 週次タイムライン
// - 各週のフィードバック件数、ポジティブ率、アクション件数、採用率を集計
// - 期間ラベル: "2024-W01" など
// - データが十分に蓄積された場合のみ生成される
```

---

## 🗂️ Firestoreコレクション構造

### ai_post_feedback
```typescript
{
  userId: string;
  postId: string;
  sentiment: "positive" | "negative" | "neutral";
  comment: string;
  aiLabel: string;
  weight: number; // デフォルト1
  createdAt: Timestamp;
}
```

### ai_action_logs
```typescript
{
  userId: string;
  actionId: string; // 一意のアクションID
  title: string;
  focusArea: string; // フォーカスエリア（例: "learning-post-123"）
  applied: boolean;
  resultDelta: number | null; // 効果（パーセンテージ）
  feedback: string; // メモ
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
// ドキュメントID: `${userId}_${actionId}`
```

### analytics
```typescript
{
  userId: string;
  postId: string;
  reach: number;
  saves: number;
  likes: number;
  comments: number;
  shares: number;
  // ... その他の分析データ
  publishedAt: Timestamp;
}
```

### posts
```typescript
{
  userId: string;
  title: string;
  content: string;
  postType: "feed" | "reel" | "story";
  hashtags: string[];
  createdAt: Timestamp;
}
```

### snapshots
```typescript
{
  userId: string;
  postId: string;
  status: "gold" | "negative" | "normal";
  summary?: string;
  createdAt: Timestamp;
}
```

---

## 🔗 関連ページ・リンク

- **投稿一覧**: `/instagram/posts` - 投稿の一覧表示
- **分析ページ**: `/analytics/feed` - 投稿分析とフィードバック入力
- **月次レポート**: `/instagram/monthly-report` - AI提案の確認
- **Lab**: `/instagram/lab/feed`, `/instagram/lab/reel`, `/instagram/lab/story` - 投稿編集
- **投稿詳細**: `/instagram/posts/{postId}` - 個別投稿の詳細

---

## ⚙️ 技術仕様

### 使用ライブラリ
- React 19.1.0
- Next.js 15.5.3
- recharts（タイムライングラフ）
- lucide-react（アイコン）
- Tailwind CSS（スタイリング）

### カスタムフック
- `useAuth()` - 認証状態の管理
- `authFetch()` - 認証付きAPIリクエスト

### ユーティリティ関数
- `getLearningPhaseLabel()` - 学習フェーズのラベル取得
- `getLabEditorHref()` - LabエディタのURL生成
- `getAnalyticsHref()` - 分析ページのURL生成
- `formatDateTime()` - 日時フォーマット
- `renderSignificanceBadge()` - 指標の強みバッジ表示
- `sentimentLabelMap`, `sentimentColorMap` - 感情ラベル・色マッピング
- `significanceLabelMap`, `significanceColorMap` - 指標の強みラベル・色マッピング

### APIクライアント
- `actionLogsApi.upsert()` - アクションログの更新/作成

---

## 📝 注意事項

1. **データ取得のタイミング**:
   - 認証が準備できた時（`isAuthReady === true`）にマスターコンテキストと履歴を並列取得
   - `refreshKey`が変更されると再取得（`forceRefresh=1`でキャッシュを無視）

2. **パフォーマンス**:
   - `useMemo`を使用して計算値をメモ化（タイムライン、シグナル抽出、パターン集計など）
   - `useCallback`を使用して関数をメモ化（`handleActionLogToggle`）
   - マスターコンテキストは重い処理のため、`forceRefresh`を使わない限りキャッシュを利用

3. **エラーハンドリング**:
   - 各API呼び出しでエラーが発生しても、他のデータ取得は継続
   - エラーは`contextError`や`historyError`に保存され、ユーザーに表示

4. **空状態の処理**:
   - データがない場合は`EmptyStateCard`を表示
   - 各セクションで適切な空状態メッセージとアクションリンクを提供

5. **タイムラインモード**:
   - 週次データがない場合は自動的に月次モードにフォールバック
   - `hasWeeklyTimeline`で週次ボタンの有効/無効を制御

6. **投稿AIサマリー**:
   - 生成にはOpenAI APIを使用（`gpt-4o-mini`）
   - 生成済みのサマリーは`postInsights`に保存され、再生成可能
   - 生成中は`generatingInsightId`でボタンを無効化

7. **アクションログ**:
   - チェックボックスのトグルで即座に`actionLogsApi.upsert()`を呼び出し
   - 更新中は`actionLogPendingId`で該当チェックボックスを無効化
   - エラーは`actionLogError`に保存され、ユーザーに表示

8. **パターンタグのメタデータ**:
   - `tagMeta`オブジェクトで各タグのラベル、説明、キャプション、スタイルを定義
   - goldタグには特別な「成功バッジ」バッジを表示

9. **学習フェーズ**:
   - `initial`: 初期段階（データ蓄積中）
   - `learning`: 学習中（パターンが見え始める）
   - `optimized`: 最適化済み（AI提案の精度が高い）
   - `master`: マスター（高度な学習が完了）

10. **RAG精度**:
    - RAG（Retrieval-Augmented Generation）のヒット率
    - 0-1の値で、1に近いほどAIが適切な参照データを取得できている

