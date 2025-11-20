# 月次レポートAPI複雑性の可視化

## 現状：7つのAPIルート

```
月次レポートページ (/instagram/monthly-report)
│
├─ 1. GET /api/analytics/monthly-report-summary
│  ├─ analytics コレクション（全件取得）
│  ├─ posts コレクション（全件取得）
│  ├─ ai_post_feedback コレクション（500件）
│  ├─ postPerformanceSnapshots サブコレクション
│  └─ ab_tests コレクション（全件取得）
│
├─ 2. GET /api/analytics/account-score (当月)
│  └─ analytics コレクション（全件取得）
│
├─ 3. GET /api/analytics/account-score (前月)
│  └─ analytics コレクション（全件取得）
│
├─ 4. GET /api/analytics/daily-scores
│  ├─ analytics コレクション（全件取得）
│  └─ posts コレクション（全件取得）
│
├─ 5. GET /api/analytics/monthly-review
│  ├─ users コレクション
│  ├─ plans コレクション
│  ├─ posts コレクション
│  └─ analytics コレクション
│
├─ 6. GET /api/ai/monthly-analysis (ボタンクリック時)
│  ├─ ai_master_context_cache コレクション
│  ├─ ai_overview_history コレクション
│  ├─ ai_post_feedback コレクション（100件）
│  ├─ ai_action_logs コレクション（100件）
│  ├─ analytics コレクション（120件）
│  ├─ ab_tests コレクション
│  ├─ postPerformanceSnapshots サブコレクション（25件）
│  ├─ plans コレクション（12件）
│  ├─ userSchedules コレクション
│  ├─ posts コレクション（期間フィルタ）
│  ├─ ai_post_feedback コレクション（200件、期間フィルタ）
│  └─ ai_action_logs コレクション（200件、期間フィルタ）
│
└─ 7. GET /api/ai/action-logs
   └─ ai_action_logs コレクション
```

## 問題点

### 1. 重複するコレクションアクセス
- **`analytics` コレクション**: 5回アクセス（全件取得が3回）
- **`posts` コレクション**: 4回アクセス（全件取得が2回）
- **`ai_post_feedback` コレクション**: 3回アクセス

### 2. 全件取得の非効率性
- `analytics` と `posts` を複数のAPIで全件取得
- クライアント側で期間フィルタリング（サーバーリソースの無駄）

### 3. 依存関係の複雑さ
```
初期ロード
  ↓
Promise.all([
  monthly-report-summary,  // 5コレクション
  account-score (当月),    // 1コレクション
  account-score (前月),    // 1コレクション
  daily-scores            // 2コレクション
])
  ↓
1秒後
  ↓
monthly-review           // 4コレクション
  ↓
ユーザー操作
  ↓
monthly-analysis         // 12コレクション
action-logs              // 1コレクション
```

### 4. 状態管理の複雑さ
- 7つのAPI = 7つの状態変数
- 各APIのローディング状態
- 各APIのエラー状態
- 依存関係による更新タイミングの制御

## 簡素化案

### 案1: 1つの統合API（推奨）
```
GET /api/analytics/monthly-report-complete
  ├─ 全データを1回で取得
  ├─ サーバー側で期間フィルタリング
  └─ 必要なデータのみを返却
```

**メリット**:
- API呼び出しが1回に
- 状態管理が簡素化
- 依存関係が明確
- パフォーマンス向上

**デメリット**:
- APIの責務が大きくなる
- キャッシュ戦略の再設計が必要

### 案2: 2つのAPIに統合
```
初期ロード用:
  GET /api/analytics/monthly-report-summary
    └─ 基本データ（サマリー、スコア、日別スコア）

AI分析用（オンデマンド）:
  GET /api/ai/monthly-analysis
    └─ AI分析データ
```

**メリット**:
- 初期ロードが高速化
- AI分析は必要時のみ実行

**デメリット**:
- まだ複数のコレクションにアクセス

### 案3: 段階的ロード
```
1. 基本データ（必須）
   GET /api/analytics/monthly-report-basic

2. 詳細データ（オプション）
   GET /api/analytics/monthly-report-details

3. AI分析（オンデマンド）
   GET /api/ai/monthly-analysis
```

**メリット**:
- 初期ロードが高速化
- 必要なデータのみ取得

**デメリット**:
- まだ複数のAPI呼び出し

## 推奨アプローチ

**案1（1つの統合API）**を推奨します。

理由:
1. 最もシンプル
2. パフォーマンスが向上
3. 状態管理が簡素化
4. エラーハンドリングが容易

実装イメージ:
```typescript
// 統合API
GET /api/analytics/monthly-report-complete?period=monthly&date=2025-11

// レスポンス
{
  summary: { ... },           // サマリーデータ
  accountScore: { ... },     // アカウントスコア
  previousAccountScore: { ... }, // 前月スコア
  dailyScores: [ ... ],      // 日別スコア
  monthlyReview: { ... },    // 月次レビュー
  // AI分析は別API（オンデマンド）
}
```

