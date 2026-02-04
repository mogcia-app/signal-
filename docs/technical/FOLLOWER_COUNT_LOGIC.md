# フォロワー数取得・表示ロジック

## 📋 概要

このドキュメントは、Signal.ツールにおけるフォロワー数の保存・取得・表示ロジックをまとめたものです。

## 🔍 問題点の整理

### 現在の状況

1. **`/kpi`と`/report`**: homeで入力したフォロワー数（その他）は反映されているが、分析ページで入力したものは反映されていない
2. **`/home`**: その他も分析ページもどちらも反映されていない

## 📊 データソース

### 1. 分析ページで入力されたフォロワー増加数

**保存先**: `analytics`コレクション
- **フィールド**: `followerIncrease` (number)
- **単位**: 投稿ごとの増加数
- **保存タイミング**: 分析ページで分析データを保存した時

```typescript
// src/app/api/analytics/simple/route.ts
followerIncrease: Number.parseInt(followerIncrease) || 0,
```

### 2. homeページで入力されたフォロワー増加数（その他）

**保存先**: `follower_counts`コレクション
- **フィールド**: `followers` (number)
- **意味**: 「投稿に紐づかない増加数」
- **保存タイミング**: homeページで「その他フォロワー数」を入力して保存した時

```typescript
// src/app/api/follower-counts/route.ts
followers: number; // 投稿に紐づかないフォロワー増加数
```

### 3. 計画データに保存されたフォロワー数

**保存先**: `plans`コレクション
- **フィールド**: 
  - `analyticsFollowerIncrease`: 今月の合計増加数（投稿からの増加 + その他からの増加）
  - `actualFollowers`: 現在のフォロワー数（initialFollowers + 今月の増加数）
- **更新タイミング**: `syncPlanFollowerProgress`関数が呼ばれた時（analytics保存時）

```typescript
// src/lib/plans/sync-follower-progress.ts
const totalMonthlyFollowerIncrease = monthlyFollowerIncrease + followerIncreaseFromOther;
const actualFollowers = Math.max(0, initialFollowers + totalMonthlyFollowerIncrease);

await planDoc.ref.update({
  analyticsFollowerIncrease: totalMonthlyFollowerIncrease,
  actualFollowers,
  updatedAt: new Date(),
});
```

## 🔄 各ページでの取得・表示ロジック

### `/kpi` (KPI分解ページ)

**API**: `GET /api/analytics/kpi-breakdown?date={YYYY-MM}`

**ロジック**:
1. 今月の`analytics`データから`followerIncrease`の合計を計算
   ```typescript
   const followerIncreaseFromReel = postsWithAnalytics
     .filter((post) => post.postType === "reel")
     .reduce((sum, post) => sum + (post.analyticsSummary?.followerIncrease || 0), 0);
   const followerIncreaseFromFeed = postsWithAnalytics
     .filter((post) => post.postType === "feed")
     .reduce((sum, post) => sum + (post.analyticsSummary?.followerIncrease || 0), 0);
   const followerIncreaseFromPosts = followerIncreaseFromReel + followerIncreaseFromFeed;
   ```

2. `follower_counts`から「その他からの増加数」を取得
   ```typescript
   const followerIncreaseFromOther = currentFollowers || 0; // follower_counts.followers
   ```

3. 合計を計算
   ```typescript
   const totalFollowerIncrease = followerIncreaseFromPosts + followerIncreaseFromOther;
   ```

**表示**: `currentFollowersBreakdown.value = totalFollowerIncrease`

**問題点**: 
- ✅ その他（homeで入力した値）は反映されている
- ❌ 分析ページで入力した値が反映されていない可能性
  - `postsWithAnalytics`に`analyticsSummary.followerIncrease`が含まれていない可能性
  - `publishedAt`の型問題でクエリに引っかかっていない可能性（修正済み）

### `/report` (月次レポートページ)

**API**: `GET /api/analytics/report-complete?date={YYYY-MM}`

**ロジック**:
1. 今月の`analytics`データから`followerIncrease`の合計を計算
   ```typescript
   const followerIncreaseFromPosts = validAnalyticsData.reduce(
     (sum, d) => sum + (d.followerIncrease || 0), 0
   );
   ```

