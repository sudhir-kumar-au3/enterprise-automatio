import app from "./app";
import config from "./config";
import connectDB from "./config/database";
import logger from "./utils/logger";
import { rateLimiter } from "./middleware/rateLimiter";
import { cacheService } from "./services/cache.service";

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
    // Connect to MongoDB
    await connectDB();

    // Initialize Redis-backed services
    await Promise.all([rateLimiter.initialize(), cacheService.initialize()]);
    logger.info("Redis services initialized (rate limiter, cache)");

    // Start Express server
    const server = app.listen(config.port, () => {
      logger.info(
        `🚀 Server running in ${config.env} mode on port ${config.port}`
      );
      logger.info(
        `📚 API available at http://localhost:${config.port}/api/${config.apiVersion}`
      );
      logger.info(
        `❤️  Health check at http://localhost:${config.port}/api/${config.apiVersion}/health`
      );
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        logger.info("HTTP server closed");

        // Cleanup Redis connections
        await Promise.all([rateLimiter.shutdown(), cacheService.shutdown()]);
        logger.info("Redis connections closed");

        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error(
          "Could not close connections in time, forcefully shutting down"
        );
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
