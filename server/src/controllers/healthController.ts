/**
 * Health & Observability Controller
 * Provides endpoints for Kubernetes probes, metrics, and system diagnostics
 */

import { Request, Response } from "express";
import mongoose from "mongoose";
import os from "os";
import { asyncHandler } from "../middleware";
import { cacheService } from "../services/cache.service";
import { wsService } from "../services/websocket.service";
import { isDatabaseHealthy, getConnectionStats } from "../config/database";
import logger from "../utils/logger";

// Track application start time
const startTime = Date.now();

// Simple in-memory metrics (replace with Prometheus in production)
const metrics = {
  requests: {
    total: 0,
    byStatus: {} as Record<string, number>,
    byEndpoint: {} as Record<string, number>,
  },
  latency: {
    sum: 0,
    count: 0,
    max: 0,
    p99: [] as number[], // Keep last 1000 for percentile calculation
  },
  errors: {
    total: 0,
    byType: {} as Record<string, number>,
  },
};

export const incrementRequestMetric = (
  statusCode: number,
  endpoint: string,
  latencyMs: number
) => {
  metrics.requests.total++;
  metrics.requests.byStatus[statusCode] =
    (metrics.requests.byStatus[statusCode] || 0) + 1;
  metrics.requests.byEndpoint[endpoint] =
    (metrics.requests.byEndpoint[endpoint] || 0) + 1;
  metrics.latency.sum += latencyMs;
  metrics.latency.count++;
  metrics.latency.max = Math.max(metrics.latency.max, latencyMs);

  // Track for percentile calculation (keep last 1000)
  metrics.latency.p99.push(latencyMs);
  if (metrics.latency.p99.length > 1000) {
    metrics.latency.p99.shift();
  }
};

export const incrementErrorMetric = (errorType: string) => {
  metrics.errors.total++;
  metrics.errors.byType[errorType] =
    (metrics.errors.byType[errorType] || 0) + 1;
};

// Calculate p99 latency
const calculateP99 = (): number => {
  if (metrics.latency.p99.length === 0) return 0;
  const sorted = [...metrics.latency.p99].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * 0.99);
  return sorted[index] || 0;
};

/**
 * Kubernetes Liveness Probe
 * Returns 200 if the application is running
 */
