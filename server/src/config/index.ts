import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

interface Config {
  env: string;
  port: number;
  mongoUrl: string;
  jwt: {
    secret: string;
    refreshSecret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  redis: {
    host: string;
    port: number;
    password: string;
    tls: boolean;
  };
  email: {
    host: string;
    port: number;
    user: string;
    password: string;
    from: string;
  };
  frontendUrl: string;
  aws: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    s3: {
      bucket: string;
      region: string;
    };
    dynamodb: {
      tablePrefix: string;
    };
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  cors: {
    origin: string[];
  };
  logging: {
    level: string;
  };
  apiVersion: string;
}

const config: Config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),
  mongoUrl: process.env.MONGO_URL || "mongodb://localhost:27017/team_hub",
  jwt: {
    secret: process.env.JWT_SECRET || "default-jwt-secret-change-in-production",
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      "default-refresh-secret-change-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
  redis: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || "",
    tls: process.env.REDIS_TLS === "true",
  },
  email: {
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587", 10),
    user: process.env.EMAIL_USER || "",
    password: process.env.EMAIL_PASSWORD || "",
    from: process.env.EMAIL_FROM || "noreply@teamhub.com",
  },
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  aws: {
    region: process.env.AWS_REGION || "ap-south-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    s3: {
      bucket: process.env.AWS_S3_BUCKET || "team-hub-files",
      region: process.env.AWS_S3_REGION || "ap-south-1",
    },
    dynamodb: {
      tablePrefix: process.env.AWS_DYNAMODB_TABLE_PREFIX || "team_hub_",
    },
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  },
  cors: {
    origin: (
      process.env.CORS_ORIGIN ||
      "http://localhost:5173,http://localhost:3000,http://localhost:5002,http://localhost:5000"
    ).split(","),
  },
  logging: {
    level: process.env.LOG_LEVEL || "debug",
  },
  apiVersion: process.env.API_VERSION || "v1",
};

// Validate required configuration
const validateConfig = (): void => {
  const requiredEnvVars = ["MONGO_URL"];
  const missingVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

  if (missingVars.length > 0 && config.env === "production") {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }
};

validateConfig();

export default config;
