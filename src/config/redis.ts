/**
 * Redis Configuration
 * Used for caching, sessions, and rate limiting
 * Design principle: Cache-aside pattern from DDIA
 */

import { RedisClientType, createClient } from 'redis';
import config from './index.js';
import logger from '../utils/logger.js';

let redisClient: RedisClientType | null = null;

/**
 * Initialize Redis connection
 * @returns {Promise<RedisClientType | null>}
 */
export async function initializeRedis(): Promise<RedisClientType | null> {
  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password,
    });

    redisClient.on('error', (err) => {
      logger.error('Redis error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.warn(`Redis connection failed. Continuing without caching. ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

/**
 * Get Redis client instance
 * @returns {RedisClientType | null}
 */
export function getRedisClient(): RedisClientType | null {
  return redisClient;
}

/**
 * Cache wrapper for async functions
 * Implements: Cache-aside pattern
 * @param {string} key - Cache key
 * @param {Function} fetchFunction - Function to execute if cache miss
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<any>}
 */
export async function cacheWrapper<T>(key: string, fetchFunction: () => Promise<T>, ttl = 3600): Promise<T> {
  const client = getRedisClient();

  if (!client) {
    return fetchFunction();
  }

  try {
    // Try to get from cache
    const cached = await client.get(key);
    if (cached) {
      logger.debug(`Cache hit: ${key}`);
      return JSON.parse(cached) as T;
    }

    // Cache miss - fetch and store
    logger.debug(`Cache miss: ${key}`);
    const result = await fetchFunction();
    await client.setEx(key, ttl, JSON.stringify(result));
    return result;
  } catch (error) {
    logger.error('Cache operation failed:', error);
    // Fallback to fetch function on cache error
    return fetchFunction();
  }
}

/**
 * Invalidate cache key
 * @param {string} key - Cache key to invalidate
 */
export async function invalidateCache(key: string): Promise<void> {
  const client = getRedisClient();
  if (client) {
    await client.del(key);
    logger.debug(`Cache invalidated: ${key}`);
  }
}

/**
 * Invalidate cache keys by pattern
 * @param {string} pattern - Cache key pattern
 */
export async function invalidateCacheByPattern(pattern: string): Promise<void> {
  const client = getRedisClient();
  if (client) {
    // Note: KEYS command can be slow in production, use with caution
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
      logger.debug(`Cache invalidated for pattern: ${pattern}, count: ${keys.length}`);
    }
  }
}
