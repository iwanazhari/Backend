/**
 * Application Configuration
 * ES Module version
 * Follows: Fail-fast principle from Pragmatic Programmer
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AppConfig {
  name: string;
  env: string;
  port: number;
  url: string;
  root: string;
}

export interface DatabaseConfig {
  url: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

export interface JwtConfig {
  secret: string;
  expire: string;
  refreshSecret: string;
  refreshExpire: string;
}

export interface PasetoConfig {
  secretKey: string;
  publicKey: string;
  expire: string;
  refreshExpire: string;
}

export interface LoggingConfig {
  level: string;
  maxFiles: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  global: {
    windowMs: number;
    maxRequests: number;
  };
  perUser: {
    windowMs: number;
    maxRequests: number;
  };
  perIp: {
    windowMs: number;
    maxRequests: number;
  };
  sensitive: {
    windowMs: number;
    maxRequests: number;
  };
}

export interface CorsConfig {
  origin: string[] | '*';
  origins: string[] | '*';
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  maxAge: number;
}

export interface UploadConfig {
  maxSize: number;
  path: string;
}

export interface ApiSecurityConfig {
  enabled: boolean;
  requireSignature: boolean;
  signatureHeader: string;
}

export interface RequestValidationConfig {
  enabled: boolean;
  strictMode: boolean;
}

export interface AuditConfig {
  enabled: boolean;
  logLevel: string;
}

export interface Config {
  app: AppConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  jwt: JwtConfig;
  paseto: PasetoConfig;
  logging: LoggingConfig;
  rateLimit: RateLimitConfig;
  cors: CorsConfig;
  upload: UploadConfig;
  apiSecurity: ApiSecurityConfig;
  requestValidation: RequestValidationConfig;
  audit: AuditConfig;
  validate: () => void;
}

const config: Config = {
  // Application settings
  app: {
    name: process.env.APP_NAME || 'Backend Starter Kit',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.APP_PORT || '3000', 10),
    url: process.env.APP_URL || 'http://localhost:3000',
    root: path.resolve(__dirname, '..'),
  },

  // Database settings (Prisma)
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/starter_kit_dev?schema=public',
  },

  // Redis settings
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

// JWT settings (deprecated, keeping for backward compatibility)
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expire: process.env.JWT_EXPIRE || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me-in-production',
    refreshExpire: process.env.JWT_REFRESH_EXPIRE || '30d',
  },

  // PASETO settings (preferred for security)
  paseto: {
    secretKey: process.env.PASETO_SECRET_KEY || 'change-me-in-production-32-bytes!',
    publicKey: process.env.PASETO_PUBLIC_KEY || '', // For V2 public (asymmetric)
    expire: process.env.PASETO_EXPIRE || '15m',
    refreshExpire: process.env.PASETO_REFRESH_EXPIRE || '7d',
  },

  // Logging settings
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    maxFiles: parseInt(process.env.LOG_FILE_MAX_FILES || '30', 10),
  },

  // Rate limiting settings
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    global: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },
    perUser: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_PER_USER || '50', 10),
    },
    perIp: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_PER_IP || '200', 10),
    },
    sensitive: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_SENSITIVE || '10', 10),
    },
  },

  // CORS settings
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    origins: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-API-Signature', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge: 86400,
  },

  // File upload settings
  upload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
    path: process.env.UPLOAD_PATH || './uploads',
  },

  // API Security settings
  apiSecurity: {
    enabled: process.env.API_SECURITY_ENABLED === 'true' || false,
    requireSignature: process.env.API_SECURITY_REQUIRE_SIGNATURE === 'true' || false,
    signatureHeader: process.env.API_SECURITY_SIGNATURE_HEADER || 'X-API-Signature',
  },

  // Request Validation settings
  requestValidation: {
    enabled: process.env.REQUEST_VALIDATION_ENABLED === 'true' || true,
    strictMode: process.env.REQUEST_VALIDATION_STRICT === 'true' || false,
  },

  // Audit settings
  audit: {
    enabled: process.env.AUDIT_ENABLED === 'true' || true,
    logLevel: process.env.AUDIT_LOG_LEVEL || 'info',
  },

  // Helper to validate required environment variables
  validate() {
    const required = ['PASETO_SECRET_KEY', 'DATABASE_URL'];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}. ` +
          'Please check your .env file.'
      );
    }

    // Warn if using default secrets in non-development environment
    if (
      this.app.env !== 'development' &&
      this.paseto.secretKey === 'change-me-in-production-32-bytes!'
    ) {
      console.warn(
        '⚠️  WARNING: Using default PASETO secret in production! ' +
          'This is a serious security vulnerability. Generate a secure key with: npm run generate:paseto-key'
      );
    }
  },
};

export default config;
