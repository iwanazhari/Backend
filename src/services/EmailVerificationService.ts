/**
 * Email Verification Service - Zero Trust
 * 
 * Features:
 * - Send verification email with token
 * - Verify email with token
 * - Resend verification email
 * - Token expiration (24 hours)
 */

import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../config/prisma.js';
import { BadRequestError, UnauthorizedError } from '../errors/index.js';
import { createChildLogger } from '../utils/logger.js';
import SecurityAuditService from './SecurityAuditService.js';

const logger = createChildLogger('email-verification');

const VERIFICATION_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

interface SendVerificationOptions {
  userId: string;
  email: string;
  firstName: string;
}

class EmailVerificationService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Generate verification token
   */
  private generateToken(): string {
    return uuidv4() + uuidv4().replace(/-/g, '');
  }

  /**
   * Send verification email
   * In production, integrate with email service (SendGrid, SES, etc.)
   */
  async sendVerificationEmail(
    options: SendVerificationOptions
  ): Promise<void> {
    const { userId, email, firstName } = options;

    // Generate token
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY);

    // Save token to database
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: token,
        emailVerificationExpires: expiresAt,
      },
    });

    // In production, send actual email here
    // For now, just log it
    logger.info('Verification email sent', {
      email,
      firstName,
      token, // In production, don't log this!
      expiresAt,
    });

    // TODO: Implement actual email sending
    // Example with nodemailer:
    // await sendEmail({
    //   to: email,
    //   subject: 'Verify your email',
    //   html: `
    //     <h1>Welcome ${firstName}!</h1>
    //     <p>Please verify your email by clicking the link below:</p>
    //     <a href="${config.app.url}/api/auth/verify-email?token=${token}">
    //       Verify Email
    //     </a>
    //     <p>This link expires in 24 hours.</p>
    //   `,
    // });

    // Audit the event
    await SecurityAuditService.audit({
      eventType: 'VERIFICATION_EMAIL_SENT',
      userId,
      ipAddress: 'system',
      metadata: { email },
    });
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    if (!token) {
      throw new BadRequestError('Verification token is required', 'MISSING_TOKEN');
    }

    // Find user with valid token
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date(), // Token not expired
        },
      },
    });

    if (!user) {
      // Check if token expired
      const expiredUser = await this.prisma.user.findFirst({
        where: { emailVerificationToken: token },
      });

      if (expiredUser) {
        throw new BadRequestError(
          'Verification token has expired. Please request a new one.',
          'TOKEN_EXPIRED'
        );
      }

      throw new BadRequestError('Invalid verification token', 'INVALID_TOKEN');
    }

    // Verify email
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    // Audit the event
    await SecurityAuditService.audit({
      eventType: 'EMAIL_VERIFIED',
      userId: user.id,
      ipAddress: 'system',
      metadata: { email: user.email },
    });

    logger.info('Email verified successfully', { userId: user.id, email: user.email });

    return {
      success: true,
      message: 'Email verified successfully',
    };
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists
      logger.info('Verification email requested', { email });
      return;
    }

    if (user.emailVerifiedAt) {
      throw new BadRequestError('Email is already verified', 'ALREADY_VERIFIED');
    }

    // Check rate limit (max 3 emails per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentAttempts = await this.prisma.securityAudit.count({
      where: {
        userId: user.id,
        eventType: 'VERIFICATION_EMAIL_SENT',
        createdAt: { gt: oneHourAgo },
      },
    });

    if (recentAttempts >= 3) {
      throw new BadRequestError(
        'Too many verification emails sent. Please wait an hour.',
        'RATE_LIMIT_EXCEEDED'
      );
    }

    // Send new verification email
    await this.sendVerificationEmail({
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
    });

    logger.info('Verification email resent', { email });
  }

  /**
   * Check if email is verified
   */
  async isVerified(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerifiedAt: true },
    });

    return user?.emailVerifiedAt !== null;
  }

  /**
   * Require verification - throw error if not verified
   */
  async requireVerification(userId: string): Promise<void> {
    const isVerified = await this.isVerified(userId);

    if (!isVerified) {
      throw new UnauthorizedError(
        'Email verification required. Please verify your email first.',
        'EMAIL_NOT_VERIFIED'
      );
    }
  }
}

export default new EmailVerificationService();
export type EmailVerificationServiceType = EmailVerificationService;
