/**
 * 型ガード関数ユーティリティ
 * Record<string, unknown>をより型安全に扱うためのヘルパー関数
 */

/**
 * 値がオブジェクトかどうかを判定
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 値が文字列かどうかを判定
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * 値が数値かどうかを判定
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

/**
 * 値が真偽値かどうかを判定
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/**
 * 値が配列かどうかを判定
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * オブジェクトに指定されたキーが存在するかどうかを判定
 */
export function hasKey<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

/**
 * オブジェクトに指定されたキーが存在し、かつ指定された型かどうかを判定
 */
export function hasKeyOfType<K extends string, T>(
  obj: unknown,
  key: K,
  typeGuard: (value: unknown) => value is T
): obj is Record<K, T> {
  return hasKey(obj, key) && typeGuard(obj[key]);
}

/**
 * オブジェクトが指定されたキーをすべて持っているかどうかを判定
 */
export function hasKeys<K extends string>(
  obj: unknown,
  keys: readonly K[]
): obj is Record<K, unknown> {
  if (!isObject(obj)) {
    return false;
  }
  return keys.every((key) => key in obj);
}

/**
 * オブジェクトが指定されたキーをすべて持っており、それぞれが指定された型かどうかを判定
 */
export function hasKeysOfType<
  K extends string,
  T extends Record<K, (value: unknown) => value is unknown>
>(
  obj: unknown,
  typeGuards: T
): obj is {
  [P in keyof T]: T[P] extends (value: unknown) => value is infer U ? U : never;
} {
  if (!isObject(obj)) {
    return false;
  }
  return Object.entries(typeGuards).every(([key, guard]) => {
    const typedGuard = guard as (value: unknown) => value is unknown;
    return key in obj && typedGuard(obj[key]);
  });
}

/**
 * オブジェクトから指定されたキーの値を安全に取得
 */
export function getValue<T>(
  obj: Record<string, unknown>,
  key: string,
  defaultValue: T
): T {
  const value = obj[key];
  return value !== undefined ? (value as T) : defaultValue;
}

/**
 * オブジェクトから指定されたキーの値を型ガードで検証して取得
 */
export function getValueWithGuard<T>(
  obj: Record<string, unknown>,
  key: string,
  typeGuard: (value: unknown) => value is T,
  defaultValue: T
): T {
  const value = obj[key];
  return value !== undefined && typeGuard(value) ? value : defaultValue;
}

