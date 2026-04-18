/**
 * Global Type Definitions
 * ES Module + TypeScript
 */

import { User, Role, UserStatus } from '@prisma/client';

// Express Request augmentation
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: {
        id: string;
        email: string;
        role: Role;
        iat?: number;
        exp?: number;
      };
      apiKey?: {
        id: string;
        name: string;
        permissions: string[];
      };
      startTime: number;
    }
  }
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type PaginatedResponse<T> = {
  rows: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
};

export type AuthenticatedRequest = Express.Request & {
  user: NonNullable<Express.Request['user']>;
};

// Environment variables type
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      APP_NAME: string;
      APP_PORT: string;
      APP_URL: string;
      DATABASE_URL: string;
      REDIS_HOST: string;
      REDIS_PORT: string;
      REDIS_PASSWORD?: string;
      JWT_SECRET: string;
      JWT_EXPIRE: string;
      JWT_REFRESH_SECRET: string;
      JWT_REFRESH_EXPIRE: string;
      LOG_LEVEL: string;
      LOG_FILE_MAX_FILES: string;
      CORS_ORIGIN: string;
      PM2_INSTANCES: string;
      PM2_APP_NAME: string;
    }
  }
}

// Export empty to make this a module
export {};
