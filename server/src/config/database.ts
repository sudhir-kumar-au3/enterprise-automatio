import mongoose from "mongoose";
import config from "./index";
import logger from "../utils/logger";

// Connection options optimized for high traffic
const connectionOptions: mongoose.ConnectOptions = {
  // Connection Pool Settings - critical for scalability
  maxPoolSize: config.env === "production" ? 100 : 10, // Max connections in pool
  minPoolSize: config.env === "production" ? 10 : 2, // Min connections maintained

  // Timeouts
  serverSelectionTimeoutMS: 10000, // How long to try selecting a server
  socketTimeoutMS: 45000, // How long a socket can be inactive
  connectTimeoutMS: 30000, // How long to wait for initial connection

  // Write Concern for data integrity
  w: "majority", // Wait for majority of replicas
  retryWrites: true, // Retry failed writes
  retryReads: true, // Retry failed reads

  // Read Preference for scaling reads
  readPreference: "primaryPreferred", // Read from primary, fallback to secondary

  // Compression for network efficiency
  compressors: ["zlib", "snappy"],

  // Heartbeat to detect server issues quickly
  heartbeatFrequencyMS: 10000,

  // Auto-index in development only
  autoIndex: config.env !== "production",
};

// Connection state tracking
let isConnected = false;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAY_MS = 5000;

const connectDB = async (): Promise<void> => {
  try {
    // Set mongoose global options
    mongoose.set("strictQuery", true);

    // Enable debug mode in development
    if (config.env === "development") {
      mongoose.set(
        "debug",
        (collectionName: string, method: string, query: any) => {
          logger.debug(`Mongoose: ${collectionName}.${method}`, { query });
        }
      );
    }

    const conn = await mongoose.connect(config.mongoUrl, connectionOptions);
    isConnected = true;
    connectionAttempts = 0;

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    logger.info(`Database: ${conn.connection.name}`);
    logger.info(`Pool Size: ${connectionOptions.maxPoolSize}`);

    // Setup connection event handlers
    setupEventHandlers();

    // Setup connection monitoring
    setupMonitoring();
  } catch (error) {
    logger.error("Error connecting to MongoDB:", error);

    // Retry logic with exponential backoff
    if (connectionAttempts < MAX_RETRY_ATTEMPTS) {
      connectionAttempts++;
      const delay = RETRY_DELAY_MS * Math.pow(2, connectionAttempts - 1);
      logger.info(
        `Retrying connection in ${delay}ms (attempt ${connectionAttempts}/${MAX_RETRY_ATTEMPTS})`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
      return connectDB();
    }

    logger.error(`Failed to connect after ${MAX_RETRY_ATTEMPTS} attempts`);
    process.exit(1);
  }
};

const setupEventHandlers = (): void => {
  const connection = mongoose.connection;

  connection.on("error", (err) => {
    logger.error("MongoDB connection error:", err);
    isConnected = false;
  });

  connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected. Attempting to reconnect...");
    isConnected = false;
  });

  connection.on("reconnected", () => {
    logger.info("MongoDB reconnected");
    isConnected = true;
  });

  connection.on("close", () => {
    logger.info("MongoDB connection closed");
    isConnected = false;
  });

  // Handle process termination
  const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} received. Closing MongoDB connection...`);
    await mongoose.connection.close();
    logger.info("MongoDB connection closed through app termination");
  };

  process.once("SIGINT", () => gracefulShutdown("SIGINT"));
  process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
};

const setupMonitoring = (): void => {
  const connection = mongoose.connection;

  // Log pool statistics periodically in production
  if (config.env === "production") {
    setInterval(() => {
      const client = connection.getClient();
      if (client) {
        // Log connection pool stats
        logger.debug("MongoDB connection pool status", {
          isConnected,
          readyState: connection.readyState,
        });
      }
    }, 60000); // Every minute
  }

  // Monitor slow queries
  mongoose.plugin((schema) => {
    schema.pre(/^find/, function (this: any) {
      this._startTime = Date.now();
    });

    schema.post(/^find/, function (this: any) {
      if (this._startTime) {
        const duration = Date.now() - this._startTime;
        if (duration > 1000) {
          // Log queries taking > 1 second
          logger.warn(`Slow MongoDB query detected: ${duration}ms`, {
            collection: this.mongooseCollection?.name,
            operation: this.op,
          });
        }
      }
    });
  });
};

// Health check function for readiness probes
export const isDatabaseHealthy = async (): Promise<boolean> => {
  try {
    if (!isConnected) return false;

    // Ping the database
    await mongoose.connection.db?.admin().ping();
    return true;
  } catch {
    return false;
  }
};

// Get connection statistics
export const getConnectionStats = () => ({
  isConnected,
  readyState: mongoose.connection.readyState,
  host: mongoose.connection.host,
  name: mongoose.connection.name,
  poolSize: connectionOptions.maxPoolSize,
});

export default connectDB;
