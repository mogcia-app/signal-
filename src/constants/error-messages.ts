/**
 * エラーメッセージの定数定義
 */

export const ERROR_MESSAGES = {
  // ダッシュボード関連
  DASHBOARD_FETCH_FAILED: "ダッシュボードデータの取得に失敗しました",
  AI_SECTIONS_FETCH_FAILED: "AI生成セクションの取得に失敗しました",
  
  // KPI関連
  KPI_FETCH_FAILED: "KPIデータの取得に失敗しました",
  KPI_SAVE_FAILED: "KPIデータの保存に失敗しました",
  
  // 投稿関連
  POST_FETCH_FAILED: "投稿データの取得に失敗しました",
  POST_SAVE_FAILED: "投稿の保存に失敗しました",
  POST_DELETE_FAILED: "投稿の削除に失敗しました",
  POST_COPY_FAILED: "コピーに失敗しました",
  
  // 計画関連
  PLAN_FETCH_FAILED: "計画データの取得に失敗しました",
  PLAN_LOAD_FAILED: "計画の読み込みに失敗しました",
  PLAN_SAVE_FAILED: "計画の保存に失敗しました",
  PLAN_DELETE_FAILED: "計画の削除に失敗しました",
  PLAN_DATA_INCOMPLETE: "計画データが不完全です。新しい計画を作成してください。",
  PLAN_DATE_CALCULATION_FAILED: "計画の期間計算に失敗しました。",
  
  // レポート関連
  REPORT_FETCH_FAILED: "レポートデータの取得に失敗しました",
  
  // スケジュール関連
  SCHEDULE_GENERATE_FAILED: "スケジュール生成に失敗しました",
  SCHEDULE_SAVE_FAILED: "スケジュールの保存に失敗しました",
  
  // 認証関連
  AUTH_REQUIRED: "ログインが必要です",
  
  // ビジネス情報関連
  BUSINESS_INFO_FETCH_FAILED: "ビジネス情報の取得に失敗しました",
  
  // 学習ダッシュボード関連
  LEARNING_DASHBOARD_FETCH_FAILED: "学習ダッシュボードデータの取得に失敗しました",
  
  // 汎用
  UNKNOWN_ERROR: "予期しないエラーが発生しました",
  NETWORK_ERROR: "ネットワークエラーが発生しました。しばらくしてから再度お試しください。",
} as const;

