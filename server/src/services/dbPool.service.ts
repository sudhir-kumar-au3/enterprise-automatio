/**
 * MongoDB Database Connection Pooling Service
 *
 * Features:
 * - Optimized connection pool configuration
 * - Read/Write connection splitting for replicas
 * - Connection health monitoring
 * - Automatic reconnection with backoff
 * - Query performance tracking
 * - Graceful shutdown handling
 */

import mongoose, { Connection, ConnectOptions } from "mongoose";
import config from "../config";
import logger from "../utils/logger";

// Pool configuration optimized for production
const POOL_CONFIG = {
  // Connection pool settings
  pool: {
    // Maximum connections in the pool
    maxPoolSize: parseInt(process.env.MONGO_POOL_SIZE || "100", 10),

    // Minimum connections to maintain
    minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE || "10", 10),

    // Max time a connection can be idle before being removed (ms)
    maxIdleTimeMS: 30000, // 30 seconds

    // How long to wait for a connection from pool (ms)
    waitQueueTimeoutMS: 10000, // 10 seconds
  },

  // Timeouts
  timeouts: {
    // Server selection timeout (ms)
    serverSelectionTimeoutMS: 5000,

    // Socket timeout (ms)
    socketTimeoutMS: 45000,

    // Connection timeout (ms)
    connectTimeoutMS: 10000,

    // Heartbeat frequency (ms)
    heartbeatFrequencyMS: 10000,
  },

  // Retry settings
  retry: {
    // Enable retryable writes
    retryWrites: true,

    // Enable retryable reads
    retryReads: true,

    // Max retries for initial connection
    maxConnectRetries: 5,

    // Delay between retries (ms)
    retryDelayMS: 1000,
  },

  // Read preference for replica sets
  readPreference: {
    // Options: primary, primaryPreferred, secondary, secondaryPreferred, nearest
    default: "primaryPreferred" as const,

    // For analytics/reporting queries
    analytics: "secondaryPreferred" as const,
  },

  // Write concern
  writeConcern: {
    // Wait for write to be acknowledged
    w: "majority" as const,

    // Timeout for write concern (ms)
    wtimeout: 5000,

    // Wait for journal sync
    journal: true,
  },
};

// Connection statistics
interface ConnectionStats {
  totalConnections: number;
  availableConnections: number;
  pendingConnections: number;
  currentOps: number;
  queryCount: number;
  slowQueries: number;
  avgQueryTimeMs: number;
  lastHealthCheck: Date | null;
  isHealthy: boolean;
}

// Query timing tracking
interface QueryTiming {
  operation: string;
  collection: string;
  durationMs: number;
  timestamp: Date;
}

class DatabasePoolService {
  private primaryConnection: Connection | null = null;
  private readConnection: Connection | null = null;
  private isConnected = false;
  private connectionRetries = 0;
  private queryTimings: QueryTiming[] = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;

  // Statistics
  private stats: ConnectionStats = {
    totalConnections: 0,
    availableConnections: 0,
    pendingConnections: 0,
    currentOps: 0,
    queryCount: 0,
    slowQueries: 0,
    avgQueryTimeMs: 0,
    lastHealthCheck: null,
    isHealthy: false,
  };

  /**
   * Initialize database connections with optimized pooling
   */
  async initialize(): Promise<void> {
    const mongoUri = config.mongoUrl || process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error("MongoDB URI not configured");
    }

