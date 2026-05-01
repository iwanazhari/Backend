/**
 * Fastify Auth Plugin
 *
 * Provides authentication as a Fastify plugin
 * Uses Fastify's hook system and plugin architecture
 *
 * Usage:
 * ```typescript
 * import authPlugin from '@authboilerplate/fastify';
 *
 * fastify.register(authPlugin, {
 *   pasetoSecretKey: process.env.PASETO_SECRET_KEY,
 *   // ... config
 * });
 * ```
 */

import { FastifyPluginCallback, FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { FastifyAdapter } from './FastifyAdapter.js';
import { MagicLinkService } from '../../core/services/MagicLinkService.js';
import TokenService from '../../services/TokenService.js';
import {
  AuthConfig,
  IRepository,
  IEmailProvider,
  ICacheProvider,
  ILogger,
} from '../../core/interfaces/index.js';

export interface FastifyAuthOptions {
  // Required
  pasetoSecretKey: string;
  repository: IRepository;
  emailProvider: IEmailProvider;

  // Optional
  cacheProvider?: ICacheProvider;
  logger?: ILogger;

  // Configuration
  tokenExpiration?: number;
  refreshExpiration?: number;
  magicLinkExpiration?: number;
  callbackURL?: string;

  // Plugin options
  prefix?: string; // Route prefix (default: '/auth')
}

/**
 * Decorate FastifyRequest with user
 */
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      role: string;
      jti: string;
    };
  }
}

/**
 * Auth Plugin
 */
const authPlugin: FastifyPluginCallback<FastifyAuthOptions> = async (fastify, options) => {
  const {
    pasetoSecretKey,
    repository,
    emailProvider,
    cacheProvider,
    logger = console,
    magicLinkExpiration = 15,
    callbackURL,
  } = options;

  // Initialize Magic Link Service
  const magicLinkService = new MagicLinkService(
    repository,
    emailProvider,
    TokenService,
    {
      cacheProvider,
      logger,
      magicLinkExpiration,
    },
  );

  /**
   * POST /auth/magic-link/request
   */
  fastify.post('/magic-link/request', async (request, reply) => {
    try {
      const adapter = new FastifyAdapter(request, reply);
      const body = request.body as any;

      const result = await magicLinkService.requestMagicLink(adapter, {
        email: body.email,
        callbackURL: body.callbackURL || callbackURL,
      });

      if (result.success) {
        return reply.code(200).send(result.data);
      } else {
        return reply.code(400).send(result.error);
      }
    } catch (error) {
      logger.error('Magic link request failed', { error });
      return reply.code(500).send({
        success: false,
        error: {
          type: 'InternalServerError',
          message: 'Failed to process request',
          code: 'INTERNAL_ERROR',
        },
      });
    }
  });

  /**
   * GET /auth/magic-link/verify
   */
  fastify.get('/magic-link/verify', async (request, reply) => {
    try {
      const adapter = new FastifyAdapter(request, reply);
      const query = request.query as any;

      const result = await magicLinkService.verifyMagicLink(adapter, {
        token: query.token as string,
      });

      if (result.success) {
        // Set cookies
        reply.setCookie('accessToken', result.data.tokens.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 15 * 60 * 1000, // 15 minutes
          path: '/',
        });

        reply.setCookie('refreshToken', result.data.tokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          path: '/',
        });

        // Redirect
        const redirectTo = (query.redirect as string) || '/dashboard';
        return reply.redirect(redirectTo);
      } else {
        const errorCode = result.error?.code || 'UNKNOWN_ERROR';
        return reply.redirect(`/login?error=${errorCode}`);
      }
    } catch (error) {
      logger.error('Magic link verify failed', { error });
      return reply.redirect('/login?error=INTERNAL_ERROR');
    }
  });

  // Decorate fastify instance with auth utilities
  fastify.decorate('auth', {
    magicLinkService,
    tokenService: TokenService,
  });
};

/**
 * Authentication Hook (Decorator)
 *
 * Usage:
 * fastify.get('/protected', {
 *   preHandler: [authHook()]
 * }, async (req, reply) => { ... });
 */
export function authHook(options?: { roles?: string[]; optional?: boolean }) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const token = extractToken(request);

    if (!token) {
      if (options?.optional) {
        return;
      }
      return reply.code(401).send({
        success: false,
        error: {
          type: 'UnauthorizedError',
          message: 'No token provided',
          code: 'TOKEN_REQUIRED',
        },
      });
    }

    try {
      const user = await TokenService.extractUser(token);
      request.user = user;

      // Check roles
      if (options?.roles && options.roles.length > 0) {
        if (!options.roles.includes(user.role)) {
          return reply.code(403).send({
            success: false,
            error: {
              type: 'ForbiddenError',
              message: 'Insufficient permissions',
              code: 'INSUFFICIENT_PERMISSIONS',
            },
          });
        }
      }
    } catch (error) {
      if (options?.optional) {
        return;
      }
      return reply.code(401).send({
        success: false,
        error: {
          type: 'UnauthorizedError',
          message: 'Invalid or expired token',
          code: 'TOKEN_INVALID',
        },
      });
    }
  };
}

/**
 * Extract token from request
 */
function extractToken(request: FastifyRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookies
  return (request.cookies as any)?.accessToken || null;
}

/**
 * Optional Auth Hook
 */
export function optionalAuthHook() {
  return authHook({ optional: true });
}

/**
 * Role-based Authorization Hook
 */
export function authorizeRoles(...roles: string[]) {
  return authHook({ roles });
}

// Export as default
export default authPlugin;