2. `follower_counts`から「その他からの増加数」を取得
   ```typescript
   let followerIncreaseFromOther = 0;
   if (!currentMonthSnapshot.empty) {
     const currentData = currentMonthSnapshot.docs[0].data();
     followerIncreaseFromOther = currentData.followers || 0;
   }
   ```

3. 合計を計算
   ```typescript
   const totalFollowerIncrease = followerIncreaseFromPosts + followerIncreaseFromOther;
   ```

**表示**: `totalFollowerIncrease`を表示

**問題点**: 
- ✅ その他（homeで入力した値）は反映されている
- ❌ 分析ページで入力した値が反映されていない可能性
  - `validAnalyticsData`に`followerIncrease`が含まれていない可能性
  - `publishedAt`の型問題でクエリに引っかかっていない可能性（修正済み）

### `/home` (ホームページ)

**API**: `GET /api/home/dashboard`

**ロジック**:
1. 今週の`analytics`データから`followerIncrease`の合計を計算
   ```typescript
   const thisWeekFollowerIncreaseFromPosts = thisWeekAnalytics.reduce(
     (sum, a) => sum + (a.followerIncrease || 0), 0
   );
   ```

2. `follower_counts`から「その他からの増加数」を取得（週単位で概算）
   ```typescript
   const monthFollowerIncreaseFromOther = followerCounts[0].followers || 0;
   // 週単位の概算: 今月の増加数を週数で割る
   thisWeekFollowerIncreaseFromOther = Math.round(monthFollowerIncreaseFromOther / weeksSinceMonthStart);
   ```

3. 合計を計算
   ```typescript
   const thisWeekKPIs = {
     followers: thisWeekFollowerIncreaseFromPosts + thisWeekFollowerIncreaseFromOther,
   };
   ```

**表示**: 「今週の成果」セクションで`weeklyResults`として表示

**表示ロジック**:
```typescript
// src/app/home/page.tsx
const weeklyResults: WeeklyResult[] = dashboardData?.weeklyKPIs
  ? [
      {
        metric: "いいね数",
        value: dashboardData.weeklyKPIs.thisWeek.likes || 0,
        change: dashboardData.weeklyKPIs.changes?.likes || 0,
        icon: "🩷",
      },
      {
        metric: "コメント数",
        value: dashboardData.weeklyKPIs.thisWeek.comments || 0,
        change: dashboardData.weeklyKPIs.changes?.comments || 0,
        icon: "💬",
      },
      {
        metric: "フォロワー数",
        value: dashboardData.weeklyKPIs.thisWeek.followers || 0,
        change: dashboardData.weeklyKPIs.changes?.followers || 0,
        icon: "📈",
      },
    ]
  : [...];
```

**問題点**: 
- ❌ その他（homeで入力した値）も分析ページで入力した値も反映されていない
  - `thisWeekFollowerIncreaseFromPosts`が正しく計算されていない可能性
    - `thisWeekAnalytics`に`followerIncrease`が含まれていない可能性
    - `publishedAt`の型問題で、今週のanalyticsデータが取得できていない可能性（修正済み）
  - `thisWeekFollowerIncreaseFromOther`が正しく計算されていない可能性
    - `followerCounts[0].followers`が取得できていない可能性
    - 週単位の概算計算が正しく動作していない可能性

## 🔧 問題の原因分析

### 1. `publishedAt`の型問題（修正済み）

**問題**: 
- 保存時: `new Date(publishedAt)` → `Date`型
- 集計時: `admin.firestore.Timestamp.fromDate()` → `Timestamp`型
- Firestoreは`Date`と`Timestamp`を別物として扱うため、クエリに引っかからない

**修正**: `publishedAt`を`admin.firestore.Timestamp`に統一（修正済み）

### 2. `syncPlanFollowerProgress`の呼び出しタイミング

**現在**: analytics保存時に呼び出されている
```typescript
// src/app/api/analytics/simple/route.ts
await syncPlanFollowerProgress(uid);
```

**問題点**:
- `syncPlanFollowerProgress`がエラーを発生させている可能性
- `publishedAt`の型問題で、今月のanalyticsデータが取得できていない可能性（修正済み）

### 3. `CurrentPlanCard`の表示ロジック

