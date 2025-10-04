// シンプルなメモリキャッシュ（本番環境ではRedis推奨）
class MemoryCache {
  private cache = new Map<string, { data: unknown; expires: number }>();
  private defaultTTL = 5 * 60 * 1000; // 5分

  set(key: string, data: unknown, ttl: number = this.defaultTTL): void {
    const expires = Date.now() + ttl;
    this.cache.set(key, { data, expires });
  }

  get(key: string): unknown | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // 期限切れのキャッシュをクリーンアップ
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }

  // キャッシュ統計
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// シングルトンインスタンス
export const cache = new MemoryCache();

// キャッシュキー生成ヘルパー
export function generateCacheKey(prefix: string, params: Record<string, unknown>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  
  return `${prefix}:${sortedParams}`;
}

// キャッシュデコレーター（関数用）
export function withCache<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  keyGenerator: (...args: T) => string,
  ttl: number = 5 * 60 * 1000
) {
  return async (...args: T): Promise<R> => {
    const key = keyGenerator(...args);
    const cached = cache.get(key);
    
    if (cached) {
      return cached as R;
    }

    const result = await fn(...args);
    cache.set(key, result, ttl);
    
    return result;
  };
}

// 定期的なクリーンアップ（5分ごと）
if (typeof window === 'undefined') { // サーバーサイドのみ
  setInterval(() => {
    cache.cleanup();
  }, 5 * 60 * 1000);
}
