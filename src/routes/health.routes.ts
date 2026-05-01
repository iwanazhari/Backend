/**
 * Health Check Routes
 * For monitoring and load balancer health checks
 */

import { Router, Request, Response } from 'express';
import config from '../config/index.js';

const router = Router();

/**
 * GET /health
 * Basic health check
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * GET /health/ready
 * Readiness check - verifies all dependencies are available
 */
router.get('/ready', async (_req: Request, res: Response) => {
  const checks = {
    app: true,
    database: false,
    redis: false,
  };

  // Check database
  try {
    const { testConnection } = require('../models/index.js');
    await testConnection();
    checks.database = true;
  } catch (error) {
    checks.database = false;
  }

  // Check Redis
  try {
    const { getRedisClient } = require('../config/redis.js');
    const client = getRedisClient();
    if (client) {
      await client.ping();
      checks.redis = true;
    } else {
      checks.redis = true; // Redis is optional
    }
  } catch (error) {
    checks.redis = false;
  }

  const allHealthy = Object.values(checks).every((check) => check);
  const status = allHealthy ? 'ready' : 'not_ready';
  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json({
    status,
    checks,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/live
 * Liveness check - is the application running
 */
router.get('/live', (_req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/info
 * Application information
 */
router.get('/info', (_req: Request, res: Response) => {
  res.json({
    name: config.app.name,
    version: '1.0.0',
    environment: config.app.env,
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
  });
});

export default router;
