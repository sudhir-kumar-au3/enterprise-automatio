/**
 * Rate Limiting & Throttling Service
 *
 * Features:
 * - Sliding window rate limiting
 * - Multiple limit tiers (free, pro, enterprise)
 * - Per-user, per-IP, per-API key limits
 * - Endpoint-specific limits
 * - Redis-based distributed rate limiting
 * - Graceful degradation
 * - Rate limit headers
 */

import Redis from "ioredis";
import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

// Rate limit configuration
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyPrefix?: string; // Redis key prefix
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  handler?: (req: Request, res: Response, next: NextFunction) => void;
  skip?: (req: Request) => boolean | Promise<boolean>;
  keyGenerator?: (req: Request) => string;
}

// Rate limit tier configuration
export interface RateLimitTier {
  name: string;
  limits: {
    global: { windowMs: number; maxRequests: number };
    perEndpoint: { windowMs: number; maxRequests: number };
    perSecond: { maxRequests: number };
  };
  burstAllowance: number; // Extra requests allowed in burst
}

// Rate limit result
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number; // Seconds until retry
}

// Default tiers
const defaultTiers: Record<string, RateLimitTier> = {
  free: {
    name: "free",
    limits: {
      global: { windowMs: 60 * 60 * 1000, maxRequests: 1000 }, // 1000/hour
      perEndpoint: { windowMs: 60 * 1000, maxRequests: 30 }, // 30/minute per endpoint
      perSecond: { maxRequests: 5 }, // 5/second
    },
    burstAllowance: 10,
  },
  pro: {
    name: "pro",
    limits: {
      global: { windowMs: 60 * 60 * 1000, maxRequests: 10000 }, // 10000/hour
      perEndpoint: { windowMs: 60 * 1000, maxRequests: 100 }, // 100/minute per endpoint
      perSecond: { maxRequests: 20 }, // 20/second
    },
    burstAllowance: 50,
  },
  enterprise: {
    name: "enterprise",
    limits: {
      global: { windowMs: 60 * 60 * 1000, maxRequests: 100000 }, // 100000/hour
      perEndpoint: { windowMs: 60 * 1000, maxRequests: 500 }, // 500/minute per endpoint
      perSecond: { maxRequests: 100 }, // 100/second
    },
    burstAllowance: 200,
  },
};

// Endpoint-specific limits
const endpointLimits: Record<
  string,
  { windowMs: number; maxRequests: number }
