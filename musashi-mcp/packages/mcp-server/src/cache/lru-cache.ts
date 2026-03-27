import { LRUCache } from 'lru-cache';
import { CacheError } from '../types/errors.js';

/**
 * Cache entry with TTL metadata
 */
interface CacheEntry<T> {
  value: T;
  cachedAt: number;
  ttl: number;
}

/**
 * Cache configuration options
 */
export interface CacheConfig {
  maxSize: number;
  defaultTTL: number; // milliseconds
}

/**
 * LRU Cache wrapper with TTL support
 */
export class MusashiCache<K extends {}, V> {
  private cache: LRUCache<K, CacheEntry<V>>;
  private defaultTTL: number;

  constructor(config: CacheConfig) {
    this.cache = new LRUCache<K, CacheEntry<V>>({
      max: config.maxSize,
      // Custom disposal for cleanup
      dispose: (entry) => {
        // Allow for any cleanup if needed
        void entry;
      },
    });
    this.defaultTTL = config.defaultTTL;
  }

  /**
   * Get value from cache
   * Returns undefined if not found or expired
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    const now = Date.now();
    const age = now - entry.cachedAt;

    if (age > entry.ttl) {
      // Expired, delete and return undefined
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Set value in cache with optional custom TTL
   */
  set(key: K, value: V, ttl?: number): void {
    const entry: CacheEntry<V> = {
      value,
      cachedAt: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete key from cache
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      utilizationPercent: (this.cache.size / (this.cache.max || 1)) * 100,
    };
  }

  /**
   * Get or compute value (cache miss = compute and store)
   */
  async getOrCompute(
    key: K,
    compute: () => Promise<V>,
    ttl?: number
  ): Promise<V> {
    // Try cache first
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    // Cache miss - compute value
    try {
      const value = await compute();
      this.set(key, value, ttl);
      return value;
    } catch (error) {
      throw new CacheError(
        `Failed to compute value for cache key: ${String(key)}`,
        'getOrCompute'
      );
    }
  }

  /**
   * Invalidate entries matching predicate
   */
  invalidateWhere(predicate: (key: K, value: V) => boolean): number {
    let invalidated = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (predicate(key, entry.value)) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }
}

/**
 * Multi-tier cache strategy for different data types
 */
export class CacheManager {
  // Markets cache - 5 minutes TTL, high capacity
  public markets: MusashiCache<string, any>;

  // Signals cache - 1 minute TTL, medium capacity
  public signals: MusashiCache<string, any>;

  // API responses cache - 30 seconds TTL, large capacity
  public apiResponses: MusashiCache<string, any>;

  // Arbitrage cache - 10 seconds TTL (very fresh data needed)
  public arbitrage: MusashiCache<string, any>;

  constructor() {
    this.markets = new MusashiCache({
      maxSize: 5000,
      defaultTTL: 5 * 60 * 1000, // 5 minutes
    });

    this.signals = new MusashiCache({
      maxSize: 1000,
      defaultTTL: 1 * 60 * 1000, // 1 minute
    });

    this.apiResponses = new MusashiCache({
      maxSize: 10000,
      defaultTTL: 30 * 1000, // 30 seconds
    });

    this.arbitrage = new MusashiCache({
      maxSize: 500,
      defaultTTL: 10 * 1000, // 10 seconds
    });
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.markets.clear();
    this.signals.clear();
    this.apiResponses.clear();
    this.arbitrage.clear();
  }

  /**
   * Get global cache statistics
   */
  getGlobalStats() {
    return {
      markets: this.markets.getStats(),
      signals: this.signals.getStats(),
      apiResponses: this.apiResponses.getStats(),
      arbitrage: this.arbitrage.getStats(),
    };
  }
}
