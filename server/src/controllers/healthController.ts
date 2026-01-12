/**
 * Health & Observability Controller
 * Provides endpoints for Kubernetes probes, metrics, and system diagnostics
 */

import { Request, Response } from "express";
import mongoose from "mongoose";
import os from "os";
import { asyncHandler } from "../middleware";
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
};

export const incrementErrorMetric = (errorType: string) => {
  metrics.errors.total++;
  metrics.errors.byType[errorType] =
    (metrics.errors.byType[errorType] || 0) + 1;
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
 * Checks critical dependencies (database, etc.)
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
      const dbState = mongoose.connection.readyState;
      if (dbState === 1) {
        // Ping the database
        await mongoose.connection.db?.admin().ping();
        checks.mongodb = {
          status: "healthy",
          latency: Date.now() - dbStart,
        };
      } else {
        checks.mongodb = {
          status: "unhealthy",
          error: `Connection state: ${dbState}`,
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
      const dbState = mongoose.connection.readyState;
      const stateMap: Record<number, string> = {
        0: "disconnected",
        1: "connected",
        2: "connecting",
        3: "disconnecting",
      };

      if (dbState === 1) {
        const dbStats = await mongoose.connection.db?.stats();
        checks.mongodb = {
          status: "healthy",
          state: stateMap[dbState],
          collections: dbStats?.collections || 0,
          dataSize: formatBytes(dbStats?.dataSize || 0),
          indexSize: formatBytes(dbStats?.indexSize || 0),
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

    // System Resources
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const loadAvg = os.loadavg(); // Fixed: loadavg() not loadaverage()

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
      "# HELP http_errors_total Total HTTP errors",
      "# TYPE http_errors_total counter",
      `http_errors_total ${metrics.errors.total}`,
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
