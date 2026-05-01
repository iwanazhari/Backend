/**
 * AuthBoilerplate Express Module
 *
 * Main entry point for Express.js integration
 *
 * Usage:
 * ```typescript
 * import { AuthBoilerplateExpress } from '@authboilerplate/express';
 *
 * const auth = new AuthBoilerplateExpress({
 *   pasetoSecretKey: process.env.PASETO_SECRET_KEY,
 *   // ... config
 * });
 *
 * app.use('/auth', auth.routes);
 * app.use(auth.middleware());
 * ```
 */

import { Router } from 'express';
import { AuthConfig, IRepository, IEmailProvider, ICacheProvider, ILogger } from '../../core/interfaces/index.js';
import { MagicLinkService } from '../../core/services/MagicLinkService.js';
import TokenService from '../../services/TokenService.js';
import { createAuthRoutes } from './ExpressAuthRoutes.js';
import { authMiddleware, optionalAuthMiddleware, authorizeRoles } from './ExpressAuthMiddleware.js';
import { ExpressAdapter } from './ExpressAdapter.js';

export interface AuthBoilerplateExpressOptions {
  // Required
  pasetoSecretKey: string;
  repository: IRepository;
  emailProvider: IEmailProvider;

  // Optional
  cacheProvider?: ICacheProvider;
  logger?: ILogger;
  
  // Configuration
  tokenExpiration?: number; // seconds (default: 900 = 15 min)
  refreshExpiration?: number; // days (default: 7)
  magicLinkExpiration?: number; // minutes (default: 15)
  callbackURL?: string;
}

export class AuthBoilerplateExpress {
  private magicLinkService: MagicLinkService;
  private config: AuthConfig;
  private routes: Router;

  constructor(options: AuthBoilerplateExpressOptions) {
    // Initialize configuration
    this.config = {
      pasetoSecretKey: options.pasetoSecretKey,
      tokenExpiration: options.tokenExpiration || 900,
      refreshExpiration: options.refreshExpiration || 7,
      magicLinkExpiration: options.magicLinkExpiration || 15,
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      requireEmailVerification: false,
      require2FA: false,
      maxConcurrentSessions: 5,
      logger: options.logger,
    };

    // Initialize services
    this.magicLinkService = new MagicLinkService(
      options.repository,
      options.emailProvider,
      TokenService,
      {
        cacheProvider: options.cacheProvider,
        logger: options.logger,
        magicLinkExpiration: options.magicLinkExpiration,
      }
    );

    // Initialize routes
    this.routes = createAuthRoutes({
      magicLinkService: this.magicLinkService,
      config: this.config,
      callbackURL: options.callbackURL,
    });
  }

  /**
   * Get Express router with all auth routes
   */
  getRoutes(): Router {
    return this.routes;
  }

  /**
   * Get authentication middleware
   */
  middleware = authMiddleware;

  /**
   * Get optional authentication middleware
   */
  optionalAuth = optionalAuthMiddleware;

  /**
   * Get role authorization middleware
   */
  authorize = authorizeRoles;

  /**
   * Get Magic Link service
   */
  getMagicLinkService(): MagicLinkService {
    return this.magicLinkService;
  }

  /**
   * Get Token service
   */
  getTokenService(): typeof TokenService {
    return TokenService;
  }

  /**
   * Get configuration
   */
  getConfig(): AuthConfig {
    return this.config;
  }
}

// Re-export commonly used items
export { ExpressAdapter } from './ExpressAdapter.js';
export { authMiddleware, optionalAuthMiddleware, authorizeRoles } from './ExpressAuthMiddleware.js';
export { createAuthRoutes } from './ExpressAuthRoutes.js';
export { MagicLinkService } from '../../core/services/MagicLinkService.js';

export default AuthBoilerplateExpress;
