/**
 * ユーティリティ: バリデーション関数
 * 純粋関数のみ（副作用なし）
 */

/**
 * 値を配列に変換
 */
export function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (typeof value === "string") {
    return value
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean) as unknown as T[];
  }
  return [];
}

/**
 * 値を数値に変換
 */
export function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/**
 * 値を指定範囲にクランプ
 */
export function clamp(value: number, min = 0, max = 1): number {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

/**
 * 計画期間を月数に変換
 */
export function parsePlanPeriodToMonths(planPeriod: string | undefined): number {
  if (!planPeriod || typeof planPeriod !== "string") {
    return 1;
  }

  const normalized = planPeriod.trim().toLowerCase();
  if (normalized.includes("年")) {
    const match = normalized.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      const years = Number.parseFloat(match[1]);
      if (!Number.isNaN(years) && years > 0) {
        return Math.round(years * 12);
      }
    }
    return 12;
  }

  if (normalized.includes("週") || normalized.includes("week")) {
    const match = normalized.match(/(\d+)/);
    if (match) {
      const weeks = Number.parseInt(match[1], 10);
      if (!Number.isNaN(weeks) && weeks > 0) {
        return Math.max(1, Math.round(weeks / 4));
      }
    }
    return 1;
  }

  const numericMatch = normalized.match(/(\d+(?:\.\d+)?)/);
  if (numericMatch) {
    const months = Number.parseFloat(numericMatch[1]);
    if (!Number.isNaN(months) && months > 0) {
      return Math.round(months);
    }
  }

  switch (normalized) {
    case "半期":
    case "半年":
      return 6;
    default:
      return 1;
  }
}

