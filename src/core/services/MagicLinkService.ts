/**
 * Magic Link Service - Framework Agnostic
 *
 * Features:
 * - Generate magic link for passwordless login
 * - Send magic link via email
 * - Verify magic link token
 * - Single-use tokens
 * - Rate limiting
 * - Audit logging
 *
 * Zero Trust Principles:
 * - Short expiration (15 minutes default)
 * - Single-use tokens
 * - Audit all requests
 * - Rate limiting per email
 */

import { v4 as uuidv4 } from 'uuid';
import {
  IAuthAdapter,
  IRepository,
  IEmailProvider,
  ICacheProvider,
  ILogger,
  IUser,
  ITokenService,
  AuthResult,
  AuthError,
  MagicLinkRequest,
} from '../interfaces/index.js';
import TokenService from '../../services/TokenService.js';

const MAGIC_LINK_EXPIRATION_MINUTES = 15;
const MAX_REQUESTS_PER_HOUR = 3;

export interface MagicLinkOptions {
  email: string;
  callbackURL?: string;
}

export interface MagicLinkVerifyOptions {
  token: string;
}

export class MagicLinkService {
  private repository: IRepository;
  private emailProvider: IEmailProvider;
  private cacheProvider?: ICacheProvider;
  private tokenService: ITokenService;
  private logger: ILogger;
  private magicLinkExpiration: number;

  constructor(
    repository: IRepository,
    emailProvider: IEmailProvider,
    tokenService: ITokenService,
    options?: {
      cacheProvider?: ICacheProvider;
      logger?: ILogger;
      magicLinkExpiration?: number; // in minutes
    }
  ) {
    this.repository = repository;
    this.emailProvider = emailProvider;
    this.tokenService = tokenService;
    this.cacheProvider = options?.cacheProvider;
    this.logger = options?.logger || console;
    this.magicLinkExpiration = options?.magicLinkExpiration || MAGIC_LINK_EXPIRATION_MINUTES;
  }

