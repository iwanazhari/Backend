/**
 * NestJS Adapter for AuthBoilerplate
 *
 * Implements IAuthAdapter for NestJS framework
 * Follows NestJS patterns: Dependency Injection, Guards, Decorators
 *
 * @see https://nestjs.com/
 */

import { Injectable, ExecutionContext, CanActivate, mixin, Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IAuthAdapter, CookieOptions } from '../../core/interfaces/index.js';

/**
 * NestJS Adapter - Wraps Express/Fastify request/response
 */
@Injectable()
export class NestJSAdapter implements IAuthAdapter {
  constructor(
    private request: any,
    private response: any,
  ) {}

  /**
   * Create adapter from ExecutionContext
   */
  static fromContext(context: ExecutionContext): NestJSAdapter {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    return new NestJSAdapter(request, response);
  }

  /**
   * Get underlying request object
   */
  getRequest(): any {
    return this.request;
  }

  /**
   * Get underlying response object
   */
  getResponse(): any {
    return this.response;
  }

  /**
   * Get request body
   */
  getBody(): any {
    return this.request.body;
  }

  /**
   * Get route parameters
   */
  getParams(): any {
    return this.request.params;
  }

  /**
   * Get query parameters
   */
  getQuery(): any {
    return this.request.query;
  }

  /**
   * Get request headers
   */
  getHeaders(): any {
    return this.request.headers;
  }

  /**
   * Set response header
   */
  setHeader(key: string, value: string): void {
    this.response.setHeader(key, value);
  }

  /**
   * Set HTTP status code
   */
  setStatus(code: number): void {
    this.response.status(code);
  }

  /**
   * Send JSON response
   */
  send(data: any): void {
    this.response.json(data);
  }

  /**
   * Redirect to URL
   */
  redirect(url: string): void {
    this.response.redirect(url);
  }

  /**
   * Set cookie
   */
  setCookie(name: string, value: string, options?: CookieOptions): void {
    const cookieOptions: any = { ...options };
    
    // Convert sameSite to NestJS format
    if (options?.sameSite) {
      if (options.sameSite === 'strict') {
        cookieOptions.sameSite = 'strict';
      } else if (options.sameSite === 'lax') {
        cookieOptions.sameSite = 'lax';
      } else if (options.sameSite === 'none') {
        cookieOptions.sameSite = 'none';
      }
    }

    this.response.cookie(name, value, cookieOptions);
  }

  /**
   * Clear cookie
   */
  clearCookie(name: string): void {
    this.response.clearCookie(name);
  }

  /**
   * Get cookie by name
   */
  getCookie(name: string): string | undefined {
    return this.request.cookies?.[name];
  }

  /**
   * Get client IP address
   */
  getClientIP(): string {
    // Check X-Forwarded-For header
    const forwarded = this.request.headers['x-forwarded-for'];
    if (forwarded) {
      return Array.isArray(forwarded)
        ? forwarded[0].split(',')[0].trim()
        : forwarded.split(',')[0].trim();
    }

    // Fall back to direct connection IP
    return this.request.ip || this.request.socket?.remoteAddress || 'unknown';
  }

  /**
   * Get User-Agent header
   */
  getUserAgent(): string {
    return this.request.headers['user-agent'] || 'unknown';
  }

  /**
   * Check if connection is secure (HTTPS)
   */
  isSecure(): boolean {
    return (
      this.request.secure ||
      this.request.headers['x-forwarded-proto'] === 'https' ||
      this.request.headers['x-forwarded-ssl'] === 'on'
    );
  }
}

/**
 * Metadata key for roles
 */
export const ROLES_KEY = 'roles';

/**
 * Roles decorator
 *
 * Usage:
 * @Roles('ADMIN', 'MODERATOR')
 * @Get('admin')
 * async getAdmin() { ... }
 */
export const Roles = (...roles: string[]): MethodDecorator => {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(ROLES_KEY, roles, descriptor.value);
  };
};

/**
 * Public decorator (skip auth)
 *
 * Usage:
 * @Public()
 * @Get('public-endpoint')
 * async publicEndpoint() { ... }
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = (): MethodDecorator => {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(IS_PUBLIC_KEY, true, descriptor.value);
  };
};

/**
 * Authentication Guard
 *
 * Usage:
 * @UseGuards(AuthGuard)
 * @Get('protected')
 * async protectedRoute() { ... }
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private tokenService: any, // TokenService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Get required roles
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Extract token
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      return false;
    }

    try {
      // Verify token
      const user = await this.tokenService.extractUser(token);
      request.user = user;

      // Check roles
      if (requiredRoles?.length > 0) {
        if (!requiredRoles.includes(user.role)) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  private extractToken(request: any): string | null {
    // Check Authorization header
    const authHeader = request.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check cookies
    return request.cookies?.accessToken || null;
  }
}

/**
 * Create AuthGuard with TokenService
 */
export const createAuthGuard = (tokenService: any): Type<AuthGuard> => {
  return mixin(class extends AuthGuard {
    constructor(reflector: Reflector) {
      super(reflector, tokenService);
    }
  });
};

export default NestJSAdapter;
