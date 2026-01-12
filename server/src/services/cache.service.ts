/**
 * Intelligent Caching Service
 * Multi-tier caching with automatic invalidation and cache-aside pattern
 */

import { createClient, RedisClientType } from "redis";
import config from "../config";
import logger from "../utils/logger";

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Tags for group invalidation
  staleWhileRevalidate?: number; // Serve stale while fetching fresh
}

interface CacheEntry<T> {
  data: T;
  createdAt: number;
  ttl: number;
  tags: string[];
  stale?: boolean;
}

// Cache statistics
interface CacheStats {
  hits: number;
  misses: number;
  staleHits: number;
  size: number;
  hitRate: number;
}

class CacheService {
  private client: RedisClientType | null = null;
  private localCache: Map<string, CacheEntry<any>> = new Map();
  private stats = { hits: 0, misses: 0, staleHits: 0 };

  // Default TTLs by category (in seconds)
  private readonly DEFAULT_TTLS = {
    user: 300, // 5 minutes
    task: 60, // 1 minute
    taskList: 30, // 30 seconds
    comment: 60, // 1 minute
    statistics: 120, // 2 minutes
    presence: 10, // 10 seconds
  };

  // Key prefixes
  private readonly PREFIX = "cache:";
  private readonly TAG_PREFIX = "cache:tag:";

  async initialize(): Promise<void> {
    try {
      this.client = createClient({
        socket: {
          host: config.redis?.host || "localhost",
          port: config.redis?.port || 6379,
        },
        password: config.redis?.password || undefined,
      });

      this.client.on("error", (err) => {
        logger.error("Redis cache error", err);
      });

      await this.client.connect();
      logger.info("Cache service initialized");
    } catch (error) {
      logger.warn("Redis cache unavailable, using local cache only", error);
    }
  }

  /**
   * Get item from cache with fallback to fetcher
   * Implements cache-aside pattern with stale-while-revalidate
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const fullKey = this.PREFIX + key;
    const ttl = options.ttl || 60;

    // Try local cache first (L1)
    const localEntry = this.localCache.get(fullKey);
    if (localEntry && !this.isExpired(localEntry)) {
      this.stats.hits++;
      return localEntry.data;
    }

    // Try Redis cache (L2)
    if (this.client) {
      try {
        const cached = await this.client.get(fullKey);
        if (cached) {
          const entry: CacheEntry<T> = JSON.parse(cached);

          // Check if stale but within revalidate window
          if (this.isExpired(entry) && options.staleWhileRevalidate) {
            const staleAge = (Date.now() - entry.createdAt) / 1000;
            if (staleAge < entry.ttl + options.staleWhileRevalidate) {
              this.stats.staleHits++;
              // Revalidate in background
              this.revalidateInBackground(key, fetcher, options);
              return entry.data;
            }
          }

          if (!this.isExpired(entry)) {
            this.stats.hits++;
            // Populate L1 cache
            this.localCache.set(fullKey, entry);
            return entry.data;
          }
        }
      } catch (error) {
        logger.warn("Redis cache read failed", { key, error });
      }
    }

    // Cache miss - fetch fresh data
    this.stats.misses++;
    const data = await fetcher();
    await this.set(key, data, options);
    return data;
  }

  /**
   * Set item in cache
   */
  async set<T>(
    key: string,
    data: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const fullKey = this.PREFIX + key;
    const ttl = options.ttl || 60;
    const tags = options.tags || [];

    const entry: CacheEntry<T> = {
      data,
      createdAt: Date.now(),
      ttl,
      tags,
    };

    // Set in local cache (L1)
    this.localCache.set(fullKey, entry);

    // Set in Redis (L2)
    if (this.client) {
      try {
        await this.client.setEx(fullKey, ttl, JSON.stringify(entry));

        // Register tags for group invalidation
        for (const tag of tags) {
          await this.client.sAdd(this.TAG_PREFIX + tag, fullKey);
          await this.client.expire(this.TAG_PREFIX + tag, ttl * 2);
        }
      } catch (error) {
        logger.warn("Redis cache write failed", { key, error });
      }
    }
  }

  /**
   * Delete specific key
   */
  async delete(key: string): Promise<void> {
    const fullKey = this.PREFIX + key;

    this.localCache.delete(fullKey);

    if (this.client) {
      try {
        await this.client.del(fullKey);
      } catch (error) {
        logger.warn("Redis cache delete failed", { key, error });
      }
    }
  }