**問題点**:
- `planData.actualFollowers`が`undefined`の場合、`planAnalyticsGain`から計算しようとするが、`currentFollowers`が正しく取得できていない可能性
- `actualFollowers`プロパティが渡されていない可能性

### 4. `kpi-breakdown`と`report-complete`での`analyticsSummary`の取得

**問題点**:
- `postsWithAnalytics`に`analyticsSummary.followerIncrease`が含まれていない可能性
- `publishedAt`の型問題で、今月のanalyticsデータが取得できていない可能性（修正済み）

## 🎯 解決策

### 1. `publishedAt`の型統一（完了）

✅ `publishedAt`を`admin.firestore.Timestamp`に統一済み

### 2. `syncPlanFollowerProgress`のエラーハンドリング強化

**推奨**:
- エラーログを詳細に記録
- エラーが発生してもanalytics保存は成功として返す（現在の実装）

### 3. `CurrentPlanCard`の表示ロジック改善

**推奨**:
- `actualFollowers`プロパティを明示的に渡す
- `planData.analyticsFollowerIncrease`が正しく更新されているか確認

### 4. デバッグログの追加

**推奨**:
- `kpi-breakdown`と`report-complete`で、取得した`analytics`データの`followerIncrease`をログに記録
- `syncPlanFollowerProgress`で、計算結果をログに記録

## 📝 データフロー図

```
[分析ページで入力]
  ↓
analytics.followerIncrease (投稿ごと、publishedAtはTimestamp型)
  ↓
syncPlanFollowerProgress() (analytics保存時に呼び出し)
  ↓
plans.analyticsFollowerIncrease (今月の合計)
plans.actualFollowers (現在のフォロワー数)
  ↓
[homeページで表示]
  - 今週の成果: thisWeekKPIs.followers = thisWeekFollowerIncreaseFromPosts + thisWeekFollowerIncreaseFromOther
  - 注意: CurrentPlanCardは使用されていない

[homeページで入力]
  ↓
follower_counts.followers (その他からの増加数)
  ↓
[kpi-breakdown / report-complete]
  ↓
totalFollowerIncrease = followerIncreaseFromPosts + followerIncreaseFromOther
  ↓
各ページで表示
```

## 🔍 詳細な問題分析

### `/kpi`と`/report`で分析ページの値が反映されない原因

**可能性1: `publishedAt`の型問題（修正済み）**
- ✅ 修正済み: `publishedAt`を`Timestamp`型に統一

**可能性2: `postsWithAnalytics`の構造**
- `kpi-breakdown`では`postsWithAnalytics`から`analyticsSummary.followerIncrease`を取得
- `postsWithAnalytics`が正しく構築されていない可能性
- `analyticsSummary`が`undefined`の可能性

**可能性3: クエリ条件**
- `publishedAt`の範囲指定が正しく動作していない可能性（修正済み）

### `/home`で両方の値が反映されない原因

**可能性1: `thisWeekAnalytics`の取得**
- `thisWeekAnalytics`に`followerIncrease`が含まれていない可能性
- `publishedAt`の型問題で、今週のanalyticsデータが取得できていない可能性（修正済み）

**可能性2: `followerCounts`の取得**
- `followerCountsSnapshot`が空の可能性
- `followerCounts[0].followers`が`undefined`の可能性

**可能性3: 週単位の概算計算**
- 週単位の概算計算が正しく動作していない可能性

## 🔍 確認すべきポイント

1. **`publishedAt`の型統一**: ✅ 修正済み
2. **`syncPlanFollowerProgress`の実行**: エラーログを確認
3. **`kpi-breakdown`での`analyticsSummary`取得**: `postsWithAnalytics`の構造を確認
   - `postsWithAnalytics`に`analyticsSummary.followerIncrease`が含まれているか
   - `publishedAt`の型変換が正しく行われているか
4. **`report-complete`での`validAnalyticsData`取得**: `followerIncrease`が含まれているか確認
   - `validAnalyticsData`に`followerIncrease`が含まれているか
   - `publishedAt`の型変換が正しく行われているか
5. **`home/dashboard`での`thisWeekAnalytics`取得**: `followerIncrease`が含まれているか確認
   - `thisWeekAnalytics`に`followerIncrease`が含まれているか
   - `publishedAt`の型変換が正しく行われているか（`toDate()`で変換済み）

