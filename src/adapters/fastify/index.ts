/**
 * AuthBoilerplate Fastify Module
 *
 * Main entry point for Fastify integration
 *
 * Usage:
 * ```typescript
 * import Fastify from 'fastify';
 * import authPlugin from '@authboilerplate/fastify';
 *
 * const fastify = Fastify();
 *
 * fastify.register(authPlugin, {
 *   pasetoSecretKey: process.env.PASETO_SECRET_KEY,
 *   repository: prismaRepository,
 *   emailProvider: nodemailerProvider,
 *   prefix: '/auth',
 * });
 * ```
 */

// Plugin
export { default, authPlugin, authHook, optionalAuthHook, authorizeRoles } from './FastifyAuthPlugin.js';
export type { FastifyAuthOptions } from './FastifyAuthPlugin.js';

// Adapter
export { FastifyAdapter } from './FastifyAdapter.js';

// Services (re-exported)
export { MagicLinkService } from '../../core/services/MagicLinkService.js';
export { TokenService } from '../../services/TokenService.js';

// Interfaces (re-exported for type hints)
export type {
  AuthConfig,
  IRepository,
  IEmailProvider,
  ICacheProvider,
  ILogger,
  CookieOptions,
} from '../../core/interfaces/index.js';

/**
 * Quick Setup Guide
 *
 * 1. Install dependencies:
 *    npm install fastify @fastify/cookie @fastify/cors
 *
 * 2. Register plugin:
 *    fastify.register(authPlugin, {
 *      pasetoSecretKey: config.PASETO_SECRET_KEY,
 *      repository: prismaRepository,
 *      emailProvider: nodemailerProvider,
 *      prefix: '/auth',
 *    });
 *
 * 3. Use hooks:
 *    fastify.get('/protected', {
 *      preHandler: [authHook()]
 *    }, async (req, reply) => {
 *      return req.user;
 *    });
 *
 * 4. Use roles:
 *    fastify.get('/admin', {
 *      preHandler: [authorizeRoles('ADMIN')]
 *    }, async (req, reply) => {
 *      return { message: 'Admin access' };
 *    });
 */

export default authPlugin;