export const livenessProbe = asyncHandler(
  async (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * Kubernetes Readiness Probe
 * Returns 200 if the application can accept traffic
 * Checks critical dependencies (database, Redis, etc.)
 */
export const readinessProbe = asyncHandler(
  async (_req: Request, res: Response) => {
    const checks: Record<
      string,
      { status: string; latency?: number; error?: string }
    > = {};
    let isReady = true;

    // Check MongoDB connection
    const dbStart = Date.now();
    try {
      const isHealthy = await isDatabaseHealthy();
      if (isHealthy) {
        checks.mongodb = {
          status: "healthy",
          latency: Date.now() - dbStart,
        };
      } else {
        checks.mongodb = {
          status: "unhealthy",
          error: "Database not responding",
        };
        isReady = false;
      }
    } catch (error) {
      checks.mongodb = {
        status: "unhealthy",
        error: (error as Error).message,
        latency: Date.now() - dbStart,
      };
      isReady = false;
    }

    // Check Redis/Cache service
    const cacheStart = Date.now();
    try {
      const cacheStats = cacheService.getStats();
      checks.redis = {
        status: "healthy",
        latency: Date.now() - cacheStart,
      };
    } catch (error) {
      checks.redis = {
        status: "degraded", // Not critical, can work without cache
        error: (error as Error).message,
      };
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memoryThreshold = 0.9; // 90% threshold
    const heapUsedRatio = memUsage.heapUsed / memUsage.heapTotal;

    if (heapUsedRatio > memoryThreshold) {
      checks.memory = {
        status: "warning",
        error: `High memory usage: ${(heapUsedRatio * 100).toFixed(1)}%`,
      };
    } else {
      checks.memory = {
        status: "healthy",
      };
    }

    const statusCode = isReady ? 200 : 503;
    res.status(statusCode).json({
      status: isReady ? "ready" : "not_ready",
      timestamp: new Date().toISOString(),
      checks,
    });
  }
);

/**
 * Comprehensive Health Check
 * Detailed health status for monitoring dashboards
 */
export const healthCheck = asyncHandler(
  async (_req: Request, res: Response) => {
    const checks: Record<string, any> = {};
    let overallStatus = "healthy";

    // MongoDB Health
    try {
      const dbStats = getConnectionStats();
      const dbState = mongoose.connection.readyState;
      const stateMap: Record<number, string> = {
        0: "disconnected",
        1: "connected",
        2: "connecting",
        3: "disconnecting",
      };

      if (dbState === 1) {
        const mongoStats = await mongoose.connection.db?.stats();
        checks.mongodb = {
          status: "healthy",
          state: stateMap[dbState],
          host: dbStats.host,
          database: dbStats.name,
          poolSize: dbStats.poolSize,
          collections: mongoStats?.collections || 0,
          dataSize: formatBytes(mongoStats?.dataSize || 0),
          indexSize: formatBytes(mongoStats?.indexSize || 0),
        };
      } else {
        checks.mongodb = {
          status: "unhealthy",
          state: stateMap[dbState] || "unknown",
        };
        overallStatus = "unhealthy";
      }
    } catch (error) {
      checks.mongodb = {
        status: "unhealthy",
        error: (error as Error).message,
      };
      overallStatus = "unhealthy";
    }

    // Redis/Cache Health
    try {
      const cacheStats = cacheService.getStats();
      checks.cache = {
        status: "healthy",
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate: cacheStats.hitRate.toFixed(2) + "%",
        localCacheSize: cacheStats.size,
        staleHits: cacheStats.staleHits,
      };
    } catch (error) {
      checks.cache = {
        status: "degraded",
        error: (error as Error).message,
      };
    }

    // WebSocket Health
    try {
      const wsMetrics = wsService.getMetrics();
      const globalMetrics = await wsService.getGlobalMetrics();
      checks.websocket = {
        status: "healthy",
        serverId: wsMetrics.serverId,
        localConnections: wsMetrics.localConnections,
        totalConnections: globalMetrics.totalConnections,
        serverCount: globalMetrics.serverCount,
        uptime: formatUptime(wsMetrics.uptime),
      };
    } catch (error) {
      checks.websocket = {
        status: "degraded",
        error: (error as Error).message,
      };
    }

    // System Resources
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const loadAvg = os.loadavg();

    checks.system = {
      status: "healthy",
      memory: {
        heapUsed: formatBytes(memUsage.heapUsed),
        heapTotal: formatBytes(memUsage.heapTotal),
        external: formatBytes(memUsage.external),
        rss: formatBytes(memUsage.rss),
        heapUsedPercent:
          ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(1) + "%",
      },
      cpu: {
        user: (cpuUsage.user / 1000000).toFixed(2) + "s",
        system: (cpuUsage.system / 1000000).toFixed(2) + "s",
      },
      loadAverage: {
        "1min": loadAvg[0].toFixed(2),
        "5min": loadAvg[1].toFixed(2),
        "15min": loadAvg[2].toFixed(2),
      },
      uptime: formatUptime(process.uptime()),
      platform: os.platform(),
      cpuCores: os.cpus().length,
      totalMemory: formatBytes(os.totalmem()),
      freeMemory: formatBytes(os.freemem()),
    };

    // Request Metrics
    checks.requests = {
      status: "healthy",
      total: metrics.requests.total,
      avgLatency:
        metrics.latency.count > 0
          ? (metrics.latency.sum / metrics.latency.count).toFixed(2) + "ms"
          : "0ms",
      maxLatency: metrics.latency.max.toFixed(2) + "ms",
      p99Latency: calculateP99().toFixed(2) + "ms",
      errorRate:
        metrics.requests.total > 0
          ? ((metrics.errors.total / metrics.requests.total) * 100).toFixed(2) +
            "%"
          : "0%",
    };

    // Application Info
    checks.application = {
      status: "healthy",
      name: "Team Collaboration Hub",
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      nodeVersion: process.version,
      pid: process.pid,
      startTime: new Date(startTime).toISOString(),
      uptime: formatUptime((Date.now() - startTime) / 1000),
    };

    res.status(overallStatus === "healthy" ? 200 : 503).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
    });
  }
);

/**
 * Prometheus-compatible Metrics Endpoint
 */
export const metricsEndpoint = asyncHandler(
  async (_req: Request, res: Response) => {
    const memUsage = process.memoryUsage();
    const uptime = (Date.now() - startTime) / 1000;
    const cacheStats = cacheService.getStats();
    let wsMetrics = { connections: 0, localConnections: 0 };

    try {
      wsMetrics = wsService.getMetrics();
    } catch {}

    // Format as Prometheus text format
    const prometheusMetrics = [
      "# HELP nodejs_heap_size_total_bytes Total heap size in bytes",
      "# TYPE nodejs_heap_size_total_bytes gauge",
      `nodejs_heap_size_total_bytes ${memUsage.heapTotal}`,
      "",
      "# HELP nodejs_heap_size_used_bytes Used heap size in bytes",
      "# TYPE nodejs_heap_size_used_bytes gauge",
      `nodejs_heap_size_used_bytes ${memUsage.heapUsed}`,
      "",
      "# HELP nodejs_external_memory_bytes External memory in bytes",
      "# TYPE nodejs_external_memory_bytes gauge",
      `nodejs_external_memory_bytes ${memUsage.external}`,
      "",
      "# HELP process_uptime_seconds Process uptime in seconds",
      "# TYPE process_uptime_seconds gauge",
      `process_uptime_seconds ${uptime}`,
      "",
      "# HELP http_requests_total Total HTTP requests",
      "# TYPE http_requests_total counter",
      `http_requests_total ${metrics.requests.total}`,
      "",
      "# HELP http_request_duration_seconds HTTP request latency",
      "# TYPE http_request_duration_seconds summary",
      `http_request_duration_seconds_sum ${metrics.latency.sum / 1000}`,
      `http_request_duration_seconds_count ${metrics.latency.count}`,
      "",
      "# HELP http_request_latency_p99_ms 99th percentile latency in ms",
      "# TYPE http_request_latency_p99_ms gauge",
      `http_request_latency_p99_ms ${calculateP99()}`,
      "",
      "# HELP http_errors_total Total HTTP errors",
      "# TYPE http_errors_total counter",
      `http_errors_total ${metrics.errors.total}`,
      "",
      "# HELP cache_hits_total Total cache hits",
      "# TYPE cache_hits_total counter",
      `cache_hits_total ${cacheStats.hits}`,
      "",
      "# HELP cache_misses_total Total cache misses",
      "# TYPE cache_misses_total counter",
      `cache_misses_total ${cacheStats.misses}`,
      "",
      "# HELP websocket_connections_total Total WebSocket connections",
      "# TYPE websocket_connections_total gauge",
      `websocket_connections_total ${wsMetrics.connections}`,
    ];

    // Add per-status metrics
    Object.entries(metrics.requests.byStatus).forEach(([status, count]) => {
      prometheusMetrics.push(
        `http_requests_total{status="${status}"} ${count}`
      );
    });

    res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    res.send(prometheusMetrics.join("\n"));
  }
);

/**
 * Application Info Endpoint
 */
export const appInfo = asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      name: "Team Collaboration Hub API",
      version: process.env.npm_package_version || "1.0.0",
      description: "Enterprise team collaboration and task management API",
      environment: process.env.NODE_ENV || "development",
      documentation: "/api/v1/docs",
      health: "/api/v1/health",
      metrics: "/api/v1/metrics",
      endpoints: {
        auth: "/api/v1/auth",
        tasks: "/api/v1/tasks",
        comments: "/api/v1/comments",
        team: "/api/v1/team",
        data: "/api/v1/data",
      },
      features: {
        realtime: "WebSocket with Redis Pub/Sub for horizontal scaling",
        caching: "Multi-tier caching with Redis and local cache",
        backgroundJobs: "BullMQ for async task processing",
        rateLimit: "Redis-backed distributed rate limiting",
      },
    },
  });
});

// Helper functions
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  parts.push(`${secs}s`);

  return parts.join(" ");
}
