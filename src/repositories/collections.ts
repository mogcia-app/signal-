/**
 * Firestoreコレクション名の定数定義
 * ハードコードされた文字列リテラルを一箇所に集約する
 */
export const COLLECTIONS = {
  ANALYTICS: "analytics",
  POSTS: "posts",
  PLANS: "plans",
  USERS: "users",
  FOLLOWER_COUNTS: "follower_counts",
  SNAPSHOT_REFERENCES: "snapshot_references",
  POST_PERFORMANCE_SNAPSHOTS: "postPerformanceSnapshots",
  AI_POST_FEEDBACK: "ai_post_feedback",
  AI_POST_SUMMARIES: "ai_post_summaries",
  AI_MASTER_CONTEXT_CACHE: "ai_master_context_cache",
  AI_ACTION_LOGS: "ai_action_logs",
  AI_DIRECTION: "ai_direction",
  AB_TESTS: "ab_tests",
  MONTHLY_REVIEWS: "monthly_reviews",
  DIRECTION_ALIGNMENT_LOGS: "direction_alignment_logs",
  HOME_TODAY_TASKS_CACHE: "home_today_tasks_cache",
  MONTHLY_KPI_SUMMARIES: "monthly_kpi_summaries",
  TOOL_MAINTENANCE: "toolMaintenance",
  SERVICE_RATE_LIMITS: "serviceRateLimits",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
