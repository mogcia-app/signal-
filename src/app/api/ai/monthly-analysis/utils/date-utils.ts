/**
 * ユーティリティ: 日付関連関数
 * 純粋関数のみ（副作用なし）
 */

/**
 * 日付から月キー（YYYY-MM形式）を取得
 */
export function monthKeyFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * 月キーからラベルを生成
 */
export function monthLabelFromKey(key: string): string {
  const [year, month] = key.split("-");
  if (!year || !month) {
    return key;
  }
  return `${year}年${Number(month)}月`;
}

/**
 * 未知の値を月キーに変換
 */
export function monthKeyFromUnknown(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const match = value.match(/^(\d{4})[-/](\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}`;
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return monthKeyFromDate(parsed);
    }
    return null;
  }

  if (value instanceof Date) {
    if (!Number.isNaN(value.getTime())) {
      return monthKeyFromDate(value);
    }
    return null;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    try {
      const converted = (value as { toDate: () => Date }).toDate();
      if (converted instanceof Date && !Number.isNaN(converted.getTime())) {
        return monthKeyFromDate(converted);
      }
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * ISO週の情報を取得
 */
export function getIsoWeekInfo(date: Date): { year: number; week: number } {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: target.getUTCFullYear(), week };
}

/**
 * 日付から週キー（YYYY-Www形式）を取得
 */
export function weekKeyFromDate(date: Date): string {
  const { year, week } = getIsoWeekInfo(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/**
 * 週キーからラベルを生成
 */
export function weekLabelFromKey(key: string): string {
  const match = key.match(/^(\d{4})-W(\d{2})$/);
  if (!match) {
    return key;
  }
  const year = Number(match[1]);
  const week = Number(match[2]);
  return `${year}年 第${week}週`;
}

/**
 * 未知の値を週キーに変換
 */
export function weekKeyFromUnknown(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return weekKeyFromDate(parsed);
    }
    return null;
  }

  if (value instanceof Date) {
    if (!Number.isNaN(value.getTime())) {
      return weekKeyFromDate(value);
    }
    return null;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    try {
      const converted = (value as { toDate: () => Date }).toDate();
      if (converted instanceof Date && !Number.isNaN(converted.getTime())) {
        return weekKeyFromDate(converted);
      }
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Firestoreの日付値をパース
 */
export function parseFirestoreDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    try {
      const converted = (value as { toDate: () => Date }).toDate();
      return converted instanceof Date ? converted : null;
    } catch {
      return null;
    }
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

/**
 * 期間の範囲を取得
 */
export function getPeriodRange(
  period: "weekly" | "monthly",
  date: string
): { start: Date; end: Date } | null {
  if (period === "monthly") {
    const match = date.match(/^(\d{4})-(\d{2})$/);
    if (match) {
      const year = Number.parseInt(match[1], 10);
      const month = Number.parseInt(match[2], 10) - 1;
      if (!Number.isNaN(year) && !Number.isNaN(month)) {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 1);
        return { start, end };
      }
    }
    const parsed = new Date(date);
    if (!Number.isNaN(parsed.getTime())) {
      const start = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
      const end = new Date(parsed.getFullYear(), parsed.getMonth() + 1, 1);
      return { start, end };
    }
    return null;
  }

  const match = date.match(/^(\d{4})-W(\d{2})$/);
  if (!match) {
    return null;
  }
  const year = Number.parseInt(match[1], 10);
  const week = Number.parseInt(match[2], 10);
  if (Number.isNaN(year) || Number.isNaN(week)) {
    return null;
  }

  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dayOfWeek = simple.getUTCDay() || 7;
  const isoWeekStart = new Date(simple);
  isoWeekStart.setUTCDate(simple.getUTCDate() + 1 - dayOfWeek);
  const start = new Date(
    isoWeekStart.getUTCFullYear(),
    isoWeekStart.getUTCMonth(),
    isoWeekStart.getUTCDate()
  );
  const end = new Date(start.getTime());
  end.setDate(start.getDate() + 7);
  return { start, end };
}

/**
 * 月を加算
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * 参照日付を解決
 */
export function resolveReferenceDate(period: "weekly" | "monthly", date: string): Date | null {
  if (!date) {
    return null;
  }

  if (period === "monthly") {
    const parsed = new Date(`${date}-01T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  // Weekly (YYYY-Wxx)
  const match = date.match(/^(\d{4})-W(\d{2})$/);
  if (!match) {
    return null;
  }
  const year = Number.parseInt(match[1], 10);
  const week = Number.parseInt(match[2], 10);
  if (Number.isNaN(year) || Number.isNaN(week)) {
    return null;
  }

  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const dayOfWeek = startOfYear.getUTCDay();
  const dayOffset = (week - 1) * 7;
  const isoWeekStartOffset = ((dayOfWeek <= 4 ? dayOfWeek : dayOfWeek - 7) - 1) * -1;
  const reference = new Date(startOfYear.getTime());
  reference.setUTCDate(reference.getUTCDate() + dayOffset + isoWeekStartOffset);
  return reference;
}

