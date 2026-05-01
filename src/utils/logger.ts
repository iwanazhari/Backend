/**
 * Winston Logger Configuration
 * ES Module version
 * Follows: Logging best practices from DDIA
 */

import winston from 'winston';
import 'winston-daily-rotate-file';

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
  maxFiles: 30,
  format: logFormat,
});

// Create main logger instance
const mainLogger = winston.createLogger({
  level: 'debug',
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'test' ? logFormat : consoleFormat,
    }),
  ],
});

// Add file transport in non-test environments
if (process.env.NODE_ENV !== 'test') {
  mainLogger.add(dailyRotateFile);
}

// Create child logger for specific modules
export function createChildLogger(moduleName: string): winston.Logger {
  return mainLogger.child({ module: moduleName });
}

// Stream interface for Morgan HTTP logger
export const stream = {
  write: (message: string) => {
    mainLogger.info(message.trim());
  },
};

export default mainLogger;
