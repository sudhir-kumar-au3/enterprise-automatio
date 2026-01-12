/**
 * Request Deduplication Middleware
 *
 * Features:
 * - Prevents duplicate form submissions
 * - Idempotency key support for API requests
 * - Redis-backed for distributed systems
 * - Configurable deduplication window
 * - Returns cached response for duplicate requests
 */

import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { createClient, RedisClientType } from "redis";
import config from "../config";
import logger from "../utils/logger";

// Deduplication configuration
const DEDUP_CONFIG = {
  // Default deduplication window (in seconds)
  defaultWindowSeconds: 60,

  // Maximum window allowed
  maxWindowSeconds: 3600, // 1 hour

  // Header name for idempotency key
  idempotencyHeader: "X-Idempotency-Key",

  // Header name for request ID
  requestIdHeader: "X-Request-ID",

  // Methods that should be deduplicated
  deduplicateMethods: ["POST", "PUT", "PATCH", "DELETE"],

  // Paths to skip deduplication
  skipPaths: ["/api/v1/auth/login", "/api/v1/auth/refresh", "/api/v1/health"],

  // Redis key prefix
  redisPrefix: "dedup:",
};

// Cached response structure
interface CachedResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  timestamp: number;
}

// Deduplication result
interface DeduplicationResult {
  isDuplicate: boolean;
  cachedResponse?: CachedResponse;
  requestId: string;
}

class RequestDeduplicationService {
  private redis: RedisClientType | null = null;
  private localCache: Map<string, CachedResponse> = new Map();
  private isRedisConnected = false;
  private pendingRequests: Map<string, Promise<any>> = new Map();

