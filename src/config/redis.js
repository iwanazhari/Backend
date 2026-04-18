/**
 * Redis Configuration
 * Used for caching, sessions, and rate limiting
 * Design principle: Cache-aside pattern from DDIA
 */

const Redis = require('redis');
const config = require('./index');
const logger = require('../utils/logger');

let redisClient = null;

/**
 * Initialize Redis connection
 * @returns {Promise<RedisClient>}
 */
async function initializeRedis() {
  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = Redis.createClient({
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
    logger.warn('Redis connection failed. Continuing without caching.', error.message);
    return null;
  }
}

/**
 * Get Redis client instance
 * @returns {RedisClient|null}
 */
function getRedisClient() {
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
async function cacheWrapper(key, fetchFunction, ttl = 3600) {
  const client = getRedisClient();

  if (!client) {
    return fetchFunction();
  }

  try {
    // Try to get from cache
    const cached = await client.get(key);
    if (cached) {
      logger.debug(`Cache hit: ${key}`);
      return JSON.parse(cached);
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
async function invalidateCache(key) {
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
async function invalidateCacheByPattern(pattern) {
  const client = getRedisClient();
  if (client) {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
      logger.debug(`Cache invalidated for pattern: ${pattern}, count: ${keys.length}`);
    }
  }
}

module.exports = {
  initializeRedis,
  getRedisClient,
  cacheWrapper,
  invalidateCache,
  invalidateCacheByPattern,
};
