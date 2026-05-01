/**
 * Express Auth Routes
 *
 * Provides ready-to-use Express routes for authentication
 * Uses ExpressAdapter to work with framework-agnostic core services
 *
 * Usage:
 * ```typescript
 * import { authRoutes } from '@authboilerplate/express';
 * app.use('/auth', authRoutes);
 * ```
 */

import { Router } from 'express';
import { ExpressAdapter } from './ExpressAdapter.js';
import { MagicLinkService } from '../../core/services/MagicLinkService.js';
import { AuthConfig } from '../../core/interfaces/index.js';

export interface ExpressAuthRoutesOptions {
  magicLinkService: MagicLinkService;
  config: Partial<AuthConfig>;
  callbackURL?: string;
}

export function createAuthRoutes(options: ExpressAuthRoutesOptions): Router {
  const router = Router();
  const { magicLinkService, callbackURL } = options;

  /**
   * POST /auth/magic-link/request
   * Request magic link for passwordless login
   *
   * Body: { email: string }
   */
  router.post('/magic-link/request', async (req, res) => {
    try {
      const adapter = new ExpressAdapter(req, res);
      const result = await magicLinkService.requestMagicLink(adapter, {
        email: req.body.email,
        callbackURL: req.body.callbackURL || callbackURL,
      });

      if (result.success) {
        res.status(200).json(result.data);
      } else {
        res.status(400).json(result.error);
      }
    } catch (error) {
      res.status(500).json({
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
   * Verify magic link and login
   *
   * Query: { token: string }
   */
  router.get('/magic-link/verify', async (req, res) => {
    try {
      const adapter = new ExpressAdapter(req, res);
      const result = await magicLinkService.verifyMagicLink(adapter, {
        token: req.query.token as string,
      });

      if (result.success) {
        // Set cookies
        res.cookie('accessToken', result.data.tokens.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 15 * 60 * 1000, // 15 minutes
        });

        res.cookie('refreshToken', result.data.tokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        // Redirect to dashboard or callback URL
        const redirectTo = req.query.redirect || '/dashboard';
        res.redirect(redirectTo as string);
      } else {
        // Redirect to login with error
        const errorCode = result.error?.code || 'UNKNOWN_ERROR';
        res.redirect(`/login?error=${errorCode}`);
      }
    } catch (error) {
      res.redirect(`/login?error=INTERNAL_ERROR`);
    }
  });

  return router;
}

export default createAuthRoutes;
