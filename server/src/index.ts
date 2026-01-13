import { createServer } from "http";
import app from "./app";
import config from "./config";
import connectDB from "./config/database";
import logger from "./utils/logger";
import { rateLimiter } from "./middleware/rateLimiter";
import { cacheService } from "./services/cache.service";
import { wsService } from "./services/websocket.service";
import { jobQueue } from "./services/jobQueue.service";

// Handle uncaught exceptions
process.on("uncaughtException", (error: Error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason: any) => {
  logger.error("Unhandled Rejection:", reason);
  process.exit(1);
});

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB with optimized settings
    await connectDB();

    // Initialize Redis-backed services in parallel
    await Promise.all([rateLimiter.initialize(), cacheService.initialize()]);
    logger.info("Redis services initialized (rate limiter, cache)");

    // Initialize job queue for background processing
    try {
      await jobQueue.initialize();
      logger.info("Job queue service initialized");
    } catch (error) {
      logger.warn(
        "Job queue initialization failed, running without background jobs",
        error
      );
    }

    // Create HTTP server for both Express and WebSocket
    const httpServer = createServer(app);

    // Initialize WebSocket service with Redis adapter for horizontal scaling
    try {
      await wsService.initialize(httpServer);
      logger.info("WebSocket service initialized with Redis adapter");
    } catch (error) {
      logger.warn(
        "WebSocket initialization failed, running without real-time features",
        error
      );
    }

    // Start HTTP server
    httpServer.listen(config.port, () => {
      logger.info(
        `🚀 Server running in ${config.env} mode on port ${config.port}`
      );
      logger.info(
        `📚 API available at http://localhost:${config.port}/api/${config.apiVersion}`
      );
      logger.info(
        `❤️  Health check at http://localhost:${config.port}/api/${config.apiVersion}/health`
      );
      logger.info(`🔌 WebSocket available at ws://localhost:${config.port}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);

      // Stop accepting new connections
      httpServer.close(async () => {
        logger.info("HTTP server closed");

        try {
          // Shutdown services in order
          await Promise.allSettled([
            wsService.shutdown(),
            jobQueue.shutdown(),
            rateLimiter.shutdown(),
            cacheService.shutdown(),
          ]);
          logger.info("All services shut down");
        } catch (error) {
          logger.error("Error during shutdown", error);
        }

        process.exit(0);
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error(
          "Could not close connections in time, forcefully shutting down"
        );
        process.exit(1);
      }, 30000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
