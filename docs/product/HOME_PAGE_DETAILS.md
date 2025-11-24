# /homeページ 詳細仕様書

## 📋 ページ概要

`/home`ページは、ユーザーのダッシュボードとして、今月のKPIサマリー、目標達成状況、フォロワー数入力、アクションプランを一覧表示するページです。

**URL**: `/home`  
**レイアウト**: `SNSLayout`  
**認証**: 必須（`useAuth`フックを使用）

---

## 🏗️ コンポーネントツリー構造

```
HomePage (src/app/home/page.tsx)
├── SNSLayout
│   └── サイドバー + メインコンテンツエリア
└── メインコンテンツ
    ├── KPISummaryCard (src/app/home/components/KPISummaryCard.tsx)
    │   ├── リーチ数カード
    │   ├── いいね数カード
    │   └── エンゲージメント率カード
    ├── MonthlyGoalsCard (src/app/home/components/MonthlyGoalsCard.tsx)
    │   ├── フォロワー目標進捗
    │   └── 投稿目標進捗
    ├── フォロワー数入力セクション（インライン）
    │   ├── 入力フィールド
    │   ├── 保存ボタン
    │   └── 最終更新日時表示
    └── 今月のアクションプランセクション（インライン）
        └── アクションプランリスト
```

---

## 📊 データ取得元とAPIエンドポイント

### 1. **KPIサマリー**

**API**: `GET /api/analytics/kpi-breakdown?date={YYYY-MM}`

**データソース**:
- Firestore `analytics`コレクション（期間内の投稿分析データ）
- Firestore `posts`コレクション（期間内の投稿データ）
- Firestore `plans`コレクション（運用計画データ）

**取得データ**:
```typescript
{
  success: boolean;
  data: {
    breakdowns: Array<{
      key: "reach" | "saves" | "followers" | "engagement";
      label: string;
      value: number;
      changePct?: number;
      segments?: Array<{
        label: string;
        value: number;
        delta?: number;
      }>;
      topPosts?: Array<{
        postId: string;
        title: string;
        value: number;
        postType?: "feed" | "reel" | "story";
        status?: "gold" | "negative" | "normal";
      }>;
      insight?: string;
    }>;
    // ... その他のデータ
  };
}
```

**使用箇所**:
- `KPISummaryCard`コンポーネントに渡される
- `reach`と`engagement`のKPIを抽出して表示
- エンゲージメントのセグメントから「いいね」数を取得

---

### 2. **今月の目標**

**複数のAPIを組み合わせて取得**:

#### 2-1. フォロワー数取得
**API**: `GET /api/follower-counts?month={YYYY-MM}&snsType=instagram`

**データソース**:
- Firestore `follower_counts`コレクション
  - `userId`, `snsType`, `month`でフィルタ
  - `updatedAt`で降順ソート、最新1件を取得

**取得データ**:
```typescript
{
  success: boolean;
  data: {
    id: string;
    userId: string;
    snsType: "instagram";
    followers: number;
    month: string; // YYYY-MM
    source: "manual" | "onboarding";
    createdAt: string; // ISO形式
    updatedAt: string; // ISO形式
  } | null;
}
```

**フォールバック**:
- `follower_counts`にデータがない場合
- `GET /api/user/profile`から`businessInfo.initialFollowers`を取得

#### 2-2. 運用計画取得
**API**: `GET /api/plans?snsType=instagram&status=active&effectiveMonth={YYYY-MM}&limit=1`

**データソース**:
- Firestore `plans`コレクション
  - `userId`, `snsType`, `status`, `effectiveMonth`でフィルタ
  - 最新1件を取得

**取得データ**:
```typescript
{
  success: boolean;
  plans: Array<{
    id: string;
    targetFollowers?: number;
    simulationResult?: {
      monthlyPostCount?: number;
    };
    formData?: {
      monthlyPosts?: number | string;
    };
    // ... その他の計画データ
  }>;
}
```

#### 2-3. KPI分解データ取得（目標達成度とフォロワー増加数）
**API**: `GET /api/analytics/kpi-breakdown?date={YYYY-MM}`

**取得データ**:
```typescript
{
  success: boolean;
  data: {
    breakdowns: Array<{
      key: "followers";
      value: number; // 分析ページで入力されたフォロワー増加数の合計
      // ...
    }>;
    goalAchievements: Array<{
      key: "followers" | "posts";
      target: number;
      actual: number;
      achievementRate: number;
      status: "achieved" | "on_track" | "at_risk" | "not_set";
    }>;
    // ...
  };
}
```

**データ統合ロジック**:
1. `/home`で入力されたフォロワー数（`follower_counts`から取得）
2. 分析ページで入力されたフォロワー増加数の合計（`kpi-breakdown`の`followers`キーから取得）
3. 上記2つを合計して`currentFollowersForGoals`に設定

