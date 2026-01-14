import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import config from "./config";
import routes from "./routes";
import { notFoundHandler, errorHandler } from "./middleware";
import { rateLimiter } from "./middleware/rateLimiter";
import {
  advancedCompression,
  simpleCompression,
} from "./middleware/compression";
import logger from "./utils/logger";

// Create Express application
const app: Application = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set("trust proxy", 1);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-Request-ID",
    ],
    exposedHeaders: [
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
      "Retry-After",
      "X-Request-ID",
    ],
  })
);

// Cookie parser (for HTTP-only refresh token cookies)
app.use(cookieParser());

// Body parsing (before compression)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Advanced compression with Brotli support
// Falls back to simpleCompression() if issues occur
if (config.env === "production") {
  app.use(advancedCompression());
} else {
  // Use simpler compression in development for faster response
  app.use(simpleCompression());
}

// Request logging
if (config.env !== "test") {
  app.use(
    morgan("combined", {
      stream: {
        write: (message: string) => logger.info(message.trim()),
      },
    })
  );
}

// Initialize rate limiter and apply middleware
// Note: Call rateLimiter.initialize() in index.ts before starting server
app.use("/api", rateLimiter.middleware());

// API routes
app.use(`/api/${config.apiVersion}`, routes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Team Collaboration Hub API",
    version: config.apiVersion,
    documentation: `/api/${config.apiVersion}/health`,
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
