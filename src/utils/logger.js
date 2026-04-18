/**
 * Winston Logger Configuration
 * ES Module version
 * Follows: Logging best practices from DDIA
 */

import winston from 'winston';
import 'winston-daily-rotate-file';
import config from './index.js';

// Log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Daily rotate file transport
const dailyRotateFile = new winston.transports.DailyRotateFile({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: config.logging.maxFiles,
  format: logFormat,
});

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  transports: [
    // Console output for all environments
    new winston.transports.Console({
      format: config.app.env === 'development' ? consoleFormat : logFormat,
    }),
  ],
});

// Add file transport in non-test environments
if (config.app.env !== 'test') {
  logger.add(dailyRotateFile);
}

// Create child logger for specific modules
export function createChildLogger(moduleName) {
  return logger.child({ module: moduleName });
}

// Stream interface for Morgan HTTP logger
export const stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

export default logger;