  /**
   * Invalidate all keys with specific tag
   * Useful for invalidating related data (e.g., all task caches when task is updated)
   */
  async invalidateByTag(tag: string): Promise<number> {
    let invalidated = 0;
    const tagKey = this.TAG_PREFIX + tag;

    // Invalidate local cache
    for (const [key, entry] of this.localCache.entries()) {
      if (entry.tags.includes(tag)) {
        this.localCache.delete(key);
        invalidated++;
      }
    }

    // Invalidate Redis cache
    if (this.client) {
      try {
        const keys = await this.client.sMembers(tagKey);
        if (keys.length > 0) {
          await this.client.del(keys);
          await this.client.del(tagKey);
          invalidated += keys.length;
        }
      } catch (error) {
        logger.warn("Redis tag invalidation failed", { tag, error });
      }
    }

    logger.debug(`Invalidated ${invalidated} cache entries for tag: ${tag}`);
    return invalidated;
  }

  /**
   * Invalidate by pattern (e.g., "task:*" or "user:123:*")
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    let invalidated = 0;
    const fullPattern = this.PREFIX + pattern;

    // Invalidate local cache
    for (const key of this.localCache.keys()) {
      if (this.matchPattern(key, fullPattern)) {
        this.localCache.delete(key);
        invalidated++;
      }
    }

    // Invalidate Redis cache
    if (this.client) {
      try {
        const keys = await this.client.keys(fullPattern);
        if (keys.length > 0) {
          await this.client.del(keys);
          invalidated += keys.length;
        }
      } catch (error) {
        logger.warn("Redis pattern invalidation failed", { pattern, error });
      }
    }

    return invalidated;
  }

  /**
   * Pre-built cache methods for common entities
   */

  // Tasks
  async getTask(taskId: string, fetcher: () => Promise<any>): Promise<any> {
    return this.getOrSet(`task:${taskId}`, fetcher, {
      ttl: this.DEFAULT_TTLS.task,
      tags: ["tasks", `task:${taskId}`],
      staleWhileRevalidate: 30,
    });
  }

  async getTaskList(
    filters: string,
    fetcher: () => Promise<any>
  ): Promise<any> {
    const key = `tasks:list:${this.hashFilters(filters)}`;
    return this.getOrSet(key, fetcher, {
      ttl: this.DEFAULT_TTLS.taskList,
      tags: ["tasks", "task-lists"],
    });
  }

  async invalidateTask(taskId: string): Promise<void> {
    await Promise.all([
      this.delete(`task:${taskId}`),
      this.invalidateByTag("task-lists"),
    ]);
  }

  // Users/Team Members
  async getUser(userId: string, fetcher: () => Promise<any>): Promise<any> {
    return this.getOrSet(`user:${userId}`, fetcher, {
      ttl: this.DEFAULT_TTLS.user,
      tags: ["users", `user:${userId}`],
    });
  }

  async invalidateUser(userId: string): Promise<void> {
    await this.invalidateByTag(`user:${userId}`);
  }

  // Statistics (longer cache)
  async getStatistics(type: string, fetcher: () => Promise<any>): Promise<any> {
    return this.getOrSet(`stats:${type}`, fetcher, {
      ttl: this.DEFAULT_TTLS.statistics,
      tags: ["statistics"],
      staleWhileRevalidate: 60,
    });
  }

  async invalidateStatistics(): Promise<void> {
    await this.invalidateByTag("statistics");
  }

  /**
   * Cache warming - preload frequently accessed data
   */
  async warmCache(
    fetchers: Array<{
      key: string;
      fetcher: () => Promise<any>;
      options?: CacheOptions;
    }>
  ): Promise<void> {
    logger.info(`Warming cache with ${fetchers.length} entries`);

    await Promise.allSettled(
      fetchers.map(({ key, fetcher, options }) =>
        this.getOrSet(key, fetcher, options)
      )
    );
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.localCache.size,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
    };
  }

  /**
   * Clear all caches
   */
  async flush(): Promise<void> {
    this.localCache.clear();
    if (this.client) {
      const keys = await this.client.keys(this.PREFIX + "*");
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    }
    this.stats = { hits: 0, misses: 0, staleHits: 0 };
    logger.info("Cache flushed");
  }

  // Private helpers

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.createdAt > entry.ttl * 1000;
  }

  private async revalidateInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions
  ): Promise<void> {
    try {
      const data = await fetcher();
      await this.set(key, data, options);
    } catch (error) {
      logger.warn("Background revalidation failed", { key, error });
    }
  }

  private hashFilters(filters: string): string {
    // Simple hash for filter string
    let hash = 0;
    for (let i = 0; i < filters.length; i++) {
      const char = filters.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private matchPattern(key: string, pattern: string): boolean {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    return regex.test(key);
  }

  async shutdown(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
    this.localCache.clear();
  }
}

export const cacheService = new CacheService();
export default cacheService;
