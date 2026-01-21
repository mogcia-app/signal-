/**
 * ユーティリティ: データ変換関数
 * 純粋関数のみ（副作用なし）
 */

/**
 * コンテンツ統計から投稿数を推定
 */
export function derivePostCountFromContentStats(
  stats?: Record<string, unknown> | null
): number {
  if (!stats) {
    return 0;
  }
  const numericKeys = [
    "totalLikes",
    "totalComments",
    "totalShares",
    "totalReach",
    "totalSaves",
    "totalFollowerIncrease",
    "totalInteractionCount",
    "totalReachedAccounts",
    "totalPlayTimeSeconds",
  ];
  const record = stats as Record<string, unknown>;
  const hasSignal = numericKeys.some((key) => {
    const value = record[key];
    return typeof value === "number" && Number.isFinite(value) && value > 0;
  });
  if (!hasSignal) {
    return 0;
  }
  const explicit = record["totalPosts"];
  if (typeof explicit === "number" && Number.isFinite(explicit) && explicit > 0) {
    return Math.round(explicit);
  }
  return 1;
}

