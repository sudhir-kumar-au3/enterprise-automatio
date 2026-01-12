/**
 * Security Configuration Module
 * Provides enterprise-grade security settings with validation
 */

import crypto from "crypto";

// Security constants
const MINIMUM_PASSWORD_LENGTH = 12;
const MINIMUM_JWT_SECRET_LENGTH = 32;
const BCRYPT_ROUNDS = 12;

interface SecurityConfig {
  password: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    maxAge: number; // days
    historyCount: number; // prevent reuse of last N passwords
  };
  jwt: {
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
    issuer: string;
    audience: string;
    algorithm: "HS256" | "HS384" | "HS512" | "RS256";
  };
  rateLimit: {
    auth: {
      windowMs: number;
      maxAttempts: number;
      blockDuration: number; // ms
    };
    api: {
      windowMs: number;
      maxRequests: number;
    };
  };
  session: {
    absoluteTimeout: number; // ms
    inactivityTimeout: number; // ms
  };
  cors: {
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    maxAge: number;
    credentials: boolean;
  };
  headers: {
    hsts: {
      maxAge: number;
      includeSubDomains: boolean;
      preload: boolean;
    };
    contentSecurityPolicy: string;
    referrerPolicy: string;
  };
  encryption: {
    algorithm: string;
    keyLength: number;
  };
}

// Validate environment secrets
function validateSecrets(): void {
  const env = process.env.NODE_ENV || "development";

  if (env === "production") {
    const requiredSecrets = [
      "JWT_SECRET",
      "JWT_REFRESH_SECRET",
      "MONGO_URL",
      "SESSION_SECRET",
    ];

    const missingSecrets = requiredSecrets.filter(
      (secret) => !process.env[secret]
    );

    if (missingSecrets.length > 0) {
      throw new Error(
        `SECURITY ERROR: Missing required secrets in production: ${missingSecrets.join(
          ", "
        )}`
      );
    }

    // Validate JWT secret strength
    if (
      process.env.JWT_SECRET &&
      process.env.JWT_SECRET.length < MINIMUM_JWT_SECRET_LENGTH
    ) {
      throw new Error(
        `SECURITY ERROR: JWT_SECRET must be at least ${MINIMUM_JWT_SECRET_LENGTH} characters`
      );
    }

    // Check for default/weak secrets
    const weakSecrets = ["secret", "password", "123456", "default"];
    if (
      weakSecrets.some(
        (weak) =>
          process.env.JWT_SECRET?.toLowerCase().includes(weak) ||
          process.env.JWT_REFRESH_SECRET?.toLowerCase().includes(weak)
      )
    ) {
      throw new Error(
        "SECURITY ERROR: JWT secrets contain weak/default values"
      );
    }
  }
}

// Generate secure random secret for development
function generateDevSecret(): string {
  return crypto.randomBytes(64).toString("hex");
}

// Get CSP directives
function getContentSecurityPolicy(): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Tighten in production
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.dicebear.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  return directives.join("; ");
}

// Validate on module load
validateSecrets();

export const securityConfig: SecurityConfig = {
  password: {
    minLength: MINIMUM_PASSWORD_LENGTH,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90, // Force password change every 90 days
    historyCount: 5, // Can't reuse last 5 passwords
  },
  jwt: {
    accessTokenExpiry: process.env.JWT_EXPIRES_IN || "15m", // Shorter for security
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    issuer: process.env.JWT_ISSUER || "team-hub",
    audience: process.env.JWT_AUDIENCE || "team-hub-client",
    algorithm: "HS512",
  },
  rateLimit: {
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxAttempts: 5, // 5 attempts per window
      blockDuration: 30 * 60 * 1000, // 30 min block after exceeding
    },
    api: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
    },
  },
  session: {
    absoluteTimeout: 24 * 60 * 60 * 1000, // 24 hours max session
    inactivityTimeout: 30 * 60 * 1000, // 30 min inactivity timeout
  },
  cors: {
    allowedOrigins: (
      process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:3000"
    ).split(","),
    allowedMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-CSRF-Token",
      "X-Request-ID",
    ],
    exposedHeaders: ["X-Request-ID", "X-RateLimit-Remaining"],
    maxAge: 86400, // 24 hours
    credentials: true,
  },
  headers: {
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    contentSecurityPolicy: getContentSecurityPolicy(),
    referrerPolicy: "strict-origin-when-cross-origin",
  },
  encryption: {
    algorithm: "aes-256-gcm",
    keyLength: 32,
  },
};

// Password validation helper
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const { password: config } = securityConfig;

  if (password.length < config.minLength) {
    errors.push(`Password must be at least ${config.minLength} characters`);
  }
  if (config.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (config.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (config.requireNumbers && !/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  if (config.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return { isValid: errors.length === 0, errors };
}

// Export constants for use elsewhere
export const BCRYPT_SALT_ROUNDS = BCRYPT_ROUNDS;

export default securityConfig;
