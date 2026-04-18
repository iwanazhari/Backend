/**
 * Application Entry Point
 * ES Module version
 * Follows: Fail-fast principle, Single Responsibility
 */

import './utils/require-check.js';

import config from './config/index.js';
import logger from './utils/logger.js';
import { createApp } from './config/app.js';
import { connect as connectPrisma } from './config/prisma.js';
import { initializeRedis } from './config/redis.js';
import { setupWebSocket } from './config/websocket.js';
import { setupGlobalErrorHandlers } from './middlewares/errorHandler.js';

// Setup global error handlers
setupGlobalErrorHandlers();

/**
 * Start the application
 */
async function startApp() {
  const serverStartTime = Date.now();

  try {
    // Validate configuration
    config.validate();
    logger.info('Configuration validated');

    // Initialize database connection (Prisma)
    await connectPrisma();

    // Initialize Redis (optional)
    await initializeRedis();

    // Create Express app
    const app = createApp();

    // Create HTTP server
    const http = await import('http');
    const server = http.default.createServer(app);

    // Setup WebSocket
    setupWebSocket(server, app);

    // Start server
    server.listen(config.app.port, () => {
      const startupTime = Date.now() - serverStartTime;
      logger.info('🚀 Server is running', {
        http: `${config.app.url}`,
        websocket: `ws://${config.app.url.replace('http://', '')}`,
        docs: `${config.app.url}/api/docs`,
        health: `${config.app.url}/api/health`,
        environment: config.app.env,
        startupTime: `${startupTime}ms`,
        pid: process.pid,
      });
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Close WebSocket connections
          const io = app.get('io');
          if (io) {
            io.close();
            logger.info('WebSocket server closed');
          }

          // Close Redis connection
          const { getRedisClient } = await import('./config/redis.js');
          const redisClient = getRedisClient();
          if (redisClient) {
            await redisClient.quit();
          }

          // Close Prisma connection
          const { disconnect } = await import('./config/prisma.js');
          await disconnect();

          logger.info('All connections closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error.message);
          process.exit(1);
        }
      });

      // Force shutdown after timeout
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start application:', {
      type: error.constructor.name,
      message: error.message,
    });
    process.exit(1);
  }
}

// Start the application
startApp();
