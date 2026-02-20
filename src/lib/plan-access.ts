/**
 * プラン階層別アクセス制御ユーティリティ
 * 
 * ユーザーのプラン階層（ベーシック・スタンダード・プロ）に基づいて、各機能へのアクセス権限を管理します。
 */

import { UserProfile } from "@/types/user";

export type PlanTier = "basic" | "standard" | "pro";

/**
 * 各プラン階層で利用可能な機能の定義
 * 
 * 注意: 将来的に機能の細分化（例: 投稿分析の一部のみ開放など）が必要になった場合は、
 * より詳細な粒度でfeature名を分割してください。
 * 
 * 例: canAccessPosts → canAccessPostList, canAccessPostDetail
 * 例: canAccessAnalytics → canAccessPostAnalytics, canAccessKPIAnalytics
 */
export const PLAN_FEATURES = {
  basic: {
    canAccessLab: true, // 投稿ラボ
    canAccessPosts: false, // 投稿一覧（将来的には canAccessPostList, canAccessPostDetail に分割可能）
    canAccessAnalytics: false, // 投稿分析（将来的には canAccessPostAnalytics, canAccessKPIAnalytics に分割可能）
    canAccessPlan: false, // 運用計画
    canAccessReport: false, // レポート
    canAccessKPI: false, // KPIダッシュボード（将来的には canAccessKPI として独立）
    canAccessLearning: false, // 学習ページ
    canAccessHome: false, // ホームページ（プロプランのみアクセス可能）
  },
  standard: {
    canAccessLab: true, // 投稿ラボ
    canAccessPosts: true, // 投稿一覧
    canAccessAnalytics: false, // 投稿分析
    canAccessPlan: false, // 運用計画
    canAccessReport: false, // レポート
    canAccessKPI: false, // KPIダッシュボード
    canAccessLearning: false, // 学習ページ
    canAccessHome: false, // ホームページ（プロプランのみアクセス可能）
  },
  pro: {
    canAccessLab: true, // 投稿ラボ
    canAccessPosts: true, // 投稿一覧
    canAccessAnalytics: true, // 投稿分析
    canAccessPlan: true, // 運用計画
    canAccessReport: true, // レポート
    canAccessKPI: true, // KPIダッシュボード
    canAccessLearning: true, // 学習ページ
    canAccessHome: true, // ホームページ（プロプランのみアクセス可能）
  },
} as const;

export type PlanFeature = keyof typeof PLAN_FEATURES.basic;

/**
 * プランアクセス情報の型
 */
export type PlanAccess = typeof PLAN_FEATURES[PlanTier];

/**
 * ユーザーのプラン階層を取得（デフォルトは"basic"）
 * 
 * @param userProfile - ユーザープロフィール
 * @returns プラン階層
 */
export function getUserPlanTier(userProfile: UserProfile | null | undefined): PlanTier {
  const rawTier = String(userProfile?.planTier || "").trim().toLowerCase();
  if (rawTier === "basic" || rawTier === "standard" || rawTier === "pro") {
    return rawTier as PlanTier;
  }
  // 旧値との互換性を維持
  if (rawTier === "ume") {return "basic";}
  if (rawTier === "take") {return "standard";}
  if (rawTier === "matsu") {return "pro";}
  return "basic";
}

/**
 * 特定機能へのアクセス権限をチェック
 * 
 * @param userProfile - ユーザープロフィール
 * @param feature - チェックする機能名
 * @returns アクセス可能な場合true
 */
export function canAccessFeature(
  userProfile: UserProfile | null | undefined,
  feature: PlanFeature
): boolean {
  const tier = getUserPlanTier(userProfile);
  return PLAN_FEATURES[tier][feature];
}

/**
 * プラン階層に基づいてアクセス拒否メッセージを取得
 * 
 * @param feature - 機能名
 * @returns アクセス拒否メッセージ
 */
export function getAccessDeniedMessage(feature: string): string {
  return `${feature}機能は、現在のプランではご利用いただけません。プランのアップグレードをご検討ください。`;
}

/**
 * プラン階層の表示名を取得
 * 
 * @param tier - プラン階層
 * @returns 表示名
 */
export function getPlanTierDisplayName(tier: PlanTier): string {
  const names = {
    basic: "ベーシックプラン",
    standard: "スタンダードプラン",
    pro: "プロプラン",
  };
  return names[tier];
}

/**
 * プラン階層の月額料金を取得
 * 
 * @param tier - プラン階層
 * @returns 月額料金（税込）
 */
export function getPlanTierPrice(tier: PlanTier): number {
  const prices = {
    basic: 15000,
    standard: 30000,
    pro: 60000,
  };
  return prices[tier];
}

/**
 * ユーザーのプランアクセス情報をまとめて取得
 * 
 * 複数の機能チェックが必要な場合や、条件分岐が多い場合に便利です。
 * 
 * @param userProfile - ユーザープロフィール
 * @returns プランアクセス情報オブジェクト
 * 
 * @example
 * ```typescript
 * const access = getPlanAccess(userProfile);
 * if (access.canAccessPosts) {
 *   // 投稿一覧へのアクセス処理
 * }
 * if (access.canAccessAnalytics && access.canAccessKPI) {
 *   // 分析関連の処理
 * }
 * ```
 */
export function getPlanAccess(
  userProfile: UserProfile | null | undefined
): PlanAccess {
  const tier = getUserPlanTier(userProfile);
  return PLAN_FEATURES[tier];
}
