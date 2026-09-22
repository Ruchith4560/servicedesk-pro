interface CacheEntry<T> {
  value: T;
  expiresAt: number | null; // null means no expiration
}

export class CacheService {
  private static store: Map<string, CacheEntry<any>> = new Map();
  private static hits: number = 0;
  private static misses: number = 0;

  /**
   * Set a key-value pair in cache with optional TTL in milliseconds.
   */
  static set<T>(key: string, value: T, ttlMs: number = 60000): void {
    const expiresAt = ttlMs > 0 ? Date.now() + ttlMs : null;
    this.store.set(key, { value, expiresAt });
  }

  /**
   * Retrieve a value from cache if it exists and has not expired.
   */
  static get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return null;
    }

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses += 1;
      return null;
    }

    this.hits += 1;
    return entry.value as T;
  }

  /**
   * Retrieve cached value or execute fallback fetcher and cache result.
   */
  static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = 60000
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetcher();
    this.set(key, fresh, ttlMs);
    return fresh;
  }

  /**
   * Invalidate a single key from cache.
   */
  static delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix or regex pattern.
   */
  static deletePattern(pattern: string | RegExp): number {
    let deletedCount = 0;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        deletedCount += 1;
      }
    }
    return deletedCount;
  }

  /**
   * Flush the entire cache store.
   */
  static clear(): void {
    this.store.clear();
  }

  /**
   * Return telemetry metrics on cache utilization.
   */
  static getStats(): {
    size: number;
    hits: number;
    misses: number;
    totalRequests: number;
    hitRatePercent: number;
  } {
    const totalRequests = this.hits + this.misses;
    const hitRatePercent =
      totalRequests > 0 ? Math.round((this.hits / totalRequests) * 1000) / 10 : 0;

    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      totalRequests,
      hitRatePercent
    };
  }

  /**
   * Reset stats counters.
   */
  static resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }
}
