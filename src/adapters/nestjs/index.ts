/**
 * AuthBoilerplate NestJS Module
 *
 * Main entry point for NestJS integration
 *
 * Usage:
 * ```typescript
 * import { AuthModule, AuthGuard, Roles } from '@authboilerplate/nestjs';
 *
 * @Module({
 *   imports: [
 *     AuthModule.forRoot({
 *       pasetoSecretKey: configService.get('PASETO_SECRET_KEY'),
 *       repository: prismaRepository,
 *       emailProvider: nodemailerProvider,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */

// Module
export { AuthModule, AuthService, AuthController } from './AuthModule.js';
export type { AuthModuleOptions } from './AuthModule.js';

// Adapter & Guard
export { NestJSAdapter, AuthGuard, createAuthGuard } from './NestJSAdapter.js';
export { Roles, Public, ROLES_KEY, IS_PUBLIC_KEY } from './NestJSAdapter.js';

// Core Services (re-exported for convenience)
export { MagicLinkService } from '../../core/services/MagicLinkService.js';
export { TokenService } from '../../services/TokenService.js';

// Interfaces (re-exported for type hints)
export type {
  AuthConfig,
  IRepository,
  IEmailProvider,
  ICacheProvider,
  ILogger,
  IUser,
  CookieOptions,
} from '../../core/interfaces/index.js';

/**
 * Quick Setup Guide
 *
 * 1. Install dependencies:
 *    npm install @nestjs/common @nestjs/core reflect-metadata
 *
 * 2. Configure module:
 *    @Module({
 *      imports: [AuthModule.forRoot({ ... })],
 *    })
 *
 * 3. Use in controllers:
 *    @UseGuards(AuthGuard)
 *    @Get('profile')
 *    async getProfile(@Request() req) {
 *      return req.user;
 *    }
 *
 * 4. Use decorators:
 *    @Roles('ADMIN')
 *    @Get('admin')
 *    async getAdmin() { ... }
 *
 *    @Public()
 *    @Get('public')
 *    async getPublic() { ... }
 */

export default AuthModule;
