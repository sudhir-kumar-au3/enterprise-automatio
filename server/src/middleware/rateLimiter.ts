/**
 * Advanced Rate Limiting Middleware
 *
 * Features:
 * - Per-user rate limiting (not just IP)
 * - Redis-backed for distributed systems
 * - Tiered limits based on user roles
 * - Separate limits for different endpoints
 * - Sliding window algorithm for fairness
 * - Retry-After headers for client guidance
 */

import { Request, Response, NextFunction } from "express";
import { createClient, RedisClientType } from "redis";
import config from "../config";
import logger from "../utils/logger";

// Rate limit tiers based on user access level
interface RateLimitTier {
  windowMs: number;
  maxRequests: number;
  burstLimit: number; // Max requests in 1 second burst
}

const RATE_LIMIT_TIERS: Record<string, RateLimitTier> = {
  // Unauthenticated users (by IP)
  anonymous: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    burstLimit: 10,
  },
  // Authenticated viewers
  viewer: {
    windowMs: 60 * 1000,
    maxRequests: 60,
    burstLimit: 15,
  },
  // Regular members
  member: {
    windowMs: 60 * 1000,
    maxRequests: 100,
    burstLimit: 20,
  },
  // Admins
  admin: {
    windowMs: 60 * 1000,
    maxRequests: 200,
    burstLimit: 50,
  },
  // Owners (highest tier)
  owner: {
    windowMs: 60 * 1000,
    maxRequests: 500,
    burstLimit: 100,
  },
};

// Endpoint-specific limits (stricter for sensitive operations)
const ENDPOINT_LIMITS: Record<
  string,
  { windowMs: number; maxRequests: number }