## 🐛 具体的な問題箇所

### `/kpi`と`/report`で分析ページの値が反映されない

**原因の可能性**:
1. **`publishedAt`の型問題（修正済みだが、既存データは`Date`型のまま）**
   - 新規保存データは`Timestamp`型で保存される（修正済み）
   - 既存データは`Date`型のままの可能性
   - クエリは`Timestamp`型で比較するため、既存データが取得できない可能性

2. **`postsWithAnalytics`の構築**
   - `analyticsByPostId`に`followerIncrease`が含まれているか確認
   - `analyticsSummary.followerIncrease`が正しく設定されているか確認

**確認方法**:
- `kpi-breakdown`のログで`followerIncreaseFromPosts`の値を確認
- `postsWithAnalytics`の各要素に`analyticsSummary.followerIncrease`が含まれているか確認
- `analyticsByPostId`の各要素に`followerIncrease`が含まれているか確認

### `/home`で両方の値が反映されない

**原因の可能性**:
1. **`thisWeekAnalytics`のフィルタリング**
   - `publishedAt`の型変換が正しく行われていない
   - `publishedAt`が`Timestamp`型の場合、`toDate()`で変換する必要がある
   - 現在の実装: `publishedAt instanceof Date ? publishedAt : new Date(publishedAt)`
   - 問題: `Timestamp`型の場合は`toDate()`で変換する必要がある

2. **`followerCounts`の取得**
   - `followerCountsSnapshot`が空の可能性
   - `followerCounts[0].followers`が`undefined`の可能性

**確認方法**:
- `home/dashboard`のログで`thisWeekFollowerIncreaseFromPosts`と`thisWeekFollowerIncreaseFromOther`の値を確認
- `thisWeekAnalytics`の各要素に`followerIncrease`が含まれているか確認
- `followerCounts`が正しく取得できているか確認

## 🔧 修正が必要な箇所

### 1. `home/dashboard`での`publishedAt`の型変換

**現在の実装**:
```typescript
const publishedAt = data.publishedAt?.toDate?.() || data.publishedAt;
return {
  ...data,
  publishedAt: publishedAt instanceof Date ? publishedAt : new Date(publishedAt),
};
```

**問題**: `Timestamp`型の場合は`toDate()`で変換する必要があるが、`new Date(publishedAt)`では正しく変換できない可能性がある

**修正案**:
```typescript
const publishedAt = data.publishedAt
  ? data.publishedAt instanceof admin.firestore.Timestamp
    ? data.publishedAt.toDate()
    : data.publishedAt instanceof Date
      ? data.publishedAt
      : new Date(data.publishedAt)
  : new Date();
return {
  ...data,
  publishedAt,
};
```

### 2. `kpi-breakdown`での`publishedAt`の型変換

**現在の実装**: 既に正しく実装されている（`Timestamp`型を`toDate()`で変換）

### 3. `report-complete`での`publishedAt`の型変換

**確認が必要**: `validAnalyticsData`の構築時に`publishedAt`が正しく変換されているか確認

## 📚 関連ファイル

- `src/app/api/analytics/simple/route.ts`: analytics保存処理
- `src/app/api/analytics/kpi-breakdown/route.ts`: KPI分解データ取得
- `src/app/api/analytics/report-complete/route.ts`: 月次レポートデータ取得
- `src/app/api/home/dashboard/route.ts`: ホームダッシュボードデータ取得
- `src/lib/plans/sync-follower-progress.ts`: 計画フォロワー同期処理
- `src/components/CurrentPlanCard.tsx`: 計画カード表示コンポーネント

## ✅ 修正済みの項目

1. **`publishedAt`の型統一**: ✅ 修正済み
   - `analytics/simple/route.ts`: `Timestamp`型で保存
   - `home/dashboard/route.ts`: `Timestamp`型を`Date`型に正しく変換

## 🔄 次のステップ

1. **既存データの移行**: `Date`型で保存されている既存データを`Timestamp`型に移行するか、クエリ時に両方の型に対応する
2. **デバッグログの追加**: 各APIで取得した`followerIncrease`の値をログに記録
3. **`syncPlanFollowerProgress`のエラーハンドリング**: エラーログを詳細に記録