**目標投稿数の取得優先順位**:
1. `plan.simulationResult.monthlyPostCount`
2. `plan.formData.monthlyPosts`
3. `goalAchievements`の`posts`キーから`target`

**実績投稿数の取得**:
- `goalAchievements`の`posts`キーから`actual`

---

### 3. **フォロワー数入力・保存**

**取得API**: `GET /api/follower-counts?month={YYYY-MM}&snsType=instagram`  
**保存API**: `POST /api/follower-counts`

**保存データ**:
```typescript
{
  followers: number; // 0以上の整数
  month: string; // YYYY-MM形式
  snsType: "instagram";
  source: "manual";
}
```

**データソース**:
- Firestore `follower_counts`コレクション
  - 同じ`userId`, `snsType`, `month`のデータが存在する場合は更新
  - 存在しない場合は新規作成
  - `startFollowers`は最初の値を月初として保存

---

### 4. **今月のアクションプラン**

**API**: `GET /api/analytics/monthly-proposals?date={YYYY-MM}`

**データソース**:
- Firestore `analytics`コレクション（期間内の投稿分析データ）
- Firestore `posts`コレクション（期間内の投稿データ）
- Firestore `plans`コレクション（運用計画）
- OpenAI API（AIによるアクションプラン生成）

**取得データ**:
```typescript
{
  success: boolean;
  data: {
    actionPlans: Array<{
      title: string;
      description: string;
      action: string;
    }>;
  };
}
```

**生成ロジック**:
1. 期間内の投稿データと分析データを取得
2. KPIの変化率を計算
3. OpenAI APIにプロンプトを送信してアクションプランを生成
4. 最大5件のアクションプランを返す

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
│ 1. fetchFollowerCount()             │
│    → GET /api/follower-counts       │
│    → Firestore: follower_counts     │
│                                      │
│ 2. fetchActionPlans()               │
│    → GET /api/analytics/monthly-    │
│       proposals                     │
│    → Firestore: analytics, posts    │
│    → OpenAI API                     │
│                                      │
│ 3. fetchKPISummary()                │
│    → GET /api/analytics/kpi-        │
│       breakdown                     │
│    → Firestore: analytics, posts    │
│                                      │
│ 4. fetchMonthlyGoals()              │
│    ├─ GET /api/follower-counts      │
│    ├─ GET /api/user/profile         │
│    │   (フォールバック)              │
│    ├─ GET /api/plans                │
│    └─ GET /api/analytics/kpi-       │
│       breakdown                     │
└─────────────────────────────────────┘
    ↓
[状態更新]
    ↓
[コンポーネント再レンダリング]
```

---

## 📦 状態管理

### 状態変数一覧

```typescript
// 認証状態
const { user } = useAuth();
const isAuthReady = useMemo(() => Boolean(user), [user]);

// フォロワー数入力
const [currentFollowers, setCurrentFollowers] = useState<string>("");
const [isLoading, setIsLoading] = useState(false);
const [isSaving, setIsSaving] = useState(false);
const [lastUpdated, setLastUpdated] = useState<string | null>(null);

// アクションプラン
const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
const [isLoadingActionPlans, setIsLoadingActionPlans] = useState(false);

// KPIサマリー
const [kpiBreakdowns, setKpiBreakdowns] = useState<any[]>([]);
const [isLoadingKPI, setIsLoadingKPI] = useState(false);

// 今月の目標
const [targetFollowers, setTargetFollowers] = useState<number | undefined>();
const [currentFollowersForGoals, setCurrentFollowersForGoals] = useState<number | undefined>();
const [targetPosts, setTargetPosts] = useState<number | undefined>();
const [actualPosts, setActualPosts] = useState<number | undefined>();
const [isLoadingGoals, setIsLoadingGoals] = useState(false);

