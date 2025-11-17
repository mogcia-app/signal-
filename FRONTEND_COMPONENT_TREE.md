# フロントエンドコンポーネントツリー構成

このドキュメントは、各ページのコンポーネント階層構造をツリー形式で示します。

## 目次

- [共通レイアウト](#共通レイアウト)
- [Instagramダッシュボード](#instagramダッシュボード)
- [投稿一覧](#投稿一覧)
- [フィード作成（Lab）](#フィード作成lab)
- [運用計画（Plan）](#運用計画plan)
- [月次レポート](#月次レポート)
- [フィード分析](#フィード分析)

---

## 共通レイアウト

```
App Layout
├── AuthProvider (認証コンテキスト)
├── AppNotifications (アプリ通知)
└── Page Content
    └── SNSLayout (SNS共通レイアウト)
        ├── CommonHeader (共通ヘッダー)
        └── Page Content
```

### 共通コンポーネント

- **`AuthProvider`** (`/src/contexts/auth-context.tsx`)
  - 認証状態を管理
  - ユーザー情報を提供

- **`SNSLayout`** (`/src/components/sns-layout.tsx`)
  - InstagramなどのSNSページの共通レイアウト
  - サイドバー、ヘッダーを含む

- **`CommonHeader`** (`/src/components/common-header.tsx`)
  - 共通ヘッダーコンポーネント

- **`AppNotifications`** (`/src/components/app-notifications.tsx`)
  - アプリ内通知を表示

---

## Instagramダッシュボード

**ページ**: `/src/app/instagram/page.tsx`

```
InstagramDashboard
├── AuthGuard (認証ガード)
└── InstagramDashboardContent
    └── SNSLayout
        ├── CurrentPlanCard (現在の計画カード)
        │   └── PlanCard (計画カード)
        │
        ├── 次のアクションセクション
        │   └── ActionCard[] (アクションカード)
        │
        ├── ダッシュボード統計セクション
        │   └── StatCard[] (統計カード)
        │       ├── フォロワー数
        │       ├── エンゲージメント率
        │       ├── リーチ数
        │       ├── いいね数
        │       ├── コメント数
        │       └── 保存数
        │
        ├── 投稿活動統計セクション
        │   └── ActivityCard[] (活動カード)
        │       ├── 今週の投稿数
        │       ├── 月間フィード投稿
        │       ├── 月間リール投稿
        │       └── 月間ストーリー投稿
        │
        ├── クイックアクションセクション
        │   └── QuickActionCard[] (クイックアクションカード)
        │       ├── フィード作成
        │       ├── リール作成
        │       ├── ストーリー作成
        │       └── 分析実行
        │
        ├── 最近の投稿セクション
        │   └── RecentPostCard[] (最近の投稿カード)
        │
        ├── パフォーマンスサマリーセクション
        │   └── PerformanceCard[] (パフォーマンスカード)
        │       ├── 週次成長
        │       └── 投稿頻度
        │
        └── 目標進捗セクション
            └── GoalProgressCard[] (目標進捗カード)
                ├── 週次投稿目標
                └── フォロワー成長目標
```

### 使用コンポーネント

- **`CurrentPlanCard`** (`/src/components/CurrentPlanCard.tsx`)
  - 現在の運用計画を表示
  - 計画の基本情報、進捗状況を表示

- **`PlanCard`** (`/src/components/PlanCard.tsx`)
  - 計画情報をカード形式で表示

---

## 投稿一覧

**ページ**: `/src/app/instagram/posts/page.tsx`

```
PostsPage
├── AuthGuard (認証ガード)
└── PostsPageContent
    └── SNSLayout
        ├── PostFilters (投稿フィルター)
        │   ├── StatusFilter (ステータスフィルター)
        │   └── PostTypeFilter (投稿タイプフィルター)
        │
        ├── PostList (投稿一覧)
        │   └── PostCard[] (投稿カード)
        │       ├── PostCardHeader (投稿カードヘッダー)
        │       ├── PostCardContent (投稿カードコンテンツ)
        │       ├── PostStats (投稿統計)
        │       └── PostCardActions (投稿カードアクション)
        │
        └── PostDetailModal (投稿詳細モーダル)
            ├── PostDetailHeader (投稿詳細ヘッダー)
            ├── PostDetailContent (投稿詳細コンテンツ)
            ├── PostStats (投稿統計)
            └── PostDetailActions (投稿詳細アクション)
```

### 使用コンポーネント

- **`PostCard`** (`/src/app/instagram/posts/components/PostCard.tsx`)
  - 投稿情報をカード形式で表示
  - タイトル、コンテンツ、ハッシュタグ、統計情報を表示

- **`PostStats`** (`/src/app/instagram/posts/components/PostStats.tsx`)
  - 投稿の統計情報を表示
  - いいね、コメント、シェア、リーチなどを表示

- **`PostFilters`** (`/src/app/instagram/posts/components/PostFilters.tsx`)
  - 投稿のフィルタリング機能
  - ステータス、投稿タイプでフィルタリング

- **`PostDetailModal`** (`/src/app/instagram/posts/components/PostDetailModal.tsx`)
  - 投稿の詳細情報をモーダルで表示

---

## フィード作成（Lab）

**ページ**: `/src/app/instagram/lab/feed/page.tsx`

```
FeedLabPage
├── AuthGuard (認証ガード)
└── FeedLabPageContent
    └── SNSLayout
        ├── PostEditor (投稿エディター)
        │   ├── PostEditorHeader (投稿エディターヘッダー)
        │   ├── PostTitleInput (タイトル入力)
        │   ├── PostContentEditor (コンテンツエディター)
        │   ├── HashtagInput (ハッシュタグ入力)
        │   ├── ImageUploader (画像アップローダー)
        │   ├── ScheduleInput (スケジュール入力)
        │   └── PostEditorActions (投稿エディターアクション)
        │
        ├── ToolPanel (ツールパネル)
        │   ├── AIPostGenerator (AI投稿生成)
        │   │   ├── GenerationForm (生成フォーム)
        │   │   └── GeneratedContent (生成されたコンテンツ)
        │   │
        │   ├── SnapshotInsights (スナップショットインサイト)
        │   │   ├── SnapshotList (スナップショット一覧)
        │   │   └── SnapshotDetail (スナップショット詳細)
        │   │
        │   ├── CommentReplyAssistant (コメント返信アシスタント)
        │   │   ├── CommentInput (コメント入力)
        │   │   └── ReplySuggestion (返信提案)
        │   │
        │   └── ScheduleGenerator (スケジュール生成)
        │       ├── ScheduleForm (スケジュールフォーム)
        │       └── SchedulePreview (スケジュールプレビュー)
        │
        └── ABTestSidebarSection (A/Bテストサイドバー)
            ├── ABTestPanel (A/Bテストパネル)
            ├── ABTestRegisterModal (A/Bテスト登録モーダル)
            └── ABTestResultModal (A/Bテスト結果モーダル)
```

### 使用コンポーネント

- **`PostEditor`** (`/src/app/instagram/lab/components/PostEditor.tsx`)
  - 投稿の作成・編集UI
  - タイトル、コンテンツ、ハッシュタグ、画像、スケジュールの入力

- **`ToolPanel`** (`/src/app/instagram/lab/components/ToolPanel.tsx`)
  - 投稿作成時の各種ツールを表示
  - AI投稿生成、スナップショットインサイト、コメント返信アシスタントなどを含む

- **`AIPostGenerator`** (`/src/app/instagram/lab/components/AIPostGenerator.tsx`)
  - AIを使用した投稿生成UI
  - プロンプト入力、生成結果表示

- **`SnapshotInsights`** (`/src/app/instagram/lab/components/SnapshotInsights.tsx`)
  - 過去の投稿パターンからのインサイトを表示
  - スナップショット一覧、詳細表示

- **`CommentReplyAssistant`** (`/src/app/instagram/lab/components/CommentReplyAssistant.tsx`)
  - AIを使用したコメント返信生成UI
  - コメント入力、返信提案表示

- **`ABTestSidebarSection`** (`/src/app/instagram/lab/components/ABTestSidebarSection.tsx`)
  - A/Bテストのサイドバーセクション

- **`ABTestPanel`** (`/src/app/instagram/lab/components/ABTestPanel.tsx`)
  - A/Bテストの登録・管理UI

- **`ABTestRegisterModal`** (`/src/app/instagram/lab/components/ABTestRegisterModal.tsx`)
  - A/Bテスト登録モーダル

- **`ABTestResultModal`** (`/src/app/instagram/lab/components/ABTestResultModal.tsx`)
  - A/Bテスト結果モーダル

---

## 運用計画（Plan）

**ページ**: `/src/app/instagram/plan/page.tsx`

```
InstagramPlanPage
├── AuthGuard (認証ガード)
└── PlanPageContent
    └── SNSLayout
        ├── PlanForm (計画フォーム)
        │   ├── PlanBasicInfo (計画基本情報)
        │   ├── StrategySelector (戦略セレクター)
        │   ├── CategorySelector (カテゴリセレクター)
        │   └── PlanFormActions (計画フォームアクション)
        │
        ├── SimulationPanel (シミュレーションパネル)
        │   ├── SimulationForm (シミュレーションフォーム)
        │   ├── SimulationResult (シミュレーション結果)
        │   │   ├── ResultChart (結果チャート)
        │   │   └── ResultMetrics (結果メトリクス)
        │   └── SimulationActions (シミュレーションアクション)
        │
        ├── AIDiagnosisPanel (AI診断パネル)
        │   ├── DiagnosisForm (診断フォーム)
        │   ├── DiagnosisResult (診断結果)
        │   │   ├── DiagnosisSummary (診断サマリー)
        │   │   └── DiagnosisRecommendations (診断推奨事項)
        │   └── DiagnosisActions (診断アクション)
        │
        └── CurrentGoalPanel (現在の目標パネル)
            ├── GoalDisplay (目標表示)
            └── GoalProgress (目標進捗)
```

### 使用コンポーネント

- **`PlanForm`** (`/src/app/instagram/plan/components/PlanForm.tsx`)
  - 運用計画の入力フォーム
  - 基本情報、戦略、カテゴリの選択

- **`SimulationPanel`** (`/src/app/instagram/plan/components/SimulationPanel.tsx`)
  - シミュレーション結果を表示
  - チャート、メトリクスを表示

- **`AIDiagnosisPanel`** (`/src/app/instagram/plan/components/AIDiagnosisPanel.tsx`)
  - AI診断結果を表示
  - 診断サマリー、推奨事項を表示

- **`CurrentGoalPanel`** (`/src/app/instagram/plan/components/CurrentGoalPanel.tsx`)
  - 現在の目標を表示

- **`InfoTooltip`** (`/src/app/instagram/plan/components/InfoTooltip.tsx`)
  - 情報ツールチップ

- **`ABTestPanel`** (`/src/app/instagram/plan/components/ABTestPanel.tsx`)
  - A/Bテストパネル

---

## 月次レポート

**ページ**: `/src/app/instagram/monthly-report/page.tsx`

```
MonthlyReportPage
├── AuthGuard (認証ガード)
└── MonthlyReportPageContent
    └── SNSLayout
        ├── ReportHeader (レポートヘッダー)
        │   ├── MonthSelector (月セレクター)
        │   └── PeriodSelector (期間セレクター)
        │
        ├── PerformanceRating (パフォーマンス評価)
        │   ├── RatingDisplay (評価表示)
        │   │   ├── RatingCircle (評価サークル)
        │   │   └── RatingLabel (評価ラベル)
        │   └── PDCAStatusCard (PDCAステータスカード)
        │       ├── PDCAExecutionRate (PDCA実行度)
        │       └── FeedbackCount (振り返りデータ件数)
        │
        ├── MetricsCards (メトリクスカード)
        │   └── MetricCard[] (メトリクスカード)
        │       ├── LikesCard (いいねカード)
        │       ├── CommentsCard (コメントカード)
        │       ├── SharesCard (シェアカード)
        │       ├── ReachCard (リーチカード)
        │       └── FollowerCard (フォロワーカード)
        │
        ├── DetailedStats (詳細統計)
        │   ├── AccountScoreCard (アカウントスコアカード)
        │   ├── ComparisonCard (比較カード)
        │   └── PostTypeStatsCard (投稿タイプ統計カード)
        │
        ├── VisualizationSection (可視化セクション)
        │   ├── AccountScoreChart (アカウントスコアチャート)
        │   │   └── RechartsAreaChart (エリアチャート)
        │   └── PostTypeChart (投稿タイプチャート)
        │       └── PostTypeBar (投稿タイプバー)
        │
        ├── AIPredictionAnalysis (AI予測分析)
        │   ├── AIAnalysisAlert (AI分析アラート)
        │   ├── AIAnalysisSummary (AI分析サマリー)
        │   ├── AIAnalysisInsights (AI分析インサイト)
        │   └── AIAnalysisPostTypeHighlight[] (AI分析投稿タイプハイライト)
        │
        ├── PostTypeInsights (投稿タイプインサイト)
        │   └── PostTypeInsightCard[] (投稿タイプインサイトカード)
        │
        ├── ContentPerformanceSection (コンテンツパフォーマンスセクション)
        │   ├── FeedPerformanceCard (フィードパフォーマンスカード)
        │   │   ├── FeedMetrics (フィードメトリクス)
        │   │   └── FeedReachSources (フィードリーチソース)
        │   └── ReelPerformanceCard (リールパフォーマンスカード)
        │       ├── ReelMetrics (リールメトリクス)
        │       └── ReelReachSources (リールリーチソース)
        │
        ├── AudienceBreakdownSection (オーディエンス内訳セクション)
        │   ├── FeedAudienceCard (フィードオーディエンスカード)
        │   │   ├── GenderBreakdown (性別内訳)
        │   │   └── AgeBreakdown (年齢内訳)
        │   └── ReelAudienceCard (リールオーディエンスカード)
        │       ├── GenderBreakdown (性別内訳)
        │       └── AgeBreakdown (年齢内訳)
        │
        ├── NextMonthFocusActions (翌月フォーカスアクション)
        │   └── FocusActionCard[] (フォーカスアクションカード)
        │       ├── ActionTitle (アクションタイトル)
        │       ├── ActionDescription (アクション説明)
        │       └── ActionCheckbox (アクションチェックボックス)
        │
        ├── PostDeepDiveSection (投稿深掘りセクション)
        │   └── PostDeepDiveCard[] (投稿深掘りカード)
        │
        ├── LearningReferenceCard (学習参照カード)
        │   └── ReferenceList (参照一覧)
        │
        ├── KPIDrilldownSection (KPIドリルダウンセクション)
        │   └── KPIBreakdownCard[] (KPIブレークダウンカード)
        │       ├── KPILabel (KPIラベル)
        │       ├── KPIValue (KPI値)
        │       ├── KPIChange (KPI変化)
        │       ├── KPISegments (KPIセグメント)
        │       └── KPITopPosts (KPIトップ投稿)
        │
        ├── FeedbackSentimentCard (フィードバックセンチメントカード)
        │   ├── SentimentSummary (センチメントサマリー)
        │   └── SentimentChart (センチメントチャート)
        │
        ├── TimeSlotHeatmap (時間帯ヒートマップ)
        │   └── HeatmapGrid (ヒートマップグリッド)
        │
        ├── AdvancedAnalysis (高度な分析)
        │   ├── HashtagStats (ハッシュタグ統計)
        │   └── PatternHighlights (パターンハイライト)
        │
        ├── RiskAlerts (リスクアラート)
        │   └── RiskAlertCard[] (リスクアラートカード)
        │
        ├── PlanGoalsSection (計画目標セクション)
        │   └── GoalCard[] (目標カード)
        │
        ├── OverviewHistorySection (概要履歴セクション)
        │   └── HistoryCard[] (履歴カード)
        │
        └── DataExport (データエクスポート)
            └── ExportButton (エクスポートボタン)
```

### 使用コンポーネント

- **`ReportHeader`** (`/src/app/instagram/monthly-report/components/ReportHeader.tsx`)
  - レポートヘッダー
  - 月セレクター、期間セレクター

- **`PerformanceRating`** (`/src/app/instagram/monthly-report/components/PerformanceRating.tsx`)
  - パフォーマンス評価とPDCAメトリクスを表示
  - 評価サークル、PDCAステータスカード

- **`MetricsCards`** (`/src/app/instagram/monthly-report/components/MetricsCards.tsx`)
  - メトリクスカードを表示
  - いいね、コメント、シェア、リーチ、フォロワーなどのカード

- **`DetailedStats`** (`/src/app/instagram/monthly-report/components/DetailedStats.tsx`)
  - 詳細な統計データを表示
  - アカウントスコア、比較、投稿タイプ統計

- **`VisualizationSection`** (`/src/app/instagram/monthly-report/components/VisualizationSection.tsx`)
  - 可視化セクション
  - アカウントスコアチャート、投稿タイプチャート

- **`AIPredictionAnalysis`** (`/src/app/instagram/monthly-report/components/AIPredictionAnalysis.tsx`)
  - AIによる分析結果を表示
  - 分析アラート、サマリー、インサイト、投稿タイプハイライト

- **`PostTypeInsights`** (`/src/app/instagram/monthly-report/components/PostTypeInsights.tsx`)
  - 投稿タイプ別インサイトを表示

- **`ContentPerformanceSection`** (`/src/app/instagram/monthly-report/components/content-performance-section.tsx`)
  - コンテンツパフォーマンスセクション
  - フィード・リールのパフォーマンスを表示

- **`AudienceBreakdownSection`** (`/src/app/instagram/monthly-report/components/audience-breakdown-section.tsx`)
  - オーディエンス内訳セクション
  - 性別・年齢別内訳を表示

- **`NextMonthFocusActions`** (`/src/app/instagram/monthly-report/components/next-month-focus-actions.tsx`)
  - 翌月フォーカスアクションを表示・管理
  - アクションカード、チェックボックス

- **`PostDeepDiveSection`** (`/src/app/instagram/monthly-report/components/post-deep-dive-section.tsx`)
  - 投稿深掘りセクション
  - 投稿の詳細分析を表示

- **`LearningReferenceCard`** (`/src/app/instagram/monthly-report/components/learning-reference-card.tsx`)
  - 学習参照カード
  - 参照一覧を表示

- **`KPIDrilldownSection`** (`/src/app/instagram/monthly-report/components/kpi-drilldown-section.tsx`)
  - KPIドリルダウンセクション
  - KPIブレークダウンカード

- **`FeedbackSentimentCard`** (`/src/app/instagram/monthly-report/components/feedback-sentiment-card.tsx`)
  - フィードバックセンチメントカード
  - センチメントサマリー、チャート

- **`TimeSlotHeatmap`** (`/src/app/instagram/monthly-report/components/time-slot-heatmap.tsx`)
  - 時間帯ヒートマップ
  - 投稿時間帯の分析を表示

- **`AdvancedAnalysis`** (`/src/app/instagram/monthly-report/components/AdvancedAnalysis.tsx`)
  - 高度な分析セクション
  - ハッシュタグ統計、パターンハイライト

- **`RiskAlerts`** (`/src/app/instagram/monthly-report/components/risk-alerts.tsx`)
  - リスクアラートを表示
  - リスクアラートカード

- **`PlanGoalsSection`** (`/src/app/instagram/monthly-report/components/plan-goals-section.tsx`)
  - 計画目標セクション
  - 目標カード

- **`OverviewHistorySection`** (`/src/app/instagram/monthly-report/components/OverviewHistorySection.tsx`)
  - 概要履歴セクション
  - 過去の分析履歴を表示

- **`DataExport`** (`/src/app/instagram/monthly-report/components/DataExport.tsx`)
  - データエクスポート機能

---

## フィード分析

**ページ**: `/src/app/analytics/feed/page.tsx`

```
FeedAnalyticsPage
├── AuthGuard (認証ガード)
└── FeedAnalyticsPageContent
    └── SNSLayout
        ├── FeedAnalyticsForm (フィード分析フォーム)
        │   ├── PostSelector (投稿セレクター)
        │   ├── AnalyticsInputForm (分析入力フォーム)
        │   │   ├── BasicMetricsInput (基本メトリクス入力)
        │   │   │   ├── LikesInput (いいね入力)
        │   │   │   ├── CommentsInput (コメント入力)
        │   │   │   ├── SharesInput (シェア入力)
        │   │   │   ├── ReachInput (リーチ入力)
        │   │   │   └── SavesInput (保存入力)
        │   │   │
        │   │   ├── ReachSourceInput (リーチソース入力)
        │   │   │   ├── ProfileReachInput (プロフィールリーチ入力)
        │   │   │   ├── FeedReachInput (フィードリーチ入力)
        │   │   │   ├── ExploreReachInput (探索リーチ入力)
        │   │   │   ├── SearchReachInput (検索リーチ入力)
        │   │   │   └── OtherReachInput (その他リーチ入力)
        │   │   │
        │   │   └── AudienceInput (オーディエンス入力)
        │   │       ├── GenderInput (性別入力)
        │   │       └── AgeInput (年齢入力)
        │   │
        │   └── FormActions (フォームアクション)
        │
        └── FeedAnalyticsAIInsights (フィード分析AIインサイト)
            ├── InsightSummary (インサイトサマリー)
            ├── InsightList (インサイト一覧)
            │   └── InsightItem[] (インサイトアイテム)
            └── RecommendedActions (推奨アクション)
                └── ActionItem[] (アクションアイテム)
```

### 使用コンポーネント

- **`FeedAnalyticsForm`** (`/src/app/instagram/components/FeedAnalyticsForm.tsx`)
  - フィード投稿の分析データ入力フォーム
  - 基本メトリクス、リーチソース、オーディエンスの入力

- **`FeedAnalyticsAIInsights`** (`/src/app/analytics/components/FeedAnalyticsAIInsights.tsx`)
  - フィード分析のAIインサイトを表示
  - インサイトサマリー、一覧、推奨アクション

---

## コンポーネントの依存関係

### 共通コンポーネント

以下のコンポーネントは複数のページで使用されます：

- **`SNSLayout`** - すべてのInstagram関連ページで使用
- **`AuthGuard`** - 認証が必要なすべてのページで使用
- **`CurrentPlanCard`** - ダッシュボード、月次レポートで使用
- **`RechartsAreaChart`** - チャート表示が必要なページで使用

### ページ固有コンポーネント

各ページには専用のコンポーネントがあります：

- **月次レポート**: 22個の専用コンポーネント
- **フィード作成（Lab）**: 11個の専用コンポーネント
- **運用計画（Plan）**: 6個の専用コンポーネント
- **投稿一覧**: 4個の専用コンポーネント

---

## 注意事項

- このドキュメントは、プロジェクトの現時点でのコンポーネント構造を反映しています
- コンポーネントの追加・削除・変更に伴い、定期的に更新が必要です
- コンポーネント名は実際のファイル名と一致しています
- ツリー構造は実際のレンダリング順序を反映しています

