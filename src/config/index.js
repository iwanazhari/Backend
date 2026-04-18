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

export default {
  // Application settings
  app: {
    name: process.env.APP_NAME || 'Backend Starter Kit',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.APP_PORT, 10) || 3000,
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
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // JWT settings
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expire: process.env.JWT_EXPIRE || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me-in-production',
    refreshExpire: process.env.JWT_REFRESH_EXPIRE || '30d',
  },

  // Logging settings
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    maxFiles: parseInt(process.env.LOG_FILE_MAX_FILES, 10) || 30,
  },

  // Rate limiting settings
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  // CORS settings
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  },

  // File upload settings
  upload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024,
    path: process.env.UPLOAD_PATH || './uploads',
  },

  // Helper to validate required environment variables
  validate() {
    const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'];
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
      (this.jwt.secret === 'change-me-in-production' ||
        this.jwt.refreshSecret === 'change-me-in-production')
    ) {
      console.warn(
        '⚠️  WARNING: Using default JWT secrets in production! ' +
          'This is a serious security vulnerability.'
      );
    }
  },
};
