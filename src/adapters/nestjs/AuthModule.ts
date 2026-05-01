/**
 * NestJS Auth Module
 *
 * Provides authentication as a NestJS module with dependency injection
 *
 * Usage:
 * ```typescript
 * // app.module.ts
 * @Module({
 *   imports: [
 *     AuthModule.forRoot({
 *       pasetoSecretKey: configService.get('PASETO_SECRET_KEY'),
 *       // ... config
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */

import {
  Module,
  DynamicModule,
  Global,
  Provider,
  ExecutionContext,
  CanActivate,
  Injectable,
  Inject,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard, createAuthGuard, NestJSAdapter } from './NestJSAdapter.js';
import { MagicLinkService } from '../../core/services/MagicLinkService.js';
import TokenService from '../../services/TokenService.js';
import {
  AuthConfig,
  IRepository,
  IEmailProvider,
  ICacheProvider,
  ILogger,
} from '../../core/interfaces/index.js';

/**
 * Module configuration options
 */
export interface AuthModuleOptions {
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

  // Module options
  global?: boolean;
  enableGuard?: boolean;
}

/**
 * Auth service for NestJS controllers
 */
@Injectable()
export class AuthService {
  private magicLinkService: MagicLinkService;
  private config: AuthConfig;

  constructor(
    repository: IRepository,
    emailProvider: IEmailProvider,
    cacheProvider?: ICacheProvider,
    logger?: ILogger,
  ) {
    this.config = {
      pasetoSecretKey: process.env.PASETO_SECRET_KEY || '',
      tokenExpiration: 900,
      refreshExpiration: 7,
      magicLinkExpiration: 15,
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      requireEmailVerification: false,
      require2FA: false,
      maxConcurrentSessions: 5,
      logger,
    };

    this.magicLinkService = new MagicLinkService(
      repository,
      emailProvider,
      TokenService,
      {
        cacheProvider,
        logger,
        magicLinkExpiration: this.config.magicLinkExpiration,
      },
    );
  }

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

/**
 * Auth Controller (provides default routes)
 */
@Injectable()
export class AuthController {
  constructor(
    private authService: AuthService,
  ) {}

  /**
   * Request magic link
   */
  async requestMagicLink(body: { email: string; callbackURL?: string }) {
    const adapter = new NestJSAdapter(
      this.getContextRequest(),
      this.getContextResponse(),
    );

    return this.authService.getMagicLinkService().requestMagicLink(adapter, {
      email: body.email,
      callbackURL: body.callbackURL,
    });
  }

  /**
   * Verify magic link
   */
  async verifyMagicLink(query: { token: string; redirect?: string }) {
    const adapter = new NestJSAdapter(
      this.getContextRequest(),
      this.getContextResponse(),
    );

    const result = await this.authService.getMagicLinkService().verifyMagicLink(adapter, {
      token: query.token,
    });

    return result;
  }

  /**
   * Helper to get request from context (should be called from controller method)
   */
  private getContextRequest(): any {
    // This will be set by the interceptor/wrapper
    return (this as any).request;
  }

  /**
   * Helper to get response from context
   */
  private getContextResponse(): any {
    return (this as any).response;
  }
}

/**
 * Main Auth Module
 */
@Global()
@Module({})
export class AuthModule {
  /**
   * Configure Auth Module
   */
  static forRoot(options: AuthModuleOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'AUTH_OPTIONS',
        useValue: options,
      },
      {
        provide: IRepository,
        useValue: options.repository,
      },
      {
        provide: IEmailProvider,
        useValue: options.emailProvider,
      },
      {
        provide: ICacheProvider,
        useValue: options.cacheProvider,
      },
      {
        provide: ILogger,
        useValue: options.logger || console,
      },
      AuthService,
    ];

    // Add global guard if enabled
    if (options.enableGuard !== false) {
      providers.push({
        provide: APP_GUARD,
        useClass: createAuthGuard(TokenService),
      });
    }

    return {
      module: AuthModule,
      global: options.global,
      providers,
      exports: [AuthService, IRepository, IEmailProvider],
    };
  }

  /**
   * Configure Auth Module with async configuration
   */
  static forRootAsync(options: {
    useFactory?: (...args: any[]) => Promise<AuthModuleOptions> | AuthModuleOptions;
    inject?: any[];
    global?: boolean;
  }): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'AUTH_OPTIONS',
        useFactory: options.useFactory,
        inject: options.inject || [],
      },
      AuthService,
    ];

    return {
      module: AuthModule,
      global: options.global,
      providers,
      exports: [AuthService],
    };
  }
}

export default AuthModule;