> = {
  // Auth endpoints - very strict to prevent brute force
  "POST:/api/v1/auth/login": { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  "POST:/api/v1/auth/register": { windowMs: 60 * 60 * 1000, maxRequests: 3 },
  "POST:/api/v1/auth/forgot-password": {
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
  },

  // Data export - resource intensive
  "GET:/api/v1/data/export": { windowMs: 60 * 60 * 1000, maxRequests: 10 },
  "POST:/api/v1/data/backup": { windowMs: 60 * 60 * 1000, maxRequests: 5 },

  // Bulk operations
  "POST:/api/v1/tasks/bulk": { windowMs: 60 * 1000, maxRequests: 5 },
  "DELETE:/api/v1/tasks/bulk": { windowMs: 60 * 1000, maxRequests: 3 },
};

// Redis key prefixes
const REDIS_PREFIX = {
  rateLimit: "rl:",
  burst: "rl:burst:",
  blocked: "rl:blocked:",
};

class RateLimiter {
  private redis: RedisClientType | null = null;
  private localStore: Map<string, { count: number; resetTime: number }> =
    new Map();
  private isRedisConnected = false;

  async initialize(): Promise<void> {
    try {
      this.redis = createClient({
        socket: {
          host: config.redis?.host || "localhost",
          port: config.redis?.port || 6379,
        },
        password: config.redis?.password || undefined,
      });

      this.redis.on("error", (err: Error) => {
        logger.error("Rate limiter Redis error", err);
        this.isRedisConnected = false;
      });

      this.redis.on("connect", () => {
        this.isRedisConnected = true;
        logger.info("Rate limiter Redis connected");
      });

      await this.redis.connect();
    } catch (error) {
      logger.warn("Rate limiter Redis unavailable, using local store", error);
      this.isRedisConnected = false;
    }
  }

  /**
   * Get identifier for rate limiting
   * Prefers user ID, falls back to IP
   */
  private getIdentifier(req: Request): { id: string; type: "user" | "ip" } {
    const user = (req as any).user;
    if (user?.id) {
      return { id: `user:${user.id}`, type: "user" };
    }

    // Get real IP (considering proxies)
    const ip =
      req.ip ||
      req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
      req.socket.remoteAddress ||
      "unknown";

    return { id: `ip:${ip}`, type: "ip" };
  }

  /**
   * Get rate limit tier for request
   */
  private getTier(req: Request): RateLimitTier {
    const user = (req as any).user;

    if (!user) {
      return RATE_LIMIT_TIERS.anonymous;
    }

    const accessLevel = user.accessLevel || "member";
    return RATE_LIMIT_TIERS[accessLevel] || RATE_LIMIT_TIERS.member;
  }

  /**
   * Check endpoint-specific limits
   */
  private getEndpointLimit(
    req: Request
  ): { windowMs: number; maxRequests: number } | null {
    const key = `${req.method}:${req.baseUrl}${req.path}`;

    // Check exact match
    if (ENDPOINT_LIMITS[key]) {
      return ENDPOINT_LIMITS[key];
    }

    // Check pattern match (for routes with params)
    for (const [pattern, limit] of Object.entries(ENDPOINT_LIMITS)) {
      const regex = new RegExp("^" + pattern.replace(/:[^/]+/g, "[^/]+") + "$");
      if (regex.test(key)) {
        return limit;
      }
    }

    return null;
  }

  /**
   * Increment and check rate limit using Redis (sliding window)
   */
  private async checkRedisLimit(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    if (!this.redis || !this.isRedisConnected) {
      return this.checkLocalLimit(key, limit, windowMs);
    }

    const now = Date.now();
    const windowStart = now - windowMs;
    const redisKey = REDIS_PREFIX.rateLimit + key;

    try {
      // Use sorted set for sliding window
      const multi = this.redis.multi();

      // Remove old entries outside window
      multi.zRemRangeByScore(redisKey, 0, windowStart);

      // Count requests in current window
      multi.zCard(redisKey);

      // Add current request
      multi.zAdd(redisKey, { score: now, value: `${now}-${Math.random()}` });

      // Set expiry
      multi.expire(redisKey, Math.ceil(windowMs / 1000) + 1);

      const results = await multi.exec();
      const currentCount = (results?.[1] as number) || 0;

      const allowed = currentCount < limit;
      const remaining = Math.max(0, limit - currentCount - 1);
      const resetTime = now + windowMs;

      return { allowed, remaining, resetTime };
    } catch (error) {
      logger.warn("Redis rate limit check failed, using local", { key, error });
      return this.checkLocalLimit(key, limit, windowMs);
    }
  }

  /**
   * Fallback local rate limiting
   */
  private checkLocalLimit(
    key: string,
    limit: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.localStore.get(key);

    if (!entry || now > entry.resetTime) {
      // New window
      this.localStore.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: limit - 1, resetTime: now + windowMs };
    }

    entry.count++;
    const allowed = entry.count <= limit;
    const remaining = Math.max(0, limit - entry.count);

    return { allowed, remaining, resetTime: entry.resetTime };
  }

  /**
   * Check burst limit (requests per second)
   */
  private async checkBurstLimit(
    identifier: string,
    burstLimit: number
  ): Promise<boolean> {
    const key = REDIS_PREFIX.burst + identifier;
    const now = Math.floor(Date.now() / 1000); // Current second

    if (this.redis && this.isRedisConnected) {
      try {
        const count = await this.redis.incr(key);
        if (count === 1) {
          await this.redis.expire(key, 2); // Expire after 2 seconds
        }
        return count <= burstLimit;
      } catch {
        return true; // Allow on error
      }
    }

    return true; // Skip burst check if no Redis
  }

  /**
   * Block an identifier temporarily (for abuse)
   */
  async blockIdentifier(identifier: string, durationMs: number): Promise<void> {
    const key = REDIS_PREFIX.blocked + identifier;

    if (this.redis && this.isRedisConnected) {
      await this.redis.setEx(key, Math.ceil(durationMs / 1000), "blocked");
    }

    logger.warn(`Rate limit: Blocked ${identifier} for ${durationMs}ms`);
  }

  /**
   * Check if identifier is blocked
   */
  private async isBlocked(identifier: string): Promise<boolean> {
    if (!this.redis || !this.isRedisConnected) return false;

    const key = REDIS_PREFIX.blocked + identifier;
    const blocked = await this.redis.get(key);
    return blocked === "blocked";
  }

  /**
   * Main rate limit middleware
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const { id: identifier } = this.getIdentifier(req);

      // Check if blocked
      if (await this.isBlocked(identifier)) {
        return res.status(429).json({
          success: false,
          error: "Too many requests. You have been temporarily blocked.",
          retryAfter: 300, // 5 minutes
        });
      }

      // Get applicable limits
      const tier = this.getTier(req);
      const endpointLimit = this.getEndpointLimit(req);

      // Use stricter of tier limit or endpoint limit
      const windowMs = endpointLimit?.windowMs || tier.windowMs;
      const maxRequests = endpointLimit?.maxRequests || tier.maxRequests;

      // Check burst limit first
      const burstAllowed = await this.checkBurstLimit(
        identifier,
        tier.burstLimit
      );
      if (!burstAllowed) {
        res.set({
          "X-RateLimit-Limit": tier.burstLimit.toString(),
          "X-RateLimit-Remaining": "0",
          "Retry-After": "1",
        });

        return res.status(429).json({
          success: false,
          error: "Too many requests. Please slow down.",
          retryAfter: 1,
        });
      }

      // Check main rate limit
      const limitKey = endpointLimit
        ? `${identifier}:${req.method}:${req.path}`
        : identifier;

      const { allowed, remaining, resetTime } = await this.checkRedisLimit(
        limitKey,
        maxRequests,
        windowMs
      );

      // Set rate limit headers
      res.set({
        "X-RateLimit-Limit": maxRequests.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": Math.ceil(resetTime / 1000).toString(),
      });

      if (!allowed) {
        const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
        res.set("Retry-After", retryAfter.toString());

        // Track repeated violations for potential blocking
        const violationKey = `violations:${identifier}`;
        if (this.redis && this.isRedisConnected) {
          const violations = await this.redis.incr(violationKey);
          await this.redis.expire(violationKey, 3600); // 1 hour

          // Block after 10 violations in an hour
          if (violations >= 10) {
            await this.blockIdentifier(identifier, 5 * 60 * 1000); // 5 minutes
          }
        }

        logger.warn("Rate limit exceeded", {
          identifier,
          endpoint: `${req.method} ${req.path}`,
          limit: maxRequests,
        });

        return res.status(429).json({
          success: false,
          error: "Rate limit exceeded. Please try again later.",
          retryAfter,
          limit: maxRequests,
          windowMs,
        });
      }

      next();
    };
  }

  /**
   * Strict rate limiter for auth endpoints
   */
  authLimiter() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const identifier = `auth:${ip}`;

      // Very strict limits for auth
      const { allowed, remaining, resetTime } = await this.checkRedisLimit(
        identifier,
        5, // 5 attempts
        15 * 60 * 1000 // 15 minutes
      );

      res.set({
        "X-RateLimit-Limit": "5",
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": Math.ceil(resetTime / 1000).toString(),
      });

      if (!allowed) {
        const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
        res.set("Retry-After", retryAfter.toString());

        logger.warn("Auth rate limit exceeded", { ip, endpoint: req.path });

        return res.status(429).json({
          success: false,
          error: "Too many authentication attempts. Please try again later.",
          retryAfter,
        });
      }

      next();
    };
  }

  /**
   * Get current rate limit status for a user
   */
  async getStatus(userId: string): Promise<{
    tier: string;
    limit: number;
    remaining: number;
    resetTime: number;
  }> {
    const identifier = `user:${userId}`;
    const tier = RATE_LIMIT_TIERS.member; // Default for API check

    if (this.redis && this.isRedisConnected) {
      const key = REDIS_PREFIX.rateLimit + identifier;
      const count = await this.redis.zCard(key);

      return {
        tier: "member",
        limit: tier.maxRequests,
        remaining: Math.max(0, tier.maxRequests - count),
        resetTime: Date.now() + tier.windowMs,
      };
    }

    return {
      tier: "member",
      limit: tier.maxRequests,
      remaining: tier.maxRequests,
      resetTime: Date.now() + tier.windowMs,
    };
  }

  async shutdown(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
    this.localStore.clear();
  }
}

// Export singleton
export const rateLimiter = new RateLimiter();
export default rateLimiter;
