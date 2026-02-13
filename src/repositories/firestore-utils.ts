import * as admin from "firebase-admin";

/**
 * Firestore Timestamp → Date 変換
 * Timestamp型、Date型、toDate()メソッドを持つオブジェクト、文字列をすべてDateに変換する
 */
export function toDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }
  if (value instanceof admin.firestore.Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  if (
    typeof value === "object" &&
    value &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Date → Firestore Timestamp 変換
 */
export function toTimestamp(date: Date): admin.firestore.Timestamp {
  return admin.firestore.Timestamp.fromDate(date);
}

/**
 * YYYY-MM 形式の月文字列から、その月の開始日と終了日の Timestamp を返す
 */
export function toTimestampRange(month: string): {
  startTimestamp: admin.firestore.Timestamp;
  endTimestamp: admin.firestore.Timestamp;
  startDate: Date;
  endDate: Date;
} {
  const [year, m] = month.split("-").map(Number);
  const startDate = new Date(year, m - 1, 1);
  const endDate = new Date(year, m, 0, 23, 59, 59, 999);
  return {
    startTimestamp: admin.firestore.Timestamp.fromDate(startDate),
    endTimestamp: admin.firestore.Timestamp.fromDate(endDate),
    startDate,
    endDate,
  };
}

/**
 * YYYY-MM 形式の月文字列から前月の YYYY-MM 文字列を返す
 */
export function toPreviousMonth(date: string): string {
  const [year, month] = date.split("-").map(Number);
  if (!year || !month) {
    return date;
  }
  const prev = new Date(year, month - 2, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}
