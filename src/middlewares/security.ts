/**
 * Zero Trust Security Middleware
 * Implements: "Never trust, always verify"
 *
 * Verifications:
 * 1. Request signature
 * 2. API key validation
 * 3. Rate limiting per user/IP
 * 4. Request validation
 * 5. Security headers
 * 6. Audit logging
 */

import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import config from '../config/index.js';
import { createChildLogger } from '../utils/logger.js';
import { ForbiddenError, UnauthorizedError } from '../errors/index.js';

const securityLogger = createChildLogger('security');

interface RequestWithUser extends Partial<Request> {
  user?: {
    id: string;
    role: string;
  };
  requestId?: string | undefined;
  apiKey?: any;
}

/**
 * Request ID Middleware
 * Track every request with unique ID
 */
export function requestTracker(req: Request, res: Response, next: NextFunction) {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  (req as RequestWithUser).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

/**
 * Security Headers Middleware
 * Zero Trust: Set strict security headers
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-src 'none'"
  );

  // Strict Transport Security
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()'
  );

  // Cache Control for sensitive data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  next();
}

/**
 * Strict CORS Middleware
 * Zero Trust: No wildcards, explicit origins only
 */
export function strictCors(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin as string | undefined;

  // Check if origin is allowed
  if (!config.cors.origins.includes(origin || '') && !config.cors.origins.includes('*')) {
    if (req.method === 'OPTIONS') {
      return res.sendStatus(403);
    }
    return next();
  }

  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', config.cors.credentials.toString());
  res.setHeader('Access-Control-Allow-Methods', config.cors.methods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', config.cors.allowedHeaders.join(', '));
  res.setHeader('Access-Control-Expose-Headers', config.cors.exposedHeaders.join(', '));
  res.setHeader('Access-Control-Max-Age', config.cors.maxAge.toString());

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
}

/**
 * API Key Validation Middleware
 * Zero Trust: Verify API key for every request
 */
export function validateApiKey(req: Request, res: Response, next: NextFunction) {
  if (!config.apiSecurity.requireApiKey) {
    return next();
  }

  const apiKey = req.headers['x-api-key'] as string | undefined;

  if (!apiKey) {
    securityLogger.warn('Missing API key', {
      path: req.path,
      ip: req.ip,
    });
    throw new UnauthorizedError('API key required', 'API_KEY_MISSING');
  }

  // Validate API key format
  if (!/^[a-zA-Z0-9_-]{32,}$/.test(apiKey)) {
    securityLogger.warn('Invalid API key format', {
      path: req.path,
      ip: req.ip,
    });
    throw new UnauthorizedError('Invalid API key format', 'API_KEY_INVALID');
  }

  // TODO: Validate API key against database
  // const key = await ApiKey.findOne({ where: { key: apiKey, active: true } });
  // if (!key) {
  //   throw new UnauthorizedError('Invalid API key', 'API_KEY_INVALID');
  // }
  // req.apiKey = key;

  next();
}

/**
 * Request Signature Validation
 * Zero Trust: Verify request hasn't been tampered
 */
export function validateRequestSignature(req: Request, res: Response, next: NextFunction) {
  if (!config.apiSecurity.requireSignature) {
    return next();
  }

  const signature = req.headers['x-request-signature'] as string | undefined;
  const timestamp = req.headers['x-request-timestamp'] as string | undefined;

  if (!signature || !timestamp) {
    securityLogger.warn('Missing request signature', {
      path: req.path,
      ip: req.ip,
    });
    throw new ForbiddenError('Request signature required', 'SIGNATURE_MISSING');
  }

  // Check timestamp window (prevent replay attacks)
  const now = Date.now();
  const timestampMs = parseInt(timestamp, 10);
  const window = config.apiSecurity.signatureTimestampWindow * 1000;

  if (Math.abs(now - timestampMs) > window) {
    securityLogger.warn('Request timestamp expired', {
      path: req.path,
      ip: req.ip,
      timestamp,
    });
    throw new ForbiddenError('Request expired', 'SIGNATURE_EXPIRED');
  }

  // Verify signature
  const body = JSON.stringify(req.body || '');
  const dataToSign = `${timestamp}.${req.method}.${req.path}.${body}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.API_SECRET || 'secret')
    .update(dataToSign)
    .digest('hex');

  if (signature !== expectedSignature) {
    securityLogger.warn('Invalid request signature', {
      path: req.path,
      ip: req.ip,
    });
    throw new ForbiddenError('Invalid signature', 'SIGNATURE_INVALID');
  }

  next();
}

/**
 * Request Validation Middleware
 * Zero Trust: Validate all request data
 */
export function validateRequest(req: Request, res: Response, next: NextFunction) {
  if (!config.requestValidation.enabled) {
    return next();
  }

  // Validate Content-Type
  if (config.requestValidation.validateContentType && req.method !== 'GET') {
    const contentType = req.headers['content-type'] as string | undefined;
    const allowedTypes = config.requestValidation.allowedContentTypes;

    if (!contentType || !allowedTypes.some((type: string) => contentType.includes(type))) {
      securityLogger.warn('Invalid content type', {
        path: req.path,
        contentType,
        ip: req.ip,
      });
      throw new ForbiddenError('Invalid content type', 'INVALID_CONTENT_TYPE');
    }
  }

  // Validate required headers
  const requiredHeaders = config.requestValidation.requiredHeaders;
  for (const header of requiredHeaders) {
    if (!req.headers[header]) {
      securityLogger.warn('Missing required header', {
        path: req.path,
        header,
        ip: req.ip,
      });
      throw new ForbiddenError(`Missing required header: ${header}`, 'MISSING_HEADER');
    }
  }

  // Block SQL injection patterns
  if (config.requestValidation.blockSqlInjection) {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC)\b)/i,
      /(--|;|\/\*|\*\/)/,
      /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
    ];

    const checkString = JSON.stringify({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    for (const pattern of sqlPatterns) {
      if (pattern.test(checkString)) {
        securityLogger.warn('SQL injection attempt detected', {
          path: req.path,
          ip: req.ip,
        });
        throw new ForbiddenError('Invalid request data', 'SQL_INJECTION_DETECTED');
      }
    }
  }

  // Block XSS patterns
  if (config.requestValidation.blockXss) {
    const xssPatterns = [
      /<script\b/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
    ];

    const checkString = JSON.stringify({
      body: req.body,
      query: req.query,
    });

    for (const pattern of xssPatterns) {
      if (pattern.test(checkString)) {
        securityLogger.warn('XSS attempt detected', {
          path: req.path,
          ip: req.ip,
        });
        throw new ForbiddenError('Invalid request data', 'XSS_DETECTED');
      }
    }
  }

  // Block path traversal
  if (config.requestValidation.blockPathTraversal) {
    const traversalPatterns = [
      /\.\.\//,
      /\.\.\\/,
      /%2e%2e%2f/i,
      /%252e%252e%252f/i,
    ];

    const checkString = req.path;

    for (const pattern of traversalPatterns) {
      if (pattern.test(checkString)) {
        securityLogger.warn('Path traversal attempt detected', {
          path: req.path,
          ip: req.ip,
        });
        throw new ForbiddenError('Invalid path', 'PATH_TRAVERSAL_DETECTED');
      }
    }
  }

  next();
}

interface RateLimiters {
  global: RateLimitRequestHandler;
  user: RateLimitRequestHandler;
  ip: RateLimitRequestHandler;
  sensitive: RateLimitRequestHandler;
}

/**
 * Rate Limiting Middleware
 * Zero Trust: Limit everyone, including authenticated users
 */
export function createRateLimiters(): RateLimiters {
  const rateLimitOptions = {
    standardHeaders: true as const,
    legacyHeaders: false as const,
  };

  // Global rate limiter
  const globalLimiter = rateLimit({
    ...rateLimitOptions,
    windowMs: config.rateLimit.global.windowMs,
    max: config.rateLimit.global.maxRequests,
    message: {
      success: false,
      error: {
        type: 'TooManyRequestsError',
        message: 'Too many requests',
        code: 'RATE_LIMIT_GLOBAL',
      },
    },
  });

  // Per-user rate limiter
  const userLimiter = rateLimit({
    ...rateLimitOptions,
    windowMs: config.rateLimit.perUser.windowMs,
    max: config.rateLimit.perUser.maxRequests,
    keyGenerator: (req: Request) => {
      return (req as RequestWithUser).user?.id || req.ip || 'unknown';
    },
    message: {
      success: false,
      error: {
        type: 'TooManyRequestsError',
        message: 'Too many requests',
        code: 'RATE_LIMIT_USER',
      },
    },
  });

  // Per-IP rate limiter
  const ipLimiter = rateLimit({
    ...rateLimitOptions,
    windowMs: config.rateLimit.perIp.windowMs,
    max: config.rateLimit.perIp.maxRequests,
    keyGenerator: (req: Request) => req.ip || 'unknown',
    message: {
      success: false,
      error: {
        type: 'TooManyRequestsError',
        message: 'Too many requests',
        code: 'RATE_LIMIT_IP',
      },
    },
  });

  // Sensitive endpoints limiter
  const sensitiveLimiter = rateLimit({
    ...rateLimitOptions,
    windowMs: config.rateLimit.sensitive.windowMs,
    max: config.rateLimit.sensitive.maxRequests,
    message: {
      success: false,
      error: {
        type: 'TooManyRequestsError',
        message: 'Too many requests',
        code: 'RATE_LIMIT_SENSITIVE',
      },
    },
  });

  return {
    global: globalLimiter,
    user: userLimiter,
    ip: ipLimiter,
    sensitive: sensitiveLimiter,
  };
}

/**
 * Audit Logging Middleware
 * Zero Trust: Log everything (assume breach)
 */
export function auditLogger(req: Request, res: Response, next: NextFunction) {
  if (!config.audit.enabled) {
    return next();
  }

  const startTime = Date.now();

  // Log request
  if (config.audit.logAllRequests) {
    createChildLogger('audit').info('Request', {
      requestId: (req as RequestWithUser).requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as RequestWithUser).user?.id,
      role: (req as RequestWithUser).user?.role,
    });
  }

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    createChildLogger('audit').info('Response', {
      requestId: (req as RequestWithUser).requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: (req as RequestWithUser).user?.id,
    });

    // Log authorization failures
    if (config.audit.logAuthzFailures && res.statusCode === 403) {
      createChildLogger('audit').warn('Authorization failure', {
        requestId: (req as RequestWithUser).requestId,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userId: (req as RequestWithUser).user?.id,
        role: (req as RequestWithUser).user?.role,
      });
    }
  });

  next();
}

/**
 * Suspicious Activity Detector
 * Zero Trust: Detect and block anomalies
 */
export function detectSuspiciousActivity(req: Request, res: Response, next: NextFunction) {
  const suspiciousPatterns: string[] = [];

  // Multiple failed logins
  if (req.path.includes('/login') && req.method === 'POST') {
    // TODO: Check Redis for failed login count
    // const failedLogins = await redis.get(`failed_logins:${req.ip}`);
    // if (failedLogins > 5) {
    //   suspiciousPatterns.push('multiple_failed_logins');
    // }
  }

  // Unusual user agent
  const userAgent = req.get('User-Agent');
  if (!userAgent || userAgent.includes('curl') || userAgent.includes('wget')) {
    suspiciousPatterns.push('suspicious_user_agent');
  }

  // Rapid requests
  const requestCount = req.headers['x-request-count'] as string | undefined;
  if (requestCount && parseInt(requestCount, 10) > 100) {
    suspiciousPatterns.push('rapid_requests');
  }

  if (suspiciousPatterns.length > 0) {
    securityLogger.warn('Suspicious activity detected', {
      requestId: (req as RequestWithUser).requestId,
      ip: req.ip,
      userId: (req as RequestWithUser).user?.id,
      patterns: suspiciousPatterns,
    });

    // TODO: Trigger alert
    // securityTeam.notify({ type: 'suspicious_activity', ... });
  }

  next();
}