  /**
   * Initialize Redis connection
   */
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
        logger.error("Deduplication Redis error", err);
        this.isRedisConnected = false;
      });

      this.redis.on("connect", () => {
        this.isRedisConnected = true;
        logger.info("Deduplication Redis connected");
      });

      await this.redis.connect();
    } catch (error) {
      logger.warn("Deduplication Redis unavailable, using local cache", error);
      this.isRedisConnected = false;
    }
  }

  /**
   * Generate a unique key for the request
   */
  private generateRequestKey(req: Request): string {
    // Check for idempotency key header first
    const idempotencyKey = req.headers[
      DEDUP_CONFIG.idempotencyHeader.toLowerCase()
    ] as string;
    if (idempotencyKey) {
      return `${DEDUP_CONFIG.redisPrefix}idem:${idempotencyKey}`;
    }

    // Generate key from request properties
    const user = (req as any).user;
    const userId = user?.id || req.ip || "anonymous";

    const components = [
      req.method,
      req.originalUrl || req.url,
      userId,
      JSON.stringify(req.body || {}),
    ];

    const hash = crypto
      .createHash("sha256")
      .update(components.join("|"))
      .digest("hex")
      .substring(0, 32);

    return `${DEDUP_CONFIG.redisPrefix}req:${hash}`;
  }

  /**
   * Check if request is duplicate and get cached response
   */
  private async checkDuplicate(key: string): Promise<DeduplicationResult> {
    const requestId = crypto.randomUUID();

    // Try Redis first
    if (this.redis && this.isRedisConnected) {
      try {
        const cached = await this.redis.get(key);
        if (cached) {
          const cachedResponse = JSON.parse(cached) as CachedResponse;
          logger.info("Duplicate request detected (Redis)", { key });
          return { isDuplicate: true, cachedResponse, requestId };
        }
      } catch (error) {
        logger.warn("Redis dedup check failed", error);
      }
    }

    // Fallback to local cache
    const localCached = this.localCache.get(key);
    if (localCached) {
      logger.info("Duplicate request detected (local)", { key });
      return { isDuplicate: true, cachedResponse: localCached, requestId };
    }

    return { isDuplicate: false, requestId };
  }

  /**
   * Store response for future deduplication
   */
  private async storeResponse(
    key: string,
    response: CachedResponse,
    windowSeconds: number
  ): Promise<void> {
    const serialized = JSON.stringify(response);

    // Store in Redis
    if (this.redis && this.isRedisConnected) {
      try {
        await this.redis.setEx(key, windowSeconds, serialized);
      } catch (error) {
        logger.warn("Redis dedup store failed", error);
      }
    }

    // Store in local cache with auto-cleanup
    this.localCache.set(key, response);
    setTimeout(() => {
      this.localCache.delete(key);
    }, windowSeconds * 1000);
  }

  /**
   * Lock a request to prevent concurrent duplicates
   */
  private async acquireLock(key: string): Promise<boolean> {
    const lockKey = `${key}:lock`;

    if (this.redis && this.isRedisConnected) {
      try {
        // Use SET NX for atomic lock
        const result = await this.redis.set(lockKey, "1", {
          NX: true,
          EX: 30, // Lock expires in 30 seconds
        });
        return result === "OK";
      } catch (error) {
        logger.warn("Redis lock acquisition failed", error);
      }
    }

    // Local lock using pending requests map
    if (this.pendingRequests.has(key)) {
      return false;
    }
    return true;
  }

  /**
   * Release lock for a request
   */
  private async releaseLock(key: string): Promise<void> {
    const lockKey = `${key}:lock`;

    if (this.redis && this.isRedisConnected) {
      try {
        await this.redis.del(lockKey);
      } catch (error) {
        logger.warn("Redis lock release failed", error);
      }
    }

    this.pendingRequests.delete(key);
  }

  /**
   * Main deduplication middleware
   */
  middleware(options: { windowSeconds?: number } = {}) {
    const windowSeconds = Math.min(
      options.windowSeconds || DEDUP_CONFIG.defaultWindowSeconds,
      DEDUP_CONFIG.maxWindowSeconds
    );

    return async (req: Request, res: Response, next: NextFunction) => {
      // Skip if method shouldn't be deduplicated
      if (!DEDUP_CONFIG.deduplicateMethods.includes(req.method)) {
        return next();
      }

      // Skip certain paths
      if (DEDUP_CONFIG.skipPaths.some((p) => req.path.startsWith(p))) {
        return next();
      }

      const key = this.generateRequestKey(req);

      // Check for duplicate
      const { isDuplicate, cachedResponse, requestId } =
        await this.checkDuplicate(key);

      // Set request ID header
      res.setHeader(DEDUP_CONFIG.requestIdHeader, requestId);

      if (isDuplicate && cachedResponse) {
        // Return cached response
        logger.info("Returning cached response for duplicate request", {
          requestId,
          path: req.path,
        });

        // Set cached headers
        Object.entries(cachedResponse.headers).forEach(([name, value]) => {
          if (
            !["content-length", "transfer-encoding"].includes(
              name.toLowerCase()
            )
          ) {
            res.setHeader(name, value);
          }
        });

        res.setHeader("X-Duplicate-Request", "true");
        res.setHeader(
          "X-Original-Timestamp",
          cachedResponse.timestamp.toString()
        );

        return res.status(cachedResponse.statusCode).json(cachedResponse.body);
      }

      // Try to acquire lock for concurrent request handling
      const lockAcquired = await this.acquireLock(key);
      if (!lockAcquired) {
        // Another identical request is in progress, wait for it
        logger.info("Waiting for concurrent request to complete", { key });

        // Wait and retry
        await new Promise((resolve) => setTimeout(resolve, 100));
        const retryResult = await this.checkDuplicate(key);

        if (retryResult.isDuplicate && retryResult.cachedResponse) {
          res.setHeader("X-Duplicate-Request", "true");
          return res
            .status(retryResult.cachedResponse.statusCode)
            .json(retryResult.cachedResponse.body);
        }
      }

      // Capture response to cache it
      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);

      const captureResponse = (body: any) => {
        const cachedResponse: CachedResponse = {
          statusCode: res.statusCode,
          headers: {},
          body: typeof body === "string" ? JSON.parse(body) : body,
          timestamp: Date.now(),
        };

        // Capture relevant headers
        const headersToCapture = ["content-type", "x-request-id"];
        headersToCapture.forEach((header) => {
          const value = res.getHeader(header);
          if (value) {
            cachedResponse.headers[header] = value.toString();
          }
        });

        // Store response asynchronously
        this.storeResponse(key, cachedResponse, windowSeconds)
          .then(() => this.releaseLock(key))
          .catch((err) => {
            logger.error("Failed to store response for dedup", err);
            this.releaseLock(key);
          });
      };

      res.json = function (body: any): Response {
        captureResponse(body);
        return originalJson(body);
      };

      res.send = function (body: any): Response {
        if (typeof body === "object") {
          captureResponse(body);
        }
        return originalSend(body);
      };

      next();
    };
  }

  /**
   * Idempotency middleware for specific endpoints
   * Requires X-Idempotency-Key header
   */
  idempotencyMiddleware(
    options: { required?: boolean; windowSeconds?: number } = {}
  ) {
    const { required = true, windowSeconds = 3600 } = options;

    return async (req: Request, res: Response, next: NextFunction) => {
      const idempotencyKey = req.headers[
        DEDUP_CONFIG.idempotencyHeader.toLowerCase()
      ] as string;

      if (!idempotencyKey) {
        if (required) {
          return res.status(400).json({
            success: false,
            error: `${DEDUP_CONFIG.idempotencyHeader} header is required`,
          });
        }
        return next();
      }

      // Validate idempotency key format (UUID or similar)
      if (!/^[a-zA-Z0-9-_]{8,128}$/.test(idempotencyKey)) {
        return res.status(400).json({
          success: false,
          error: "Invalid idempotency key format",
        });
      }

      // Use standard deduplication with idempotency key
      return this.middleware({ windowSeconds })(req, res, next);
    };
  }

  /**
   * Clear cached response (useful for testing)
   */
  async clearCache(key?: string): Promise<void> {
    if (key) {
      if (this.redis && this.isRedisConnected) {
        await this.redis.del(key);
      }
      this.localCache.delete(key);
    } else {
      if (this.redis && this.isRedisConnected) {
        const keys = await this.redis.keys(`${DEDUP_CONFIG.redisPrefix}*`);
        if (keys.length > 0) {
          await this.redis.del(keys);
        }
      }
      this.localCache.clear();
    }
  }

  /**
   * Get deduplication statistics
   */
  async getStats(): Promise<{
    localCacheSize: number;
    redisConnected: boolean;
    pendingRequests: number;
  }> {
    return {
      localCacheSize: this.localCache.size,
      redisConnected: this.isRedisConnected,
      pendingRequests: this.pendingRequests.size,
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
    this.localCache.clear();
    this.pendingRequests.clear();
  }
}

// Export singleton
export const requestDedup = new RequestDeduplicationService();
export default requestDedup;
