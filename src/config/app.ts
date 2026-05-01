/**
 * Express Application Setup
 * Zero Trust Architecture:
 * - Never trust, always verify
 * - Least privilege access
 * - Assume breach
 */

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import config from './index.js';
import securityConfig from './security.js';
import logger from '../utils/logger.js';
import { errorHandler } from '../middlewares/errorHandler.js';
import { notFoundHandler } from '../middlewares/notFoundHandler.js';
import { requestLogger } from '../middlewares/requestLogger.js';

// Zero Trust Security Middlewares
import {
  requestTracker,
  securityHeaders,
  strictCors,
  validateApiKey,
  validateRequestSignature,
  validateRequest,
  createRateLimiters,
  auditLogger,
  detectSuspiciousActivity,
} from '../middlewares/security.js';

// Import routes
import healthRoutes from '../routes/health.routes.js';
import authRoutes from '../routes/auth.routes.js';
import userRoutes from '../routes/user.routes.js';

// Import Swagger
let swaggerDocument: any = null;
try {
  swaggerDocument = require('../docs/swagger.json');
} catch (error) {
  logger.warn('Swagger documentation not available. Run: npm run swagger:generate');
}

// Create rate limiters
const rateLimiters = createRateLimiters();

/**
 * Create and configure Express application
 * Zero Trust: Every middleware verifies requests
 * @returns {Application}
 */
export function createApp(): Application {
  const app = express();

  // ============================================
  // ZERO TRUST SECURITY LAYER
  // ============================================

  // 1. Track every request (never trust - always log)
  app.use(requestTracker);

  // 2. Security headers (protect against attacks)
  app.use(securityHeaders);

  // 3. Strict CORS (no wildcards)
  app.use(strictCors);

  // 4. Global rate limiting (limit everyone)
  app.use(rateLimiters.global);

  // 5. Audit logging (assume breach - log everything)
  app.use(auditLogger);

  // ============================================
  // STANDARD MIDDLEWARE
  // ============================================

  // Security headers (additional)
  app.use(helmet());

  // Body parsing with size limits
  app.use(express.json({
    limit: securityConfig.requestValidation.maxJsonSize,
  }));
  app.use(express.urlencoded({
    extended: true,
    limit: securityConfig.requestValidation.maxBodySize,
  }));

  // Compression
  app.use(compression());

  // Request logging
  if (config.app.env !== 'test') {
    app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
  }

  // 6. Request validation (verify all input)
  app.use(validateRequest);

  // 7. API key validation (verify all API consumers)
  app.use(validateApiKey);

  // 8. Request signature (prevent tampering)
  app.use(validateRequestSignature);

  // 9. Suspicious activity detection
  app.use(detectSuspiciousActivity);

  // ============================================
  // API DOCUMENTATION (Swagger)
  // ============================================
  if (swaggerDocument) {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    // Serve raw swagger JSON
    app.use('/api/docs.json', (_req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerDocument);
    });
  }

  // ============================================
  // API ROUTES
  // ============================================

  // Health checks (public, but rate limited)
  app.use('/api/health', healthRoutes);

  // Authentication routes (public, but strict rate limit)
  app.use('/api/auth', rateLimiters.sensitive, authRoutes);

  // User management (authenticated, per-user rate limit)
  app.use('/api/users', rateLimiters.user, userRoutes);

  // TODO: Mount your custom routes here
  // All routes automatically get:
  // - Request tracking
  // - Rate limiting
  // - Audit logging
  // - Request validation
  // app.use('/api/products', rateLimiters.user, productRoutes);

  // Root endpoint
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: config.app.name,
      version: '3.0.0',
      environment: config.app.env,
      timestamp: new Date().toISOString(),
      docs: '/api/docs',
      health: '/api/health',
      security: {
        zeroTrust: true,
        rateLimit: 'enabled',
        audit: 'enabled',
      },
    });
  });

  // WebSocket info endpoint
  app.get('/api/websocket-info', (_req: Request, res: Response) => {
    const { getOnlineCount } = require('../config/websocket.js');
    res.json({
      websocket: {
        enabled: true,
        endpoint: `ws://${config.app.url.replace('http://', '')}`,
        onlineCount: getOnlineCount(),
        path: '/socket.io/',
        security: {
          authentication: 'JWT required',
          encryption: 'TLS',
        },
      },
    });
  });

  // ============================================
  // ERROR HANDLING
  // ============================================

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}
