/**
 * Auth Rate Limiter - Zero Trust Protection
 * 
 * Prevents:
 * - Brute force attacks
 * - Credential stuffing
 * - Distributed attacks (per-email limiting)
 */

import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request } from 'express';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('rate-limiter');

/**
 * Strict rate limiter untuk login
 * Zero Trust: Assume every login attempt could be an attack
 */
export const loginRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 attempts per window
  message: {
    success: false,
    error: {
      type: 'TooManyRequestsError',
      message: 'Too many login attempts. Please try again after 15 minutes.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  
  // Zero Trust: Rate limit by email (prevent distributed brute force)
  keyGenerator: (req: Request): string => {
    const email = (req.body.email as string)?.toLowerCase().trim();
    const ip = req.get('X-Forwarded-For')?.split(',')[0] || req.ip;
    
    // Combine email + IP untuk protection lebih kuat
    return email ? `login:${email}` : `login:ip:${ip}`;
  },

  // Log rate limit hits untuk security monitoring
  handler: async (req, res) => {
    const email = req.body.email || 'unknown';
    const ip = req.get('X-Forwarded-For')?.split(',')[0] || req.ip;
    
    logger.warn(`Rate limit hit for login attempt`, {
      email,
      ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
    });

    // Audit ke database (optional, untuk security monitoring)
    try {
      const { getPrismaClient } = await import('../config/prisma.js');
      const prisma = getPrismaClient();
      await prisma.securityAudit.create({
        data: {
          eventType: 'RATE_LIMIT_HIT',
          eventLevel: 'WARN',
          userId: null,
          ipAddress: ip,
          userAgent: req.get('User-Agent'),
          path: '/api/auth/login',
          method: 'POST',
          metadata: {
            email,
            reason: 'TOO_MANY_LOGIN_ATTEMPTS',
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      // Ignore audit errors
    }

    res.status(429).json({
      success: false,
      error: {
        type: 'TooManyRequestsError',
        message: 'Too many login attempts. Please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: 900, // 15 minutes in seconds
      },
    });
  },
});

/**
 * Rate limiter untuk register
 * Prevent account creation abuse
 */
export const registerRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 registrations per hour
  message: {
    success: false,
    error: {
      type: 'TooManyRequestsError',
      message: 'Too many registration attempts.',
      code: 'REGISTER_RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  
  keyGenerator: (req: Request): string => {
    const email = (req.body.email as string)?.toLowerCase().trim();
    const ip = req.get('X-Forwarded-For')?.split(',')[0] || req.ip;
    
    return email ? `register:${email}` : `register:ip:${ip}`;
  },
});

/**
 * Rate limiter untuk refresh token
 * More lenient karena user sudah authenticated
 */
export const refreshRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Max 10 refreshes per 5 minutes
  message: {
    success: false,
    error: {
      type: 'TooManyRequestsError',
      message: 'Too many token refresh attempts.',
      code: 'REFRESH_RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  
  keyGenerator: (req: Request): string => {
    const ip = req.get('X-Forwarded-For')?.split(',')[0] || req.ip;
    return `refresh:ip:${ip}`;
  },
});
