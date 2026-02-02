/**
 * クライアントサイドのキャッシュユーティリティ
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class ClientCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  /**
   * キャッシュにデータを保存
   * @param key キャッシュキー
   * @param data 保存するデータ
   * @param ttl 有効期限（ミリ秒）
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });
  }

  /**
   * キャッシュからデータを取得
   * @param key キャッシュキー
   * @returns キャッシュされたデータ、またはnull（期限切れまたは存在しない場合）
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      // 期限切れの場合は削除
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * キャッシュをクリア
   * @param key キャッシュキー（指定しない場合はすべてクリア）
   */
  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * 期限切れのエントリを削除
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// シングルトンインスタンス
export const clientCache = new ClientCache();

// 定期的にクリーンアップ（5分ごと）
if (typeof window !== "undefined") {
  setInterval(() => {
    clientCache.cleanup();
  }, 5 * 60 * 1000);
}

/**
 * キャッシュキーを生成
 */
export function generateCacheKey(prefix: string, params: Record<string, unknown>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${String(params[key])}`)
    .join("&");
  return `${prefix}:${sortedParams}`;
}