> = {
  // Auth endpoints - stricter limits
  "POST:/api/auth/login": { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  "POST:/api/auth/register": { windowMs: 60 * 60 * 1000, maxRequests: 3 },
  "POST:/api/auth/forgot-password": {
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
  },

  // File upload - limited
  "POST:/api/files/upload": { windowMs: 60 * 1000, maxRequests: 10 },

  // Export - limited
  "POST:/api/export": { windowMs: 60 * 60 * 1000, maxRequests: 10 },

  // Search - moderate limits
  "GET:/api/search": { windowMs: 60 * 1000, maxRequests: 60 },

  // Webhooks - higher limits
  "POST:/api/webhooks/*": { windowMs: 60 * 1000, maxRequests: 1000 },
};

class RateLimitService {
  private redis: Redis | null = null;
  private localStore: Map<string, { count: number; resetTime: number }> =
    new Map();
  private tiers: Record<string, RateLimitTier> = defaultTiers;
  private isRedisAvailable = false;

  /**
   * Initialize Redis connection
   */
  async initialize(redisUrl?: string): Promise<void> {
    try {
      this.redis = new Redis(
        redisUrl || process.env.REDIS_URL || "redis://localhost:6379",
        {
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          lazyConnect: true,
        }
      );

      await this.redis.connect();
      this.isRedisAvailable = true;
      logger.info("Rate limit service connected to Redis");

      // Handle Redis disconnection
      this.redis.on("error", (error) => {
        logger.error("Redis error in rate limiter", { error: error.message });
        this.isRedisAvailable = false;
      });

      this.redis.on("connect", () => {
        this.isRedisAvailable = true;
      });
    } catch (error) {
      logger.warn("Redis not available, using local rate limiting", { error });
      this.isRedisAvailable = false;
    }

    // Clean up local store periodically
    setInterval(() => this.cleanupLocalStore(), 60 * 1000);
  }

  /**
   * Register custom tier
   */
  registerTier(tier: RateLimitTier): void {
    this.tiers[tier.name] = tier;
  }

  /**
   * Check rate limit using sliding window algorithm
   */
  async checkLimit(
    key: string,
    config: { windowMs: number; maxRequests: number }
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const resetTime = new Date(now + config.windowMs);

    if (this.isRedisAvailable && this.redis) {
      return this.checkLimitRedis(key, config, now, windowStart, resetTime);
    }

    return this.checkLimitLocal(key, config, now, resetTime);
  }

  /**
   * Redis-based sliding window rate limiting
   */
  private async checkLimitRedis(
    key: string,
    config: { windowMs: number; maxRequests: number },
    now: number,
    windowStart: number,
    resetTime: Date
  ): Promise<RateLimitResult> {
    const redisKey = `ratelimit:${key}`;

    try {
      // Use Redis sorted set for sliding window
      const pipeline = this.redis!.pipeline();

      // Remove old entries outside the window
      pipeline.zremrangebyscore(redisKey, 0, windowStart);

      // Count current entries in window
      pipeline.zcard(redisKey);

      // Add current request
      pipeline.zadd(redisKey, now.toString(), `${now}-${Math.random()}`);

      // Set expiry
      pipeline.pexpire(redisKey, config.windowMs);

      const results = await pipeline.exec();

      if (!results) {
        throw new Error("Pipeline returned null");
      }

      const currentCount = (results[1][1] as number) || 0;
      const remaining = Math.max(0, config.maxRequests - currentCount - 1);
      const allowed = currentCount < config.maxRequests;

      if (!allowed) {
        // Remove the request we just added if not allowed
        await this.redis!.zremrangebyscore(redisKey, now, now);
      }

      return {
        allowed,
        limit: config.maxRequests,
        remaining,
        resetTime,
        retryAfter: allowed ? undefined : Math.ceil(config.windowMs / 1000),
      };
    } catch (error) {
      logger.error("Redis rate limit error, falling back to local", { error });
      return this.checkLimitLocal(key, config, now, resetTime);
    }
  }

  /**
   * Local in-memory rate limiting (fallback)
   */
  private checkLimitLocal(
    key: string,
    config: { windowMs: number; maxRequests: number },
    now: number,
    resetTime: Date
  ): RateLimitResult {
    const record = this.localStore.get(key);

    if (!record || record.resetTime < now) {
      // New window
      this.localStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });

      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetTime,
      };
    }

    const allowed = record.count < config.maxRequests;

    if (allowed) {
      record.count++;
    }

    return {
      allowed,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - record.count),
      resetTime: new Date(record.resetTime),
      retryAfter: allowed
        ? undefined
        : Math.ceil((record.resetTime - now) / 1000),
    };
  }

  /**
   * Clean up expired entries from local store
   */
  private cleanupLocalStore(): void {
    const now = Date.now();
    for (const [key, record] of this.localStore.entries()) {
      if (record.resetTime < now) {
        this.localStore.delete(key);
      }
    }
  }

  /**
   * Get rate limit key for a request
   */
  getKey(
    req: Request,
    type: "user" | "ip" | "api" | "endpoint" = "user"
  ): string {
    switch (type) {
      case "user":
        return `user:${(req as any).user?.id || "anonymous"}`;
      case "ip":
        return `ip:${this.getClientIp(req)}`;
      case "api":
        return `api:${(req as any).apiKey || "none"}`;
      case "endpoint":
        return `endpoint:${req.method}:${req.path}:${
          (req as any).user?.id || this.getClientIp(req)
        }`;
      default:
        return `default:${this.getClientIp(req)}`;
    }
  }

  /**
   * Get client IP address
   */
  private getClientIp(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      return forwarded.split(",")[0].trim();
    }
    return req.socket?.remoteAddress || "unknown";
  }

  /**
   * Get tier for user
   */
  getTier(req: Request): RateLimitTier {
    const user = (req as any).user;

    if (!user) {
      return this.tiers.free;
    }

    // Check user's subscription/plan
    const plan = user.plan || user.subscription?.plan || "free";
    return this.tiers[plan] || this.tiers.free;
  }

  /**
   * Get endpoint-specific limit
   */
  getEndpointLimit(
    req: Request
  ): { windowMs: number; maxRequests: number } | null {
    const key = `${req.method}:${req.path}`;

    // Check exact match
    if (endpointLimits[key]) {
      return endpointLimits[key];
    }

    // Check wildcard patterns
    for (const [pattern, limit] of Object.entries(endpointLimits)) {
      if (pattern.includes("*")) {
        const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
        if (regex.test(key)) {
          return limit;
        }
      }
    }

    return null;
  }

  /**
   * Apply multiple rate limits and return combined result
   */
  async checkMultipleLimits(
    req: Request
  ): Promise<{ allowed: boolean; results: Record<string, RateLimitResult> }> {
    const tier = this.getTier(req);
    const results: Record<string, RateLimitResult> = {};

    // Check global limit
    const globalKey = this.getKey(req, "user");
    results.global = await this.checkLimit(globalKey, tier.limits.global);

    if (!results.global.allowed) {
      return { allowed: false, results };
    }

    // Check per-endpoint limit
    const endpointLimit = this.getEndpointLimit(req) || tier.limits.perEndpoint;
    const endpointKey = this.getKey(req, "endpoint");
    results.endpoint = await this.checkLimit(endpointKey, endpointLimit);

    if (!results.endpoint.allowed) {
      return { allowed: false, results };
    }

    // Check per-second limit (burst protection)
    const secondKey = `second:${globalKey}`;
    results.second = await this.checkLimit(secondKey, {
      windowMs: 1000,
      maxRequests: tier.limits.perSecond.maxRequests,
    });

    return {
      allowed: results.second.allowed,
      results,
    };
  }

  /**
   * Set rate limit headers on response
   */
  setHeaders(res: Response, result: RateLimitResult, type = "global"): void {
    const prefix = type === "global" ? "" : `${type}-`;

    res.setHeader(`X-RateLimit-${prefix}Limit`, result.limit);
    res.setHeader(`X-RateLimit-${prefix}Remaining`, result.remaining);
    res.setHeader(`X-RateLimit-${prefix}Reset`, result.resetTime.toISOString());

    if (result.retryAfter) {
      res.setHeader("Retry-After", result.retryAfter);
    }
  }

  /**
   * Create Express middleware
   */
  middleware(config?: Partial<RateLimitConfig>) {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Skip if configured
      if (config?.skip && (await config.skip(req))) {
        return next();
      }

      try {
        const { allowed, results } = await this.checkMultipleLimits(req);

        // Set headers for all checked limits
        if (results.global) {
          this.setHeaders(res, results.global, "");
        }
        if (results.endpoint) {
          this.setHeaders(res, results.endpoint, "endpoint");
        }

        if (!allowed) {
          // Find the limit that was exceeded
          const exceeded = Object.entries(results).find(([_, r]) => !r.allowed);
          const result = exceeded?.[1] || results.global;

          if (config?.handler) {
            return config.handler(req, res, next);
          }

          return res.status(429).json({
            error: "Too Many Requests",
            message: "Rate limit exceeded. Please try again later.",
            retryAfter: result.retryAfter,
            limit: result.limit,
            remaining: result.remaining,
            resetTime: result.resetTime,
          });
        }

        next();
      } catch (error) {
        logger.error("Rate limit middleware error", { error });
        // Allow request on error (fail open)
        next();
      }
    };
  }

  /**
   * Create strict middleware for specific endpoints
   */
  strictMiddleware(config: RateLimitConfig) {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (config.skip && (await config.skip(req))) {
        return next();
      }

      const key = config.keyGenerator
        ? config.keyGenerator(req)
        : `strict:${req.method}:${req.path}:${this.getClientIp(req)}`;

      const result = await this.checkLimit(key, {
        windowMs: config.windowMs,
        maxRequests: config.maxRequests,
      });

      this.setHeaders(res, result);

      if (!result.allowed) {
        if (config.handler) {
          return config.handler(req, res, next);
        }

        return res.status(429).json({
          error: "Too Many Requests",
          message: "Rate limit exceeded for this endpoint.",
          retryAfter: result.retryAfter,
        });
      }

      next();
    };
  }

  /**
   * Reset rate limit for a key (admin function)
   */
  async resetLimit(key: string): Promise<void> {
    if (this.isRedisAvailable && this.redis) {
      await this.redis.del(`ratelimit:${key}`);
    }
    this.localStore.delete(key);
    logger.info(`Rate limit reset for key: ${key}`);
  }

  /**
   * Get current usage for a key
   */
  async getUsage(key: string, windowMs: number): Promise<number> {
    if (this.isRedisAvailable && this.redis) {
      const now = Date.now();
      const windowStart = now - windowMs;
      return this.redis.zcount(`ratelimit:${key}`, windowStart, now);
    }

    const record = this.localStore.get(key);
    return record?.count || 0;
  }

  /**
   * IP-based rate limiting middleware (for DDoS protection)
   */
  ipRateLimiter(maxRequestsPerSecond = 10) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const ip = this.getClientIp(req);
      const key = `ip:${ip}`;

      const result = await this.checkLimit(key, {
        windowMs: 1000,
        maxRequests: maxRequestsPerSecond,
      });

      if (!result.allowed) {
        logger.warn("IP rate limit exceeded", { ip });
        return res.status(429).json({
          error: "Too Many Requests",
          message: "Please slow down your requests.",
        });
      }

      next();
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
    this.localStore.clear();
  }
}

// Export singleton instance
export const rateLimitService = new RateLimitService();

// Export middleware factory functions
export function rateLimit(config?: Partial<RateLimitConfig>) {
  return rateLimitService.middleware(config);
}

export function strictRateLimit(config: RateLimitConfig) {
  return rateLimitService.strictMiddleware(config);
}

export function ipRateLimit(maxRequestsPerSecond?: number) {
  return rateLimitService.ipRateLimiter(maxRequestsPerSecond);
}

export default rateLimitService;
