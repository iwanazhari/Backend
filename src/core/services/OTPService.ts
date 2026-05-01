/**
 * OTP Service - Framework Agnostic
 *
 * Features:
 * - Generate OTP codes (6 digits default)
 * - Send via email or SMS
 * - Verify OTP (single-use)
 * - Rate limiting
 * - Expiration (10 minutes default)
 * - Audit logging
 *
 * Zero Trust Principles:
 * - Short expiration (10 minutes)
 * - Single-use codes
 * - Rate limiting per identifier
 * - Audit all attempts
 */

import { v4 as uuidv4 } from 'uuid';
import {
  IAuthAdapter,
  IRepository,
  IEmailProvider,
  ISMSProvider,
  ICacheProvider,
  ILogger,
  IUser,
  ITokenService,
  AuthResult,
  AuthError,
} from '../interfaces/index.js';
import TokenService from '../../services/TokenService.js';

const OTP_LENGTH = 6;
const OTP_EXPIRATION_MINUTES = 10;
const MAX_OTP_REQUESTS_PER_HOUR = 5;
const MAX_OTP_ATTEMPTS_PER_CODE = 3;

export interface SendOTPRequest {
  identifier: string; // email or phone
  type: 'email' | 'sms';
  purpose?: 'login' | 'verification' | '2fa' | 'password_reset';
}

export interface VerifyOTPRequest {
  identifier: string;
  code: string;
  type?: 'email' | 'sms';
}

export class OTPService {
  private repository: IRepository;
  private emailProvider?: IEmailProvider;
  private smsProvider?: ISMSProvider;
  private cacheProvider?: ICacheProvider;
  private tokenService: ITokenService;
  private logger: ILogger;
  private otpLength: number;
  private otpExpiration: number;

  constructor(
    repository: IRepository,
    tokenService: ITokenService,
    options?: {
      emailProvider?: IEmailProvider;
      smsProvider?: ISMSProvider;
      cacheProvider?: ICacheProvider;
      logger?: ILogger;
      otpLength?: number;
      otpExpiration?: number; // in minutes
    }
  ) {
    this.repository = repository;
    this.tokenService = tokenService;
    this.emailProvider = options?.emailProvider;
    this.smsProvider = options?.smsProvider;
    this.cacheProvider = options?.cacheProvider;
    this.logger = options?.logger || console;
    this.otpLength = options?.otpLength || OTP_LENGTH;
    this.otpExpiration = options?.otpExpiration || OTP_EXPIRATION_MINUTES;
  }

