/**
 * Rate Limiting Service - Zero Trust
 * 
 * Prevents:
 * - Brute force attacks
 * - Credential stuffing
 * - API abuse
 * 
 * Uses Redis for distributed rate limiting
 */

import { getPrismaClient } from '../config/prisma.js';
import { TooManyRequestsError } from '../errors/index.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('rate-limiter');

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  lockoutDurationMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  lockoutDurationMs: 30 * 60 * 1000, // 30 minutes
};

class RateLimitService {
  private prisma = getPrismaClient();

  /**
   * Check and record login attempt
   * Throws TooManyRequestsError if limit exceeded
   */
  async checkLoginRateLimit(
    identifier: string, // email or IP
    config: RateLimitConfig = DEFAULT_CONFIG
  ): Promise<void> {
    const key = `login:${identifier}`;
    
    // Get or create rate limit record
    const record = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM rate_limits 
      WHERE key = ${key} 
      AND created_at > NOW() - INTERVAL '15 minutes'
      LIMIT 1
    `;

    if (record && record.length > 0) {
      const attempts = record[0].attempts || 0;
      
      if (attempts >= config.maxAttempts) {
        // Check if account is locked
        if (record[0].locked_until && new Date(record[0].locked_until) > new Date()) {
          const lockoutMinutes = Math.ceil(
            (new Date(record[0].locked_until).getTime() - Date.now()) / 60000
          );
          
          logger.warn('Account locked due to too many failed attempts', {
            identifier,
            lockoutMinutes,
          });
          
          throw new TooManyRequestsError(
            `Account locked. Try again in ${lockoutMinutes} minutes.`,
            'ACCOUNT_LOCKED'
          );
        }
        
        // Reset lock if expired
        await this.prisma.$executeRaw`
          UPDATE rate_limits 
          SET attempts = 0, locked_until = NULL 
          WHERE key = ${key} 
          AND locked_until < NOW()
        `;
      }
    }

    // Record attempt
    await this.prisma.$executeRaw`
      INSERT INTO rate_limits (key, attempts, created_at, updated_at)
      VALUES (${key}, 1, NOW(), NOW())
      ON CONFLICT (key) 
      DO UPDATE SET 
        attempts = rate_limits.attempts + 1,
        updated_at = NOW(),
        locked_until = CASE 
          WHEN rate_limits.attempts + 1 >= ${config.maxAttempts} 
          THEN NOW() + INTERVAL '${config.lockoutDurationMs / 60000} minutes'
          ELSE rate_limits.locked_until
        END
      WHERE key = ${key}
      AND created_at > NOW() - INTERVAL '15 minutes'
    `;

    logger.debug('Rate limit checked', { identifier, key });
  }

  /**
   * Reset rate limit after successful login
   */
  async resetLoginRateLimit(identifier: string): Promise<void> {
    const key = `login:${identifier}`;
    
    await this.prisma.$executeRaw`
      DELETE FROM rate_limits WHERE key = ${key}
    `;

    logger.debug('Rate limit reset', { identifier });
  }

  /**
   * Get remaining attempts for identifier
   */
  async getRemainingAttempts(
    identifier: string,
    maxAttempts: number = DEFAULT_CONFIG.maxAttempts
  ): Promise<number> {
    const key = `login:${identifier}`;
    
    const record = await this.prisma.$queryRaw<any[]>`
      SELECT attempts FROM rate_limits 
      WHERE key = ${key} 
      AND created_at > NOW() - INTERVAL '15 minutes'
      LIMIT 1
    `;

    if (!record || record.length === 0) {
      return maxAttempts;
    }

    return Math.max(0, maxAttempts - (record[0].attempts || 0));
  }

  /**
   * Check if account is locked
   */
  async isLocked(identifier: string): Promise<boolean> {
    const key = `login:${identifier}`;
    
    const record = await this.prisma.$queryRaw<any[]>`
      SELECT locked_until FROM rate_limits 
      WHERE key = ${key} 
      AND locked_until > NOW()
      LIMIT 1
    `;

    return record && record.length > 0;
  }
}

export default new RateLimitService();
export type RateLimitServiceType = RateLimitService;
