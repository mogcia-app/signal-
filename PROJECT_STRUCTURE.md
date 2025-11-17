# プロジェクト構造ドキュメント

このドキュメントは、Signalプロジェクトの各ファイルとディレクトリの役割を説明します。

## 目次

- [ページ（page.tsx）](#ページpagetstsx)
- [APIルート（route.ts）](#apiルートroutets)
- [コンポーネント](#コンポーネント)
- [ライブラリ・ユーティリティ（lib/）](#ライブラリユーティリティlib)
- [BFF（Backend for Frontend）](#bffbackend-for-frontend)

---

## ページ（page.tsx）

### ルートページ

#### `/src/app/page.tsx`
- **役割**: アプリケーションのエントリーポイント
- **機能**: 認証状態を確認し、ログイン済みユーザーは`/instagram/lab/feed`へ、未ログインユーザーは`/login`へリダイレクト

### 認証・オンボーディング

#### `/src/app/login/page.tsx`
- **役割**: ログインページ
- **機能**: メールアドレスとパスワードでログイン、認証成功後は`/instagram/lab/feed`へリダイレクト

#### `/src/app/onboarding/page.tsx`
- **役割**: 新規ユーザー向けオンボーディングページ
- **機能**: 初期設定やチュートリアルを表示

#### `/src/app/terms/page.tsx`
- **役割**: 利用規約ページ
- **機能**: 利用規約の表示

#### `/src/app/guide/page.tsx`
- **役割**: ガイドページ
- **機能**: アプリケーションの使い方を説明

### Instagram関連ページ

#### `/src/app/instagram/page.tsx`
- **役割**: Instagramダッシュボード（メイン画面）
- **機能**: 
  - ダッシュボード統計（フォロワー、エンゲージメント、リーチなど）の表示
  - 次のアクションの表示
  - 最近の投稿の表示
  - パフォーマンスサマリーの表示
  - 目標進捗の表示
  - クイックアクション（フィード作成、リール作成など）へのリンク
- **使用API**: 
  - `/api/instagram/dashboard-stats`
  - `/api/instagram/recent-posts`
  - `/api/instagram/performance-summary`
  - `/api/instagram/goal-progress`
  - `/api/instagram/next-actions`
  - `/api/analytics`

#### `/src/app/instagram/posts/page.tsx`
- **役割**: 投稿一覧ページ
- **機能**: 
  - 全投稿の一覧表示
  - 投稿のフィルタリング（ステータス、投稿タイプ）
  - 投稿の詳細表示
  - 投稿の削除
- **使用API**: `/api/posts`

#### `/src/app/instagram/posts/[id]/page.tsx`
- **役割**: 投稿詳細ページ
- **機能**: 特定の投稿の詳細情報を表示

#### `/src/app/instagram/lab/page.tsx`
- **役割**: ラボ（投稿作成）のメインページ
- **機能**: フィード、リール、ストーリーの作成ページへのナビゲーション

#### `/src/app/instagram/lab/feed/page.tsx`
- **役割**: フィード投稿作成ページ
- **機能**: 
  - フィード投稿の作成・編集
  - AIによる投稿生成支援
  - スナップショットインサイトの表示
  - スケジュール生成・保存
  - A/Bテスト登録
- **使用API**: 
  - `/api/posts`
  - `/api/ai/post-generation`
  - `/api/analytics/snapshots`
  - `/api/instagram/feed-schedule`
  - `/api/instagram/schedule-save`

#### `/src/app/instagram/lab/reel/page.tsx`
- **役割**: リール投稿作成ページ
- **機能**: リール投稿の作成・編集（フィードと同様の機能）

#### `/src/app/instagram/lab/story/page.tsx`
- **役割**: ストーリー投稿作成ページ
- **機能**: ストーリー投稿の作成・編集

#### `/src/app/instagram/plan/page.tsx`
- **役割**: 運用計画（Plan）作成・管理ページ
- **機能**: 
  - 運用計画の作成・編集
  - シミュレーション実行
  - AI診断の実行
  - 戦略の選択
- **使用API**: 
  - `/api/plans`
  - `/api/instagram/simulation`
  - `/api/instagram/ai-diagnosis`
  - `/api/instagram/ai-strategy`

#### `/src/app/instagram/monthly-report/page.tsx`
- **役割**: 月次レポートページ
- **機能**: 
  - 月次パフォーマンス評価の表示
  - PDCAメトリクスの表示
  - 詳細統計の表示
  - AI分析結果の表示
  - 投稿タイプ別インサイトの表示
  - 改善アクションの表示
- **使用API**: 
  - `/api/analytics/monthly-report-summary`
  - `/api/ai/monthly-analysis`
  - `/api/ai/action-logs`
  - `/api/ai/overview-history`

#### `/src/app/instagram/analytics/reel/page.tsx`
- **役割**: リール分析ページ
- **機能**: リール投稿の分析データ入力・表示

#### `/src/app/instagram/analytics2/page.tsx`
- **役割**: 分析ページ（旧バージョン？）
- **機能**: 投稿分析データの入力

### その他のページ

#### `/src/app/analytics/feed/page.tsx`
- **役割**: フィード分析ページ
- **機能**: フィード投稿の分析データ入力・表示、AIインサイトの表示
- **使用API**: `/api/analytics/ai-insight`

#### `/src/app/learning/page.tsx`
- **役割**: 学習・参考ページ
- **機能**: 過去の投稿パターンや成功事例の学習コンテンツを表示

#### `/src/app/test-sentry/page.tsx`
- **役割**: Sentryテストページ
- **機能**: Sentryエラー監視のテスト用

---

## APIルート（route.ts）

### 認証関連

#### `/src/app/api/auth/change-password/route.ts`
- **役割**: パスワード変更API
- **機能**: ユーザーのパスワードを変更

#### `/src/app/api/auth/delete-account/route.ts`
- **役割**: アカウント削除API
- **機能**: ユーザーアカウントを削除

### 投稿関連

#### `/src/app/api/posts/route.ts`
- **役割**: 投稿のCRUD操作API
- **機能**: 
  - GET: 投稿一覧取得
  - POST: 投稿作成

#### `/src/app/api/posts/[id]/route.ts`
- **役割**: 特定投稿の操作API
- **機能**: 
  - GET: 投稿詳細取得
  - PUT: 投稿更新
  - DELETE: 投稿削除

### 分析（Analytics）関連

#### `/src/app/api/analytics/route.ts`
- **役割**: 分析データの基本操作API
- **機能**: 
  - GET: 分析データ一覧取得
  - POST: 分析データ作成

#### `/src/app/api/analytics/[id]/route.ts`
- **役割**: 特定分析データの操作API
- **機能**: 
  - GET: 分析データ詳細取得
  - PUT: 分析データ更新
  - DELETE: 分析データ削除

#### `/src/app/api/analytics/by-post/route.ts`
- **役割**: 投稿ID別の分析データ取得API
- **機能**: 特定の投稿IDに紐づく分析データを取得

#### `/src/app/api/analytics/snapshots/route.ts`
- **役割**: スナップショット（投稿分析サマリー）取得API
- **機能**: 投稿のスナップショットデータを取得

#### `/src/app/api/analytics/account-score/route.ts`
- **役割**: アカウントスコア取得API
- **機能**: ユーザーのアカウントスコアを計算・取得

#### `/src/app/api/analytics/daily-scores/route.ts`
- **役割**: 日次スコア取得API
- **機能**: 日別のアカウントスコアを取得

#### `/src/app/api/analytics/simple/route.ts`
- **役割**: 簡易分析データ取得API
- **機能**: シンプルな分析データを取得

#### `/src/app/api/analytics/ai-insight/route.ts`
- **役割**: AI分析インサイト生成API
- **機能**: フィードやリールの分析データからAIインサイトを生成
- **使用**: `/analytics/feed`ページで使用

#### `/src/app/api/analytics/monthly-report-summary/route.ts`
- **役割**: 月次レポートサマリー取得API（BFF）
- **機能**: 
  - 月次・週次の分析データを集計
  - 投稿タイプ別統計の計算
  - フィード・リールパフォーマンス統計の計算
  - オーディエンス分析
  - リーチソース分析
  - ハッシュタグ統計
  - 時間帯分析
  - KPIブレークダウン
  - フィードバックセンチメント分析
- **使用**: `/instagram/monthly-report`ページで使用
- **データソース**: 
  - Firebase `analytics`コレクション
  - Firebase `posts`コレクション
  - Firebase `ai_post_feedback`コレクション

#### `/src/app/api/analytics/weekly-report-summary/route.ts`
- **役割**: 週次レポートサマリー取得API
- **機能**: 週次の分析データを集計

#### `/src/app/api/analytics/monthly-summary/route.ts`
- **役割**: 月次サマリー取得API（旧バージョン？）
- **機能**: 月次の分析データを集計

#### `/src/app/api/analytics/monthly-review/route.ts`
- **役割**: 月次レビュー取得API
- **機能**: 月次レビューデータを取得

#### `/src/app/api/analytics/update-published-time/route.ts`
- **役割**: 公開日時更新API
- **機能**: 分析データの公開日時を更新

### AI関連

#### `/src/app/api/ai/chat/route.ts`
- **役割**: AIチャットAPI
- **機能**: AIチャットウィジェットからのメッセージを処理

#### `/src/app/api/ai/monthly-analysis/route.ts`
- **役割**: 月次AI分析API（BFF）
- **機能**: 
  - 月次・週次の分析データからAI分析を生成
  - PDCAメトリクスの計算
  - 計画戦略レビューの生成
  - 改善提案の生成
- **使用**: `/instagram/monthly-report`ページで使用
- **データソース**: 
  - Firebase `analytics`コレクション
  - Firebase `posts`コレクション
  - Firebase `userSchedules`コレクション
  - Firebase `plans`コレクション

#### `/src/app/api/ai/post-generation/route.ts`
- **役割**: AI投稿生成API
- **機能**: AIを使用して投稿コンテンツを生成
- **使用**: `/instagram/lab/feed`などで使用

#### `/src/app/api/ai/post-insight/route.ts`
- **役割**: 投稿インサイト生成API
- **機能**: 特定の投稿に対するAIインサイトを生成

#### `/src/app/api/ai/post-summaries/route.ts`
- **役割**: 投稿サマリー生成API
- **機能**: 複数の投稿のサマリーを生成

#### `/src/app/api/ai/comment-reply/route.ts`
- **役割**: AIコメント返信生成API
- **機能**: コメントに対する返信をAIで生成
- **使用**: `/instagram/lab/feed`のコメント返信アシスタントで使用

#### `/src/app/api/ai/feedback/route.ts`
- **役割**: AIフィードバック生成API
- **機能**: 投稿に対するフィードバックを生成

#### `/src/app/api/ai/action-logs/route.ts`
- **役割**: AIアクションログAPI
- **機能**: 
  - GET: アクションログ一覧取得
  - POST: アクションログ作成
  - PUT: アクションログ更新（実行済みフラグの更新など）
- **使用**: `/instagram/monthly-report`の「翌月フォーカスアクション」で使用

#### `/src/app/api/ai/overview-history/route.ts`
- **役割**: AI分析履歴取得API
- **機能**: 過去のAI分析結果の履歴を取得
- **使用**: `/instagram/monthly-report`で使用

#### `/src/app/api/ai/master-context/route.ts`
- **役割**: マスターコンテキスト取得API
- **機能**: AI分析に使用するマスターコンテキストを取得

#### `/src/app/api/ai/generate-thumbnail/route.ts`
- **役割**: サムネイル生成API
- **機能**: AIを使用してサムネイル画像を生成

### Instagram関連

#### `/src/app/api/instagram/dashboard-stats/route.ts`
- **役割**: ダッシュボード統計取得API（BFF）
- **機能**: Instagramダッシュボードに表示する統計データを集計
- **使用**: `/instagram`ページで使用

#### `/src/app/api/instagram/recent-posts/route.ts`
- **役割**: 最近の投稿取得API（BFF）
- **機能**: 最近の投稿一覧を取得
- **使用**: `/instagram`ページで使用

#### `/src/app/api/instagram/performance-summary/route.ts`
- **役割**: パフォーマンスサマリー取得API（BFF）
- **機能**: パフォーマンスサマリーデータを集計
- **使用**: `/instagram`ページで使用

#### `/src/app/api/instagram/goal-progress/route.ts`
- **役割**: 目標進捗取得API（BFF）
- **機能**: 目標の進捗状況を計算
- **使用**: `/instagram`ページで使用

#### `/src/app/api/instagram/next-actions/route.ts`
- **役割**: 次のアクション取得API（BFF）
- **機能**: ユーザーが次に実行すべきアクションを提案
- **使用**: `/instagram`ページで使用

#### `/src/app/api/instagram/simulation/route.ts`
- **役割**: シミュレーション実行API
- **機能**: 運用計画のシミュレーションを実行
- **使用**: `/instagram/plan`ページで使用

#### `/src/app/api/instagram/ai-diagnosis/route.ts`
- **役割**: AI診断実行API
- **機能**: 現在の運用状況をAIで診断
- **使用**: `/instagram/plan`ページで使用

#### `/src/app/api/instagram/ai-strategy/route.ts`
- **役割**: AI戦略生成API
- **機能**: AIを使用して運用戦略を生成
- **使用**: `/instagram/plan`ページで使用

#### `/src/app/api/instagram/feed-schedule/route.ts`
- **役割**: フィードスケジュール生成API
- **機能**: フィード投稿のスケジュールを生成
- **使用**: `/instagram/lab/feed`ページで使用

#### `/src/app/api/instagram/reel-schedule/route.ts`
- **役割**: リールスケジュール生成API
- **機能**: リール投稿のスケジュールを生成

#### `/src/app/api/instagram/story-schedule/route.ts`
- **役割**: ストーリースケジュール生成API
- **機能**: ストーリー投稿のスケジュールを生成

#### `/src/app/api/instagram/schedule-save/route.ts`
- **役割**: スケジュール保存API
- **機能**: 生成されたスケジュールを保存
- **使用**: `/instagram/lab/feed`などで使用

#### `/src/app/api/instagram/feed-suggestions/route.ts`
- **役割**: フィード提案API
- **機能**: フィード投稿の提案を生成

#### `/src/app/api/instagram/reel-structure/route.ts`
- **役割**: リール構造取得API
- **機能**: リールの構造データを取得

#### `/src/app/api/instagram/ab-test/route.ts`
- **役割**: A/BテストAPI
- **機能**: A/Bテストの登録・取得

### 計画（Plans）関連

#### `/src/app/api/plans/route.ts`
- **役割**: 計画のCRUD操作API
- **機能**: 
  - GET: 計画一覧取得
  - POST: 計画作成

#### `/src/app/api/plans/[id]/route.ts`
- **役割**: 特定計画の操作API
- **機能**: 
  - GET: 計画詳細取得
  - PUT: 計画更新
  - DELETE: 計画削除

### ユーザー関連

#### `/src/app/api/user/profile/route.ts`
- **役割**: ユーザープロフィールAPI
- **機能**: ユーザープロフィールの取得・更新

#### `/src/app/api/user/sns-profile/route.ts`
- **役割**: SNSプロフィールAPI
- **機能**: SNS（Instagram）プロフィールの取得・更新

#### `/src/app/api/user/business-info/route.ts`
- **役割**: ビジネス情報API
- **機能**: ビジネス情報の取得・更新

#### `/src/app/api/users/route.ts`
- **役割**: ユーザー一覧取得API（管理者用？）
- **機能**: ユーザー一覧を取得

### 通知関連

#### `/src/app/api/notifications/route.ts`
- **役割**: 通知のCRUD操作API
- **機能**: 
  - GET: 通知一覧取得
  - POST: 通知作成

#### `/src/app/api/notifications/[id]/route.ts`
- **役割**: 特定通知の操作API
- **機能**: 
  - GET: 通知詳細取得
  - PUT: 通知更新
  - DELETE: 通知削除

#### `/src/app/api/notifications/[id]/actions/route.ts`
- **役割**: 通知アクションAPI
- **機能**: 通知に対するアクション（既読、削除など）を実行

### その他

#### `/src/app/api/feedback/route.ts`
- **役割**: フィードバックAPI
- **機能**: フィードバックの送信

#### `/src/app/api/rag/route.ts`
- **役割**: RAG（Retrieval-Augmented Generation）API
- **機能**: RAG機能を提供

#### `/src/app/api/ab-tests/route.ts`
- **役割**: A/Bテスト一覧取得API
- **機能**: A/Bテストの一覧を取得

#### `/src/app/api/ai-chat/usage/route.ts`
- **役割**: AIチャット使用量取得API
- **機能**: AIチャットの使用量を取得

#### `/src/app/api/monthly-report/route.ts`
- **役割**: 月次レポート取得API（旧バージョン？）
- **機能**: 月次レポートを取得

#### `/src/app/api/admin/ai-chat/reset-usage/route.ts`
- **役割**: AIチャット使用量リセットAPI（管理者用）
- **機能**: AIチャットの使用量をリセット

---

## コンポーネント

### 共通コンポーネント

#### `/src/components/auth-guard.tsx`
- **役割**: 認証ガードコンポーネント
- **機能**: 認証されていないユーザーをログインページへリダイレクト

#### `/src/components/sns-layout.tsx`
- **役割**: SNSレイアウトコンポーネント
- **機能**: InstagramなどのSNSページの共通レイアウトを提供

#### `/src/components/common-header.tsx`
- **役割**: 共通ヘッダーコンポーネント
- **機能**: 共通のヘッダーを表示

#### `/src/components/CurrentPlanCard.tsx`
- **役割**: 現在の計画カードコンポーネント
- **機能**: 現在の運用計画を表示

#### `/src/components/PlanCard.tsx`
- **役割**: 計画カードコンポーネント
- **機能**: 計画情報をカード形式で表示

#### `/src/components/RechartsAreaChart.tsx`
- **役割**: エリアチャートコンポーネント
- **機能**: Rechartsを使用したエリアチャートを表示

#### `/src/components/app-notifications.tsx`
- **役割**: アプリ通知コンポーネント
- **機能**: アプリ内通知を表示

#### `/src/components/ai-chat-widget.tsx`
- **役割**: AIチャットウィジェットコンポーネント
- **機能**: AIチャット機能を提供

### Instagram関連コンポーネント

#### `/src/app/instagram/components/AnalyticsCharts.tsx`
- **役割**: 分析チャートコンポーネント
- **機能**: 分析データをチャートで表示

#### `/src/app/instagram/components/AnalyticsForm.tsx`
- **役割**: 分析フォームコンポーネント
- **機能**: 分析データ入力フォーム

#### `/src/app/instagram/components/FeedAnalyticsForm.tsx`
- **役割**: フィード分析フォームコンポーネント
- **機能**: フィード投稿の分析データ入力フォーム

#### `/src/app/instagram/components/ReelAnalyticsForm.tsx`
- **役割**: リール分析フォームコンポーネント
- **機能**: リール投稿の分析データ入力フォーム

#### `/src/app/instagram/components/PostAnalysisInput.tsx`
- **役割**: 投稿分析入力コンポーネント
- **機能**: 投稿の分析データを入力

#### `/src/app/instagram/posts/components/PostCard.tsx`
- **役割**: 投稿カードコンポーネント
- **機能**: 投稿情報をカード形式で表示

#### `/src/app/instagram/posts/components/PostStats.tsx`
- **役割**: 投稿統計コンポーネント
- **機能**: 投稿の統計情報を表示

### ラボ（Lab）関連コンポーネント

#### `/src/app/instagram/lab/components/PostEditor.tsx`
- **役割**: 投稿エディターコンポーネント
- **機能**: 投稿の作成・編集UI

#### `/src/app/instagram/lab/components/ToolPanel.tsx`
- **役割**: ツールパネルコンポーネント
- **機能**: 投稿作成時の各種ツールを表示

#### `/src/app/instagram/lab/components/AIPostGenerator.tsx`
- **役割**: AI投稿生成コンポーネント
- **機能**: AIを使用した投稿生成UI

#### `/src/app/instagram/lab/components/CommentReplyAssistant.tsx`
- **役割**: コメント返信アシスタントコンポーネント
- **機能**: AIを使用したコメント返信生成UI

#### `/src/app/instagram/lab/components/SnapshotInsights.tsx`
- **役割**: スナップショットインサイトコンポーネント
- **機能**: 過去の投稿パターンからのインサイトを表示

#### `/src/app/instagram/lab/components/ABTestPanel.tsx`
- **役割**: A/Bテストパネルコンポーネント
- **機能**: A/Bテストの登録・管理UI

### 月次レポート関連コンポーネント

#### `/src/app/instagram/monthly-report/components/PerformanceRating.tsx`
- **役割**: パフォーマンス評価コンポーネント
- **機能**: パフォーマンス評価とPDCAメトリクスを表示

#### `/src/app/instagram/monthly-report/components/DetailedStats.tsx`
- **役割**: 詳細統計コンポーネント
- **機能**: 詳細な統計データを表示

#### `/src/app/instagram/monthly-report/components/AIPredictionAnalysis.tsx`
- **役割**: AI予測分析コンポーネント
- **機能**: AIによる分析結果を表示

#### `/src/app/instagram/monthly-report/components/NextMonthFocusActions.tsx`
- **役割**: 翌月フォーカスアクションコンポーネント
- **機能**: 翌月に実行すべきアクションを表示・管理

#### `/src/app/instagram/monthly-report/components/AudienceBreakdownSection.tsx`
- **役割**: オーディエンス内訳セクションコンポーネント
- **機能**: オーディエンスの性別・年齢別内訳を表示

#### `/src/app/instagram/monthly-report/components/ContentPerformanceSection.tsx`
- **役割**: コンテンツパフォーマンスセクションコンポーネント
- **機能**: フィード・リールのパフォーマンスを表示

### 計画（Plan）関連コンポーネント

#### `/src/app/instagram/plan/components/PlanForm.tsx`
- **役割**: 計画フォームコンポーネント
- **機能**: 運用計画の入力フォーム

#### `/src/app/instagram/plan/components/SimulationPanel.tsx`
- **役割**: シミュレーションパネルコンポーネント
- **機能**: シミュレーション結果を表示

#### `/src/app/instagram/plan/components/AIDiagnosisPanel.tsx`
- **役割**: AI診断パネルコンポーネント
- **機能**: AI診断結果を表示

### 分析（Analytics）関連コンポーネント

#### `/src/app/analytics/components/FeedAnalyticsAIInsights.tsx`
- **役割**: フィード分析AIインサイトコンポーネント
- **機能**: フィード分析のAIインサイトを表示
- **使用**: `/analytics/feed`ページで使用

---

## ライブラリ・ユーティリティ（lib/）

### API関連

#### `/src/lib/api.ts`
- **役割**: API呼び出し用のクライアント関数
- **機能**: 
  - `postsApi`: 投稿関連API
  - `actionLogsApi`: アクションログ関連API
  - その他のAPIクライアント関数

### Firebase関連

#### `/src/lib/firebase.ts`
- **役割**: Firebaseクライアント設定
- **機能**: Firebase Authentication、Firestoreなどのクライアント設定

#### `/src/lib/firebase-admin.ts`
- **役割**: Firebase Admin SDK設定
- **機能**: サーバーサイドでのFirebase操作（Firestore、Authenticationなど）

#### `/src/lib/functions.ts`
- **役割**: Firebase Functions呼び出し
- **機能**: Firebase Cloud Functionsを呼び出すためのユーティリティ

### AI関連

#### `/src/lib/ai/context.ts`
- **役割**: AIコンテキスト構築
- **機能**: 
  - `buildAIContext`: AI分析に使用するコンテキストを構築
  - マスターコンテキスト、スナップショット参照、学習コンテキストなどを統合

### 分析（Analytics）関連

#### `/src/lib/analytics/snapshot-generator.ts`
- **役割**: スナップショット生成
- **機能**: 投稿のスナップショット（分析サマリー）を生成

#### `/src/lib/analytics/ab-test-utils.ts`
- **役割**: A/Bテストユーティリティ
- **機能**: A/Bテストの集計・分析ユーティリティ

### サーバー関連

#### `/src/lib/server/auth-context.ts`
- **役割**: 認証コンテキスト構築
- **機能**: 
  - `requireAuthContext`: APIルートで認証を要求
  - `buildErrorResponse`: エラーレスポンスを構築

#### `/src/lib/server/firebase-token-verifier.ts`
- **役割**: Firebaseトークン検証
- **機能**: Firebase認証トークンを検証

#### `/src/lib/server/logging.ts`
- **役割**: ロギングユーティリティ
- **機能**: サーバーサイドのログ記録

#### `/src/lib/server/service-auth.ts`
- **役割**: サービス認証
- **機能**: サービス間認証

### その他

#### `/src/lib/auth.ts`
- **役割**: 認証ユーティリティ
- **機能**: 認証関連のユーティリティ関数

#### `/src/lib/cache.ts`
- **役割**: キャッシュユーティリティ
- **機能**: データキャッシュ機能

#### `/src/lib/utils.ts`
- **役割**: 汎用ユーティリティ
- **機能**: 汎用的なユーティリティ関数

#### `/src/lib/monthly-report-notifications.ts`
- **役割**: 月次レポート通知
- **機能**: 月次レポートの通知機能

#### `/src/lib/plans/sync-follower-progress.ts`
- **役割**: フォロワー進捗同期
- **機能**: 計画のフォロワー進捗を同期

---

## BFF（Backend for Frontend）

BFFパターンを使用しているAPIルートは、複数のデータソースからデータを集約し、フロントエンドに最適化された形式で返します。

### 主要なBFF API

1. **`/api/analytics/monthly-report-summary`**
   - 月次レポート用のデータを集約
   - `analytics`、`posts`、`ai_post_feedback`コレクションからデータを取得
   - 統計計算、オーディエンス分析、リーチソース分析などを実行

2. **`/api/ai/monthly-analysis`**
   - 月次AI分析を実行
   - 複数のデータソースからコンテキストを構築
   - PDCAメトリクスを計算
   - AI分析結果を生成

3. **`/api/instagram/dashboard-stats`**
   - ダッシュボード統計を集約
   - フォロワー、エンゲージメント、リーチなどの統計を計算

4. **`/api/instagram/recent-posts`**
   - 最近の投稿を取得
   - 分析データと結合

5. **`/api/instagram/performance-summary`**
   - パフォーマンスサマリーを集約
   - 週次成長、エンゲージメント、頻度などを計算

6. **`/api/instagram/goal-progress`**
   - 目標進捗を計算
   - 週次投稿数、フォロワー成長などの進捗を計算

7. **`/api/instagram/next-actions`**
   - 次のアクションを提案
   - 現在の状況から次に実行すべきアクションを決定

---

## データフロー

### 投稿作成フロー

1. ユーザーが`/instagram/lab/feed`で投稿を作成
2. `PostEditor`コンポーネントで投稿データを入力
3. `/api/posts`（POST）で投稿を作成
4. Firebase `posts`コレクションに保存

### 分析データ入力フロー

1. ユーザーが`/analytics/feed`で分析データを入力
2. `/api/analytics`（POST）で分析データを作成
3. Firebase `analytics`コレクションに保存

### 月次レポート表示フロー

1. ユーザーが`/instagram/monthly-report`にアクセス
2. `/api/analytics/monthly-report-summary`でデータを取得
   - `analytics`コレクションから分析データを取得
   - `posts`コレクションから投稿データを取得
   - 統計を計算
3. `/api/ai/monthly-analysis`でAI分析を実行
   - 分析データからAI分析を生成
   - PDCAメトリクスを計算
4. 結果を表示

---

## Firebaseコレクション（Firestore）

このセクションでは、Firebase Firestoreの各コレクションと、それらがどこで参照・使用されているかを説明します。

### 主要コレクション

#### `analytics`
- **役割**: 投稿の分析データを保存
- **データ内容**: 
  - いいね数、コメント数、シェア数、リーチ数、保存数
  - フォロワー増加数
  - エンゲージメント率
  - オーディエンス分析（性別、年齢）
  - リーチソース分析
  - 投稿タイプ（feed/reel/story）
  - 公開日時
- **参照箇所**:
  - `/api/analytics/route.ts` - 分析データのCRUD操作
  - `/api/analytics/monthly-report-summary/route.ts` - 月次レポート用データ集約
  - `/api/analytics/simple/route.ts` - 簡易分析データ取得
  - `/api/analytics/by-post/route.ts` - 投稿ID別の分析データ取得
  - `/api/analytics/ai-insight/route.ts` - AIインサイト生成
  - `/api/ai/monthly-analysis/route.ts` - 月次AI分析
  - `/api/ai/post-generation/route.ts` - AI投稿生成時の参考データ
  - `/api/instagram/dashboard-stats/route.ts` - ダッシュボード統計
  - `/api/instagram/recent-posts/route.ts` - 最近の投稿取得
  - `/api/instagram/performance-summary/route.ts` - パフォーマンスサマリー
  - `/api/instagram/goal-progress/route.ts` - 目標進捗計算
  - `/api/instagram/next-actions/route.ts` - 次のアクション提案
  - `/api/instagram/ai-diagnosis/route.ts` - AI診断
  - `/api/instagram/dashboard-charts/route.ts` - ダッシュボードチャート
  - `/lib/plans/sync-follower-progress.ts` - フォロワー進捗同期
  - `/lib/analytics/snapshot-generator.ts` - スナップショット生成

#### `posts`
- **役割**: 投稿データを保存
- **データ内容**: 
  - タイトル、コンテンツ、ハッシュタグ
  - 投稿タイプ（feed/reel/story）
  - スケジュール日時
  - ステータス（draft/scheduled/published）
  - 画像データ
  - スナップショット参照
- **参照箇所**:
  - `/api/posts/route.ts` - 投稿のCRUD操作
  - `/api/posts/[id]/route.ts` - 特定投稿の操作
  - `/api/analytics/monthly-report-summary/route.ts` - 月次レポート用データ集約
  - `/api/ai/monthly-analysis/route.ts` - 月次AI分析
  - `/api/instagram/dashboard-stats/route.ts` - ダッシュボード統計
  - `/api/instagram/recent-posts/route.ts` - 最近の投稿取得
  - `/api/instagram/performance-summary/route.ts` - パフォーマンスサマリー
  - `/api/instagram/goal-progress/route.ts` - 目標進捗計算
  - `/api/instagram/next-actions/route.ts` - 次のアクション提案
  - `/api/instagram/ai-diagnosis/route.ts` - AI診断
  - `/api/instagram/dashboard-charts/route.ts` - ダッシュボードチャート
  - `/api/analytics/route.ts` - 目標達成度チェック
  - `/lib/analytics/snapshot-generator.ts` - スナップショット生成

#### `users`
- **役割**: ユーザープロフィール情報を保存
- **データ内容**: 
  - メールアドレス、名前
  - ロール、契約情報
  - SNS設定
  - ビジネス情報
- **参照箇所**:
  - `/api/user/profile/route.ts` - プロフィール取得・更新
  - `/api/user/business-info/route.ts` - ビジネス情報取得・更新
  - `/api/user/sns-profile/route.ts` - SNSプロフィール取得・更新
  - `/api/instagram/ai-strategy/route.ts` - AI戦略生成
  - `/api/instagram/simulation/route.ts` - シミュレーション実行
  - `/lib/ai/context.ts` - AIコンテキスト構築
  - `/lib/server/auth-context.ts` - 認証コンテキスト構築
  - `/contexts/auth-context.tsx` - 認証コンテキスト（クライアント）

#### `users/{userId}/postPerformanceSnapshots`（サブコレクション）
- **役割**: 投稿のパフォーマンススナップショットを保存
- **データ内容**: 
  - 投稿のパフォーマンス分析結果
  - スコア、タグ（gold/negative/normal）
  - メトリクス、テキスト特徴
- **参照箇所**:
  - `/api/analytics/snapshots/route.ts` - スナップショット取得
  - `/api/ai/monthly-analysis/route.ts` - 月次AI分析
  - `/lib/ai/context.ts` - AIコンテキスト構築
  - `/lib/analytics/snapshot-generator.ts` - スナップショット生成

#### `plans`
- **役割**: 運用計画（Plan）を保存
- **データ内容**: 
  - 計画の基本情報
  - 戦略、カテゴリ
  - シミュレーション結果
  - 開始日・終了日
  - ステータス（active/inactive）
- **参照箇所**:
  - `/api/plans/route.ts` - 計画のCRUD操作
  - `/api/plans/[id]/route.ts` - 特定計画の操作
  - `/api/ai/monthly-analysis/route.ts` - 月次AI分析（計画投稿数の計算）
  - `/api/instagram/ai-strategy/route.ts` - AI戦略生成
  - `/lib/ai/context.ts` - AIコンテキスト構築
  - `/lib/plans/sync-follower-progress.ts` - フォロワー進捗同期

#### `userSchedules`
- **役割**: ユーザーの投稿スケジュールを保存
- **データ内容**: 
  - フィード、リール、ストーリーのスケジュール
  - 月次投稿数、日次投稿数
- **参照箇所**:
  - `/api/instagram/schedule-save/route.ts` - スケジュール保存・取得
  - `/api/ai/monthly-analysis/route.ts` - 月次AI分析（計画投稿数の計算、フォールバック）

#### `ai_post_feedback`
- **役割**: AIによる投稿フィードバックを保存
- **データ内容**: 
  - 投稿ID、ユーザーID
  - フィードバック内容
  - センチメント（positive/negative/neutral）
  - 作成日時
- **参照箇所**:
  - `/api/analytics/monthly-report-summary/route.ts` - 月次レポート用フィードバックセンチメント分析
  - `/api/ai/monthly-analysis/route.ts` - 月次AI分析
  - `/api/posts/[id]/route.ts` - 投稿削除時の関連フィードバック削除

#### `ai_action_logs`
- **役割**: AIが提案したアクションのログを保存
- **データ内容**: 
  - アクションID、ユーザーID
  - アクション内容
  - 実行済みフラグ（applied）
  - フォーカスエリア
  - 作成日時・更新日時
- **参照箇所**:
  - `/api/ai/action-logs/route.ts` - アクションログのCRUD操作
  - `/api/ai/monthly-analysis/route.ts` - 月次AI分析（改善反映率の計算）
  - `/api/posts/[id]/route.ts` - 投稿削除時の関連アクションログ削除
  - `/lib/ai/context.ts` - AIコンテキスト構築

#### `ai_overview_history`
- **役割**: AI分析の履歴を保存
- **データ内容**: 
  - ユーザーID、期間（monthly/weekly）
  - 分析結果
  - 作成日時
- **参照箇所**:
  - `/api/ai/overview-history/route.ts` - 分析履歴取得
  - `/api/ai/monthly-analysis/route.ts` - 月次AI分析（履歴取得・保存）

#### `ai_post_summaries`
- **役割**: AIによる投稿サマリーを保存
- **データ内容**: 
  - 投稿ID、ユーザーID
  - サマリー内容
- **参照箇所**:
  - `/api/ai/post-summaries/route.ts` - 投稿サマリー取得
  - `/api/analytics/ai-insight/route.ts` - AIインサイト生成（キャッシュとして使用）

#### `ai_master_context_cache`
- **役割**: AIマスターコンテキストのキャッシュを保存
- **データ内容**: 
  - ユーザーID
  - マスターコンテキストデータ
  - キャッシュ有効期限
- **参照箇所**:
  - `/api/ai/master-context/route.ts` - マスターコンテキスト取得
  - `/lib/ai/context.ts` - AIコンテキスト構築

#### `ab_tests`
- **役割**: A/Bテストデータを保存
- **データ内容**: 
  - テストID、ユーザーID
  - テスト内容、結果
  - ステータス（completed/active）
- **参照箇所**:
  - `/api/ab-tests/route.ts` - A/BテストのCRUD操作
  - `/api/ai/monthly-analysis/route.ts` - 月次AI分析
  - `/lib/ai/context.ts` - AIコンテキスト構築
  - `/lib/analytics/ab-test-utils.ts` - A/Bテストユーティリティ

#### `notifications`
- **役割**: アプリ内通知を保存
- **データ内容**: 
  - 通知タイトル、内容
  - ステータス（published/draft）
  - 作成日時
- **参照箇所**:
  - `/api/notifications/route.ts` - 通知のCRUD操作

#### `userNotifications`（サブコレクション？）
- **役割**: ユーザーごとの通知状態を保存
- **データ内容**: 
  - ユーザーID、通知ID
  - 既読状態
- **参照箇所**:
  - `/api/notifications/[id]/actions/route.ts` - 通知アクション（既読、削除など）

#### `goalSettings`
- **役割**: ユーザーの目標設定を保存
- **データ内容**: 
  - 週次投稿目標
  - フォロワー成長目標
- **参照箇所**:
  - `/api/analytics/route.ts` - 目標達成度チェック
  - `/api/instagram/goal-progress/route.ts` - 目標進捗計算
  - `/api/instagram/next-actions/route.ts` - 次のアクション提案

#### `serviceRateLimits`
- **役割**: サービスレート制限を管理
- **データ内容**: 
  - サービス名、ユーザーID
  - リクエスト数、制限時間
- **参照箇所**:
  - `/lib/server/auth-context.ts` - レート制限チェック

#### `monthlyReports`
- **役割**: 月次レポートデータを保存（使用されているか要確認）
- **参照箇所**:
  - `/api/instagram/ai-strategy/route.ts` - AI戦略生成

### コレクション間の関係

1. **`posts` ↔ `analytics`**
   - `analytics.postId`で`posts.id`を参照
   - 投稿と分析データは1対1または1対多の関係

2. **`users` ↔ `posts`**
   - `posts.userId`で`users.id`を参照
   - ユーザーと投稿は1対多の関係

3. **`users` ↔ `users/{userId}/postPerformanceSnapshots`**
   - サブコレクションとして`users`に紐づく
   - ユーザーとスナップショットは1対多の関係

4. **`posts` ↔ `ai_post_feedback`**
   - `ai_post_feedback.postId`で`posts.id`を参照
   - 投稿とフィードバックは1対多の関係

5. **`users` ↔ `ai_action_logs`**
   - `ai_action_logs.userId`で`users.id`を参照
   - ユーザーとアクションログは1対多の関係

6. **`users` ↔ `plans`**
   - `plans.userId`で`users.id`を参照
   - ユーザーと計画は1対多の関係

---

## 注意事項

- このドキュメントは、プロジェクトの現時点での構造を反映しています
- ファイルの追加・削除・変更に伴い、定期的に更新が必要です
- BFFパターンを使用しているAPIは、複数のデータソースからデータを集約するため、パフォーマンスに注意が必要です
- Firebaseコレクションの構造変更時は、関連するすべてのAPIルートとコンポーネントを確認してください