  /**
   * Request magic link for passwordless login
   *
   * Flow:
   * 1. Validate email
   * 2. Check rate limit
   * 3. Generate token
   * 4. Save to database
   * 5. Send email
   * 6. Audit log
   */
  async requestMagicLink(
    adapter: IAuthAdapter,
    options: MagicLinkOptions
  ): Promise<AuthResult<{ success: boolean; message: string }>> {
    const { email } = options;
    const ipAddress = adapter.getClientIP();
    const userAgent = adapter.getUserAgent();

    try {
      this.logger.info('Magic link requested', { email, ip: ipAddress });

      // 1. Validate email format
      if (!this.isValidEmail(email)) {
        return this.errorResult('Invalid email format', 'INVALID_EMAIL');
      }

      // 2. Check rate limit (prevent spam)
      const rateLimitKey = `magic-link:${email.toLowerCase()}`;
      const isRateLimited = await this.checkRateLimit(rateLimitKey);

      if (isRateLimited) {
        this.logger.warn('Magic link rate limit exceeded', { email, ip: ipAddress });
        return this.errorResult(
          'Too many requests. Please try again later.',
          'RATE_LIMIT_EXCEEDED'
        );
      }

      // 3. Check if user exists (don't reveal if email exists)
      const user = await this.repository.findByEmail(email.toLowerCase());

      if (!user) {
        // Don't reveal if email exists (security best practice)
        this.logger.info('Magic link requested for non-existent email', { email });
        return {
          success: true,
          data: {
            success: true,
            message: 'If an account exists with this email, you will receive a magic link.',
          },
        };
      }

      // 4. Generate token
      const token = this.generateToken();
      const expiresAt = new Date(Date.now() + this.magicLinkExpiration * 60 * 1000);

      // 5. Save magic link to database
      await this.saveMagicLink(user.id, token, expiresAt);

      // 6. Generate magic link URL
      const callbackURL = options.callbackURL || '/auth/magic-link/verify';
      const magicLink = `${callbackURL}?token=${token}`;

      // 7. Send email
      await this.sendMagicLinkEmail(user.email, magicLink, this.magicLinkExpiration);

      // 8. Cache rate limit
      await this.incrementRateLimit(rateLimitKey);

      // 9. Audit log
      await this.auditLog('MAGIC_LINK_REQUESTED', user.id, ipAddress, userAgent, {
        email: user.email,
      });

      this.logger.info('Magic link sent', { email: user.email });

      return {
        success: true,
        data: {
          success: true,
          message: 'If an account exists with this email, you will receive a magic link.',
        },
      };
    } catch (error) {
      this.logger.error('Magic link request failed', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return this.errorResult('Failed to process request', 'INTERNAL_ERROR');
    }
  }

  /**
   * Verify magic link and login user
   *
   * Flow:
   * 1. Validate token
   * 2. Find magic link in database
   * 3. Check expiration
   * 4. Check if already used
   * 5. Find user
   * 6. Verify account status
   * 7. Generate tokens
   * 8. Revoke magic link (single-use)
   * 9. Audit log
   * 10. Return tokens
   */
  async verifyMagicLink(
    adapter: IAuthAdapter,
    options: MagicLinkVerifyOptions
  ): Promise<AuthResult<{ user: IUser; tokens: any }>> {
    const { token } = options;
    const ipAddress = adapter.getClientIP();
    const userAgent = adapter.getUserAgent();

    try {
      this.logger.info('Magic link verification attempt', { ip: ipAddress });

      // 1. Validate token exists
      if (!token) {
        return this.errorResult('Token is required', 'MISSING_TOKEN');
      }

      // 2. Find magic link in database
      const magicLink = await this.findMagicLink(token);

      if (!magicLink) {
        this.logger.warn('Magic link not found', { ip: ipAddress });
        return this.errorResult('Invalid or expired magic link', 'INVALID_TOKEN');
      }

      // 3. Check expiration
      if (magicLink.expiresAt < new Date()) {
        this.logger.warn('Magic link expired', { token, ip: ipAddress });
        return this.errorResult('Magic link has expired', 'TOKEN_EXPIRED');
      }

      // 4. Check if already used
      if (magicLink.usedAt) {
        this.logger.warn('Magic link already used', { token, ip: ipAddress });
        return this.errorResult('Magic link has already been used', 'TOKEN_USED');
      }

      // 5. Find user
      const user = await this.repository.findById(magicLink.userId);

      if (!user) {
        this.logger.error('User not found for magic link', { userId: magicLink.userId });
        return this.errorResult('User not found', 'USER_NOT_FOUND');
      }

      // 6. Verify account status
      if (user.status !== 'ACTIVE') {
        this.logger.warn('Inactive user magic link attempt', {
          userId: user.id,
          status: user.status,
        });
        return this.errorResult('Account is not active', 'ACCOUNT_INACTIVE');
      }

      // 7. Generate tokens
      const tokens = await this.tokenService.generateTokenPair(user.id, user.email, user.role);

      // 8. Mark magic link as used (single-use)
      await this.markMagicLinkAsUsed(magicLink.id);

      // 9. Update user last login
      await this.repository.updateLastLogin(user.id);

      // 10. Audit log
      await this.auditLog('MAGIC_LINK_VERIFIED', user.id, ipAddress, userAgent, {
        email: user.email,
      });

      this.logger.info('Magic link verified successfully', { userId: user.id, email: user.email });

      return {
        success: true,
        data: {
          user: user as IUser,
          tokens,
        },
      };
    } catch (error) {
      this.logger.error('Magic link verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return this.errorResult('Failed to verify magic link', 'INTERNAL_ERROR');
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Generate secure token
   */
  private generateToken(): string {
    return uuidv4() + uuidv4().replace(/-/g, '');
  }

  /**
   * Check rate limit
   */
  private async checkRateLimit(key: string): Promise<boolean> {
    if (!this.cacheProvider) {
      return false; // Skip rate limiting if cache not available
    }

    const count = await this.cacheProvider.get(key);
    return count && count >= MAX_REQUESTS_PER_HOUR;
  }

  /**
   * Increment rate limit counter
   */
  private async incrementRateLimit(key: string): Promise<void> {
    if (!this.cacheProvider) {
      return; // Skip rate limiting if cache not available
    }

    const current = await this.cacheProvider.get(key) || 0;
    await this.cacheProvider.set(key, current + 1, 60 * 60); // 1 hour TTL
  }

  /**
   * Save magic link to database
   */
  private async saveMagicLink(userId: string, token: string, expiresAt: Date): Promise<void> {
    // This would use a MagicLinkRepository in production
    // For now, we'll store it in a hypothetical magic_links table
    const prisma = await this.getPrismaClient();
    await prisma.magicLink.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  /**
   * Find magic link by token
   */
  private async findMagicLink(token: string): Promise<MagicLinkRequest | null> {
    const prisma = await this.getPrismaClient();
    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!magicLink) {
      return null;
    }

    return {
      id: magicLink.id,
      email: magicLink.user.email,
      token: magicLink.token,
      expiresAt: magicLink.expiresAt,
      usedAt: magicLink.usedAt || undefined,
      createdAt: magicLink.createdAt,
    };
  }

  /**
   * Mark magic link as used
   */
  private async markMagicLinkAsUsed(magicLinkId: string): Promise<void> {
    const prisma = await this.getPrismaClient();
    await prisma.magicLink.update({
      where: { id: magicLinkId },
      data: { usedAt: new Date() },
    });
  }

  /**
   * Send magic link email
   */
  private async sendMagicLinkEmail(
    email: string,
    magicLink: string,
    expirationMinutes: number
  ): Promise<void> {
    const subject = 'Your Magic Link Login';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
          }
          .button:hover { background-color: #0056b3; }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Login to Your Account</h2>
          <p>Click the button below to log in to your account:</p>
          <a href="${magicLink}" class="button">Login Now</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all;">${magicLink}</p>
          <p><strong>This link will expire in ${expirationMinutes} minutes.</strong></p>
          <p>If you didn't request this link, you can safely ignore this email.</p>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Login to Your Account
      
      Click the link below to log in:
      ${magicLink}
      
      This link will expire in ${expirationMinutes} minutes.
      
      If you didn't request this link, you can safely ignore this email.
    `;

    await this.emailProvider.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  /**
   * Audit log helper
   */
  private async auditLog(
    eventType: string,
    userId: string | undefined,
    ipAddress: string,
    userAgent: string,
    metadata: any
  ): Promise<void> {
    try {
      const prisma = await this.getPrismaClient();
      await prisma.securityAudit.create({
        data: {
          eventType,
          eventLevel: eventType.includes('FAILED') || eventType.includes('INVALID') ? 'WARN' : 'INFO',
          userId,
          ipAddress,
          userAgent,
          path: '/auth/magic-link',
          method: 'POST',
          metadata,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create audit log', { error });
      // Don't throw - audit log failure shouldn't break the flow
    }
  }

  /**
   * Get Prisma client
   */
  private async getPrismaClient(): Promise<any> {
    const { getPrismaClient } = await import('../../config/prisma.js');
    return getPrismaClient();
  }

  /**
   * Create error result
   */
  private errorResult(message: string, code: string): AuthResult {
    return {
      success: false,
      error: {
        type: 'MagicLinkError',
        message,
        code,
      },
    };
  }
}

export default MagicLinkService;