// 現在の月
const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);
```

---

## 🎯 要件定義

### 機能要件

#### 1. KPIサマリー表示
- **要件**: 今月の主要KPI（リーチ数、いいね数、エンゲージメント率）を表示
- **データソース**: `/api/analytics/kpi-breakdown`
- **表示内容**:
  - リーチ数（前月比変化率付き）
  - いいね数（エンゲージメントのセグメントから抽出、前月比変化率付き）
  - エンゲージメント率（リーチ数に対するエンゲージメントの割合）
- **リンク**: `/instagram/kpi`へのリンクを提供

#### 2. 今月の目標表示
- **要件**: 運用計画で設定した目標の進捗を表示
- **データソース**: 
  - `/api/plans`（目標値）
  - `/api/follower-counts`（現在のフォロワー数）
  - `/api/analytics/kpi-breakdown`（実績値、フォロワー増加数）
- **表示内容**:
  - フォロワー目標: 現在値 / 目標値、達成率、残り人数
  - 投稿目標: 実績値 / 目標値、達成率、残り件数
- **フォロワー数の計算ロジック**:
  - `/home`で入力された値 + 分析ページで入力されたフォロワー増加数の合計
- **リンク**: `/instagram/plan`へのリンクを提供

#### 3. フォロワー数入力・保存
- **要件**: 月間のフォロワー数を手動で入力・保存できる
- **データソース**: `/api/follower-counts`
- **機能**:
  - 入力フィールド（数値のみ、0以上）
  - 保存ボタン（入力値がある場合のみ有効）
  - 保存成功時に通知表示
  - 最終更新日時の表示
- **バリデーション**:
  - 0以上の数値であること
  - 空文字列の場合は保存不可

#### 4. 今月のアクションプラン表示
- **要件**: AIが提案する改善アクションを表示
- **データソース**: `/api/analytics/monthly-proposals`
- **表示内容**:
  - アクションプランのタイトル
  - 説明文
  - 具体的なアクション
- **リンク**: `/instagram/report`へのリンクを提供
- **空状態**: アクションプランがない場合のメッセージ表示

---

## 🔍 データ取得の詳細

### フォロワー数の取得ロジック

```typescript
// 1. /homeで入力されたフォロワー数を取得
GET /api/follower-counts?month={YYYY-MM}&snsType=instagram
→ Firestore: follower_counts コレクション
→ 条件: userId, snsType, month でフィルタ
→ 最新1件を取得

// 2. データがない場合のフォールバック
GET /api/user/profile
→ Firestore: users コレクション
→ businessInfo.initialFollowers を取得

// 3. 分析ページで入力されたフォロワー増加数の合計を取得
GET /api/analytics/kpi-breakdown?date={YYYY-MM}
→ breakdowns 配列から key === "followers" の value を取得

// 4. 合計を計算
totalFollowers = homeFollowersValue + analyticsFollowerIncrease
```

### 目標投稿数の取得ロジック

```typescript
// 優先順位1: シミュレーション結果から
plan.simulationResult.monthlyPostCount

// 優先順位2: フォームデータから
plan.formData.monthlyPosts

// 優先順位3: 目標達成度データから
goalAchievements.find(g => g.key === "posts").target
```

### 実績投稿数の取得ロジック

```typescript
// KPI分解APIから取得
GET /api/analytics/kpi-breakdown?date={YYYY-MM}
→ goalAchievements 配列から key === "posts" の actual を取得
```

---

## 🗂️ Firestoreコレクション構造

### follower_counts
```typescript
{
  userId: string;
  snsType: "instagram" | "x" | "tiktok";
  followers: number;
  startFollowers?: number; // 月初の値
  month: string; // YYYY-MM形式
  source: "manual" | "onboarding";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### analytics
```typescript
{
  userId: string;
  postId: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  saves: number;
  followerIncrease?: number; // 分析ページで入力された値
  publishedAt: Timestamp;
  // ... その他の分析データ
}
```

### posts
```typescript
{
  userId: string;
  title: string;
  content: string;
  postType: "feed" | "reel" | "story";
  createdAt: Timestamp;
  // ... その他の投稿データ
}
```

### plans
```typescript
{
  userId: string;
  snsType: "instagram";
  status: "active" | "inactive";
  effectiveMonth: string; // YYYY-MM形式
  targetFollowers?: number;
  simulationResult?: {
    monthlyPostCount?: number;
  };
  formData?: {
    monthlyPosts?: number | string;
  };
  // ... その他の計画データ
}
```

---

## 🔗 関連ページ・リンク

- **KPI詳細**: `/instagram/kpi` - KPI分解とドリルダウン
- **運用計画**: `/instagram/plan` - 目標の設定・編集
- **月次レポート**: `/instagram/report` - アクションプランの詳細

---

## ⚙️ 技術仕様

### 使用ライブラリ
- React 19.1.0
- Next.js 15.5.3
- lucide-react（アイコン）
- Tailwind CSS（スタイリング）

### カスタムフック
- `useAuth()` - 認証状態の管理
- `authFetch()` - 認証付きAPIリクエスト

### ユーティリティ
- `notify()` - 通知表示

---

## 📝 注意事項

1. **フォロワー数の計算**:
   - `/home`で入力された値と分析ページで入力されたフォロワー増加数を合計して表示
   - 目標表示用と入力セクション用で異なる値を使用

2. **データ取得のタイミング**:
   - 認証が準備できた時（`isAuthReady === true`）にすべてのデータを並列取得
   - 月が変更された場合は再取得される（`currentMonth`が依存配列に含まれる）

3. **エラーハンドリング**:
   - 各API呼び出しでエラーが発生しても、他のデータ取得は継続
   - エラーはコンソールに記録されるが、ユーザーには表示されない（空状態で表示）

4. **パフォーマンス**:
   - `useCallback`を使用して関数をメモ化
   - `useMemo`を使用して計算値をメモ化
   - データ取得は並列実行（`Promise.all`は使用していないが、独立したAPI呼び出し）

