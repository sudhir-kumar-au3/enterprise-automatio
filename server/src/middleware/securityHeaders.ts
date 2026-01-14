/**
 * Security Headers Middleware
 *
 * Applies comprehensive security headers using helmet and custom configurations
 * from security.config.ts. Provides enterprise-grade protection against:
 * - XSS attacks (Content-Security-Policy)
 * - Clickjacking (X-Frame-Options)
 * - MIME sniffing (X-Content-Type-Options)
 * - Protocol downgrade attacks (HSTS)
 * - Information leakage (various headers)
 */

import helmet from "helmet";
import { Request, Response, NextFunction, RequestHandler } from "express";
import { securityConfig } from "../config/security.config";
import logger from "../utils/logger";

/**
 * Parse CSP string into helmet-compatible directives object
 */
function parseCSPDirectives(cspString: string): Record<string, string[]> {
  const directives: Record<string, string[]> = {};

  cspString.split(";").forEach((directive) => {
    const trimmed = directive.trim();
    if (!trimmed) return;

    const parts = trimmed.split(/\s+/);
    const directiveName = parts[0];
    const values = parts.slice(1);

    // Convert directive name from kebab-case to camelCase for helmet
    const camelCase = directiveName.replace(/-([a-z])/g, (_, letter) =>
      letter.toUpperCase()
    );
    directives[camelCase] = values;
  });

  return directives;
}

/**
 * Create helmet middleware with security config settings
 */
export function createSecurityHeaders(): RequestHandler[] {
  const { headers } = securityConfig;
  const isProduction = process.env.NODE_ENV === "production";

  // Parse CSP directives from config
  const cspDirectives = parseCSPDirectives(headers.contentSecurityPolicy);

  // Main helmet configuration
  const helmetMiddleware = helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: cspDirectives.defaultSrc || ["'self'"],
        scriptSrc: cspDirectives.scriptSrc || ["'self'"],
        styleSrc: cspDirectives.styleSrc || ["'self'", "'unsafe-inline'"],
        imgSrc: cspDirectives.imgSrc || ["'self'", "data:", "https:"],
        fontSrc: cspDirectives.fontSrc || ["'self'", "data:"],
        connectSrc: cspDirectives.connectSrc || ["'self'"],
        frameAncestors: cspDirectives.frameAncestors || ["'none'"],
        baseUri: cspDirectives.baseUri || ["'self'"],
        formAction: cspDirectives.formAction || ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: isProduction ? [] : null,
      },
      reportOnly: false,
    },

    // HTTP Strict Transport Security
    strictTransportSecurity: {
      maxAge: headers.hsts.maxAge,
      includeSubDomains: headers.hsts.includeSubDomains,
      preload: headers.hsts.preload,
    },

    // Referrer Policy
    referrerPolicy: {
      policy: headers.referrerPolicy as "strict-origin-when-cross-origin",
    },

    // X-Frame-Options - Prevent clickjacking
    frameguard: {
      action: "deny",
    },

    // X-Content-Type-Options - Prevent MIME sniffing
    noSniff: true,

    // X-XSS-Protection - Legacy XSS protection (disabled in modern browsers, but good for older ones)
    xssFilter: true,

    // X-DNS-Prefetch-Control
    dnsPrefetchControl: {
      allow: false,
    },

    // X-Download-Options (IE specific)
    ieNoOpen: true,

    // X-Permitted-Cross-Domain-Policies
    permittedCrossDomainPolicies: {
      permittedPolicies: "none",
    },

    // Hide X-Powered-By header
    hidePoweredBy: true,

    // Cross-Origin-Embedder-Policy
    crossOriginEmbedderPolicy: false, // Disable if using external resources

    // Cross-Origin-Opener-Policy
    crossOriginOpenerPolicy: {
      policy: "same-origin",
    },

    // Cross-Origin-Resource-Policy
    crossOriginResourcePolicy: {
      policy: "same-origin",
    },

    // Origin-Agent-Cluster
    originAgentCluster: true,
  });

  // Custom security headers middleware
  const customHeaders: RequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    // Add additional security headers not covered by helmet

    // Permissions Policy (formerly Feature-Policy)
    res.setHeader(
      "Permissions-Policy",
      "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
    );

    // Cache-Control for sensitive endpoints
    if (req.path.includes("/auth") || req.path.includes("/user")) {
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate"
      );
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Surrogate-Control", "no-store");
    }

    // Add request ID for tracing
    const requestId = req.headers["x-request-id"] || generateRequestId();
    res.setHeader("X-Request-ID", requestId);

    // Security logging for monitoring
    if (isProduction) {
      logger.debug("Security headers applied", {
        path: req.path,
        method: req.method,
        requestId,
        ip: req.ip,
      });
    }

    next();
  };

  return [helmetMiddleware, customHeaders];
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Middleware to add security headers for API responses
 */
export const apiSecurityHeaders: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Prevent caching of API responses with sensitive data
  res.setHeader(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  // Ensure JSON content type for API responses
  res.setHeader("X-Content-Type-Options", "nosniff");

  next();
};

/**
 * Export default security headers middleware
 */
export const securityHeaders = createSecurityHeaders();

export default securityHeaders;
