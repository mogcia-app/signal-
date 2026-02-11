/**
 * タイムゾーン関連のユーティリティ関数
 */

/**
 * タイムゾーンを考慮したローカル日付を取得（YYYY-MM-DD形式）
 * 
 * @param timezone - タイムゾーン（例: "Asia/Tokyo"）
 * @returns ローカル日付（YYYY-MM-DD形式）
 */
export function getLocalDate(timezone: string = "Asia/Tokyo"): string {
  const now = new Date();
  
  // タイムゾーンを考慮した日付を取得
  // Intl.DateTimeFormatを使用してタイムゾーンを考慮
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  // YYYY-MM-DD形式で返す
  return formatter.format(now);
}

/**
 * タイムゾーンを考慮した現在の日時を取得
 * 
 * @param timezone - タイムゾーン（例: "Asia/Tokyo"）
 * @returns Dateオブジェクト
 */
export function getLocalDateTime(timezone: string = "Asia/Tokyo"): Date {
  const now = new Date();
  
  // タイムゾーンを考慮した日時文字列を取得
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  
  // 日時文字列からDateオブジェクトを作成
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === "year")?.value || "0");
  const month = parseInt(parts.find(p => p.type === "month")?.value || "0") - 1; // 0-indexed
  const day = parseInt(parts.find(p => p.type === "day")?.value || "0");
  const hour = parseInt(parts.find(p => p.type === "hour")?.value || "0");
  const minute = parseInt(parts.find(p => p.type === "minute")?.value || "0");
  const second = parseInt(parts.find(p => p.type === "second")?.value || "0");
  
  return new Date(year, month, day, hour, minute, second);
}

/**
 * 特定のDateオブジェクトに対してタイムゾーンを考慮したローカル日付を取得（YYYY-MM-DD形式）
 * 
 * @param date - Dateオブジェクト
 * @param timezone - タイムゾーン（例: "Asia/Tokyo"）
 * @returns ローカル日付（YYYY-MM-DD形式）
 */
export function getLocalDateForDate(date: Date, timezone: string = "Asia/Tokyo"): string {
  // タイムゾーンを考慮した日付を取得
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  // YYYY-MM-DD形式で返す
  return formatter.format(date);
}