  /**
   * Send OTP to email or phone
   *
   * Flow:
   * 1. Validate identifier (email/phone)
   * 2. Check rate limit
   * 3. Generate OTP code
   * 4. Save to database
   * 5. Send via email or SMS
   * 6. Audit log
   */
  async sendOTP(
    adapter: IAuthAdapter,
    options: SendOTPRequest
  ): Promise<AuthResult<{ success: boolean; message: string }>> {
    const { identifier, type, purpose = 'verification' } = options;
    const ipAddress = adapter.getClientIP();
    const userAgent = adapter.getUserAgent();

    try {
      this.logger.info('OTP requested', { identifier, type, ip: ipAddress });

      // 1. Validate identifier
      if (!identifier) {
        return this.errorResult('Identifier is required', 'MISSING_IDENTIFIER');
      }

      const isValidIdentifier = type === 'email' 
        ? this.isValidEmail(identifier)
        : this.isValidPhone(identifier);

      if (!isValidIdentifier) {
        return this.errorResult(
          `Invalid ${type} format`,
          `INVALID_${type.toUpperCase()}`
        );
      }

      // 2. Check rate limit
      const rateLimitKey = `otp:${type}:${identifier}`;
      const isRateLimited = await this.checkRateLimit(rateLimitKey);

      if (isRateLimited) {
        this.logger.warn('OTP rate limit exceeded', { identifier, type, ip: ipAddress });
        return this.errorResult(
          'Too many requests. Please try again later.',
          'RATE_LIMIT_EXCEEDED'
        );
      }

      // 3. Generate OTP code
      const otpCode = this.generateOTP();

      // 4. Save OTP to database
      const expiresAt = new Date(Date.now() + this.otpExpiration * 60 * 1000);
      await this.saveOTP(identifier, otpCode, type, expiresAt, purpose);

      // 5. Send OTP
      if (type === 'email') {
        if (!this.emailProvider) {
          return this.errorResult('Email provider not configured', 'EMAIL_PROVIDER_MISSING');
        }
        await this.sendOTPEmail(identifier, otpCode, this.otpExpiration);
      } else {
        if (!this.smsProvider) {
          return this.errorResult('SMS provider not configured', 'SMS_PROVIDER_MISSING');
        }
        await this.sendOTPSMS(identifier, otpCode, this.otpExpiration);
      }

      // 6. Cache rate limit
      await this.incrementRateLimit(rateLimitKey);

      // 7. Audit log
      const user = await this.repository.findByEmail(identifier);
      await this.auditLog(
        'OTP_SENT',
        user?.id,
        ipAddress,
        userAgent,
        { identifier, type, purpose }
      );

      this.logger.info('OTP sent successfully', { identifier, type });

      return {
        success: true,
        data: {
          success: true,
          message: `OTP sent to ${type}. Valid for ${this.otpExpiration} minutes.`,
        },
      };
    } catch (error) {
      this.logger.error('OTP send failed', {
        identifier,
        type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return this.errorResult('Failed to send OTP', 'INTERNAL_ERROR');
    }
  }

  /**
   * Verify OTP code
   *
   * Flow:
   * 1. Validate input
   * 2. Find OTP in database
   * 3. Check expiration
   * 4. Check if already used
   * 5. Check attempt limit
   * 6. Verify code
   * 7. Mark as used
   * 8. Generate tokens (if login)
   * 9. Audit log
   */
  async verifyOTP(
    adapter: IAuthAdapter,
    options: VerifyOTPRequest
  ): Promise<AuthResult<{ user?: IUser; tokens?: any; verified: boolean }>> {
    const { identifier, code, type = 'email' } = options;
    const ipAddress = adapter.getClientIP();
    const userAgent = adapter.getUserAgent();

    try {
      this.logger.info('OTP verification attempt', { identifier, type, ip: ipAddress });

      // 1. Validate input
      if (!identifier || !code) {
        return this.errorResult('Identifier and code are required', 'MISSING_FIELDS');
      }

      // 2. Find OTP in database
      const otpRecord = await this.findOTP(identifier, code, type);

      if (!otpRecord) {
        this.logger.warn('OTP not found', { identifier, type, ip: ipAddress });
        return this.errorResult('Invalid or expired OTP', 'INVALID_OTP');
      }

      // 3. Check expiration
      if (otpRecord.expiresAt < new Date()) {
        this.logger.warn('OTP expired', { identifier, type, ip: ipAddress });
        return this.errorResult('OTP has expired', 'OTP_EXPIRED');
      }

      // 4. Check if already used
      if (otpRecord.usedAt) {
        this.logger.warn('OTP already used', { identifier, type, ip: ipAddress });
        return this.errorResult('OTP has already been used', 'OTP_USED');
      }

      // 5. Check attempt limit
      const attemptKey = `otp:attempts:${otpRecord.id}`;
      const attempts = await this.getAttempts(attemptKey);

      if (attempts >= MAX_OTP_ATTEMPTS_PER_CODE) {
        this.logger.warn('Max OTP attempts exceeded', { identifier, type, ip: ipAddress });
        return this.errorResult(
          'Maximum verification attempts exceeded',
          'MAX_ATTEMPTS_EXCEEDED'
        );
      }

      // 6. Code matches - Mark as used
      await this.markOTPAsUsed(otpRecord.id);

      // 7. Find user
      const user = await this.repository.findByEmail(identifier);

      // 8. Generate tokens if user exists (login flow)
      let tokens = undefined;
      if (user) {
        if (user.status !== 'ACTIVE') {
          return this.errorResult('Account is not active', 'ACCOUNT_INACTIVE');
        }

        tokens = await this.tokenService.generateTokenPair(user.id, user.email, user.role);
        await this.repository.updateLastLogin(user.id);
      }

      // 9. Audit log
      await this.auditLog(
        'OTP_VERIFIED',
        user?.id,
        ipAddress,
        userAgent,
        { identifier, type, purpose: otpRecord.purpose }
      );

      this.logger.info('OTP verified successfully', { identifier, type, userId: user?.id });

      return {
        success: true,
        data: {
          user: user as IUser,
          tokens,
          verified: true,
        },
      };
    } catch (error) {
      this.logger.error('OTP verification failed', {
        identifier,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return this.errorResult('Failed to verify OTP', 'INTERNAL_ERROR');
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
   * Validate phone format (international)
   */
  private isValidPhone(phone: string): boolean {
    // Simple validation - accepts + followed by 10-15 digits
    const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    return phoneRegex.test(phone.replace(/[\s\-()]/g, ''));
  }

  /**
   * Generate OTP code
   */
  private generateOTP(): string {
    const chars = '0123456789';
    let otp = '';
    for (let i = 0; i < this.otpLength; i++) {
      otp += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return otp;
  }

  /**
   * Check rate limit
   */
  private async checkRateLimit(key: string): Promise<boolean> {
    if (!this.cacheProvider) {
      return false;
    }

    const count = await this.cacheProvider.get(key);
    return count && count >= MAX_OTP_REQUESTS_PER_HOUR;
  }

  /**
   * Increment rate limit counter
   */
  private async incrementRateLimit(key: string): Promise<void> {
    if (!this.cacheProvider) {
      return;
    }

    const current = await this.cacheProvider.get(key) || 0;
    await this.cacheProvider.set(key, current + 1, 60 * 60); // 1 hour TTL
  }

  /**
   * Get verification attempts
   */
  private async getAttempts(key: string): Promise<number> {
    if (!this.cacheProvider) {
      return 0;
    }

    return await this.cacheProvider.get(key) || 0;
  }

  /**
   * Save OTP to database
   */
  private async saveOTP(
    identifier: string,
    code: string,
    type: string,
    expiresAt: Date,
    purpose: string
  ): Promise<void> {
    const prisma = await this.getPrismaClient();
    
    // Hash the code before storing
    const hashedCode = this.hashCode(code);
    
    await prisma.otpRequest.create({
      data: {
        identifier,
        code: hashedCode,
        type,
        expiresAt,
        purpose,
      },
    });
  }

  /**
   * Find OTP in database
   */
  private async findOTP(
    identifier: string,
    code: string,
    type: string
  ): Promise<any | null> {
    const prisma = await this.getPrismaClient();
    
    // Hash the code to compare
    const hashedCode = this.hashCode(code);
    
    return prisma.otpRequest.findFirst({
      where: {
        identifier,
        code: hashedCode,
        type,
      },
    });
  }

  /**
   * Mark OTP as used
   */
  private async markOTPAsUsed(otpId: string): Promise<void> {
    const prisma = await this.getPrismaClient();
    await prisma.otpRequest.update({
      where: { id: otpId },
      data: { usedAt: new Date() },
    });
  }

  /**
   * Hash code for storage
   */
  private hashCode(code: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Send OTP via email
   */
  private async sendOTPEmail(
    email: string,
    otpCode: string,
    expirationMinutes: number
  ): Promise<void> {
    if (!this.emailProvider) return;

    const subject = 'Your Verification Code';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .code {
            font-size: 32px;
            font-weight: bold;
            color: #007bff;
            text-align: center;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            margin: 20px 0;
            letter-spacing: 8px;
          }
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
          <h2>Verification Code</h2>
          <p>Your verification code is:</p>
          <div class="code">${otpCode}</div>
          <p><strong>This code will expire in ${expirationMinutes} minutes.</strong></p>
          <p>If you didn't request this code, you can safely ignore this email.</p>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Your verification code: ${otpCode}
      
      This code will expire in ${expirationMinutes} minutes.
      
      If you didn't request this code, you can safely ignore this email.
    `;

    await this.emailProvider.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  /**
   * Send OTP via SMS
   */
  private async sendOTPSMS(
    phone: string,
    otpCode: string,
    expirationMinutes: number
  ): Promise<void> {
    if (!this.smsProvider) return;

    const message = `Your verification code: ${otpCode}. Valid for ${expirationMinutes} minutes.`;

    await this.smsProvider.sendSMS({
      to: phone,
      message,
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
          path: '/auth/otp',
          method: 'POST',
          metadata,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create audit log', { error });
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
        type: 'OTPError',
        message,
        code,
      },
    };
  }
}

export default OTPService;