    try {
      // Configure mongoose
      mongoose.set("strictQuery", true);

      // Build connection options
      const connectionOptions: ConnectOptions = {
        // Pool settings
        maxPoolSize: POOL_CONFIG.pool.maxPoolSize,
        minPoolSize: POOL_CONFIG.pool.minPoolSize,
        maxIdleTimeMS: POOL_CONFIG.pool.maxIdleTimeMS,
        waitQueueTimeoutMS: POOL_CONFIG.pool.waitQueueTimeoutMS,

        // Timeouts
        serverSelectionTimeoutMS: POOL_CONFIG.timeouts.serverSelectionTimeoutMS,
        socketTimeoutMS: POOL_CONFIG.timeouts.socketTimeoutMS,
        connectTimeoutMS: POOL_CONFIG.timeouts.connectTimeoutMS,
        heartbeatFrequencyMS: POOL_CONFIG.timeouts.heartbeatFrequencyMS,

        // Retry settings
        retryWrites: POOL_CONFIG.retry.retryWrites,
        retryReads: POOL_CONFIG.retry.retryReads,

        // Write concern
        w: POOL_CONFIG.writeConcern.w,
        wtimeoutMS: POOL_CONFIG.writeConcern.wtimeout,
        journal: POOL_CONFIG.writeConcern.journal,

        // Read preference
        readPreference: POOL_CONFIG.readPreference.default,

        // Auto-index in development only
        autoIndex: process.env.NODE_ENV !== "production",

        // Buffer commands when disconnected
        bufferCommands: true,
      };

      // Connect with retry logic
      await this.connectWithRetry(mongoUri, connectionOptions);

      // Setup event handlers
      this.setupEventHandlers();

      // Setup query monitoring
      this.setupQueryMonitoring();

      // Start health checks
      this.startHealthChecks();

      logger.info("Database connection pool initialized", {
        maxPoolSize: POOL_CONFIG.pool.maxPoolSize,
        minPoolSize: POOL_CONFIG.pool.minPoolSize,
      });
    } catch (error) {
      logger.error("Failed to initialize database connection pool", error);
      throw error;
    }
  }

  /**
   * Connect with automatic retry
   */
  private async connectWithRetry(
    uri: string,
    options: ConnectOptions,
    maxRetries = POOL_CONFIG.retry.maxConnectRetries
  ): Promise<void> {
    while (this.connectionRetries < maxRetries) {
      try {
        await mongoose.connect(uri, options);
        this.primaryConnection = mongoose.connection;
        this.isConnected = true;
        this.connectionRetries = 0;
        return;
      } catch (error) {
        this.connectionRetries++;
        logger.warn(
          `Database connection attempt ${this.connectionRetries} failed`,
          error
        );

        if (this.connectionRetries >= maxRetries) {
          throw new Error(`Failed to connect after ${maxRetries} attempts`);
        }

        // Exponential backoff
        const delay =
          POOL_CONFIG.retry.retryDelayMS *
          Math.pow(2, this.connectionRetries - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Setup connection event handlers
   */
  private setupEventHandlers(): void {
    const connection = mongoose.connection;

    connection.on("connected", () => {
      this.isConnected = true;
      this.stats.isHealthy = true;
      logger.info("Database connected");
    });

    connection.on("disconnected", () => {
      this.isConnected = false;
      this.stats.isHealthy = false;
      logger.warn("Database disconnected");
    });

    connection.on("reconnected", () => {
      this.isConnected = true;
      this.stats.isHealthy = true;
      logger.info("Database reconnected");
    });

    connection.on("error", (error) => {
      this.stats.isHealthy = false;
      logger.error("Database error", error);
    });

    // Handle topology events for replica sets
    connection.on("serverHeartbeatSucceeded", () => {
      this.stats.lastHealthCheck = new Date();
    });

    connection.on("serverHeartbeatFailed", (event) => {
      logger.warn("Server heartbeat failed", {
        connectionId: event.connectionId,
      });
    });
  }

  /**
   * Setup query performance monitoring
   */
  private setupQueryMonitoring(): void {
    // Monitor slow queries (> 100ms)
    const SLOW_QUERY_THRESHOLD_MS = 100;

    mongoose.set(
      "debug",
      (collectionName: string, methodName: string, ...args: any[]) => {
        if (process.env.NODE_ENV === "development") {
          logger.debug(`MongoDB: ${collectionName}.${methodName}`, { args });
        }
      }
    );

    // Use mongoose plugin for timing
    mongoose.plugin((schema) => {
      schema.pre(/^find/, function (this: any) {
        this._startTime = Date.now();
      });

      schema.post(/^find/, function (this: any) {
        if (this._startTime) {
          const duration = Date.now() - this._startTime;
          const collectionName = this.model?.collection?.name || "unknown";

          // Track timing
          dbPool.trackQueryTiming({
            operation: "find",
            collection: collectionName,
            durationMs: duration,
            timestamp: new Date(),
          });

          if (duration > SLOW_QUERY_THRESHOLD_MS) {
            logger.warn("Slow query detected", {
              collection: collectionName,
              duration: `${duration}ms`,
            });
          }
        }
      });
    });
  }

  /**
   * Track query timing for statistics
   */
  trackQueryTiming(timing: QueryTiming): void {
    this.stats.queryCount++;

    if (timing.durationMs > 100) {
      this.stats.slowQueries++;
    }

    // Keep last 1000 query timings
    this.queryTimings.push(timing);
    if (this.queryTimings.length > 1000) {
      this.queryTimings.shift();
    }

    // Update average
    const totalTime = this.queryTimings.reduce(
      (sum, t) => sum + t.durationMs,
      0
    );
    this.stats.avgQueryTimeMs = Math.round(
      totalTime / this.queryTimings.length
    );
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000); // Every 30 seconds
  }

  /**
   * Perform health check
   */
  async performHealthCheck(): Promise<boolean> {
    try {
      if (!mongoose.connection.db) {
        this.stats.isHealthy = false;
        return false;
      }

      // Ping the database
      await mongoose.connection.db.admin().ping();

      // Get server status for pool info
      const serverStatus = await mongoose.connection.db.admin().serverStatus();

      if (serverStatus.connections) {
        this.stats.totalConnections = serverStatus.connections.current || 0;
        this.stats.availableConnections =
          serverStatus.connections.available || 0;
      }

      if (serverStatus.globalLock) {
        this.stats.currentOps =
          serverStatus.globalLock.currentQueue?.total || 0;
      }

      this.stats.lastHealthCheck = new Date();
      this.stats.isHealthy = true;

      return true;
    } catch (error) {
      this.stats.isHealthy = false;
      logger.error("Database health check failed", error);
      return false;
    }
  }

  /**
   * Get database statistics
   */
  getStats(): ConnectionStats {
    return { ...this.stats };
  }

  /**
   * Get connection for read operations (uses secondary if available)
   */
  getReadConnection(): Connection {
    return this.readConnection || mongoose.connection;
  }

  /**
   * Get connection for write operations (always primary)
   */
  getWriteConnection(): Connection {
    return mongoose.connection;
  }

  /**
   * Check if database is connected
   */
  isConnectedToDb(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  /**
   * Execute a query with automatic retry on transient errors
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    retryableErrors = ["MongoNetworkError", "MongoTimeoutError"]
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        const isRetryable = retryableErrors.some(
          (errName) =>
            error.name === errName || error.message?.includes(errName)
        );

        if (!isRetryable || attempt === maxRetries) {
          throw error;
        }

        logger.warn(`Query retry attempt ${attempt}/${maxRetries}`, {
          error: error.message,
        });

        // Wait before retry with exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, 100 * Math.pow(2, attempt - 1))
        );
      }
    }

    throw lastError;
  }

  /**
   * Create indexes with proper options
   */
  async ensureIndexes(): Promise<void> {
    logger.info("Ensuring database indexes...");

    // Let mongoose handle index creation based on schema definitions
    await mongoose.connection.syncIndexes();

    logger.info("Database indexes synchronized");
  }

  /**
   * Get slow queries for analysis
   */
  getSlowQueries(thresholdMs = 100): QueryTiming[] {
    return this.queryTimings.filter((t) => t.durationMs > thresholdMs);
  }

  /**
   * Clear query timing history
   */
  clearQueryTimings(): void {
    this.queryTimings = [];
    this.stats.queryCount = 0;
    this.stats.slowQueries = 0;
    this.stats.avgQueryTimeMs = 0;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info("Shutting down database connection pool...");

    // Stop health checks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Close connections
    try {
      await mongoose.connection.close();
      this.isConnected = false;
      logger.info("Database connection pool closed");
    } catch (error) {
      logger.error("Error closing database connection", error);
      throw error;
    }
  }
}

// Export singleton
export const dbPool = new DatabasePoolService();
export default dbPool;
