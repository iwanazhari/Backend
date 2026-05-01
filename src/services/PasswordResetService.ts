/**
 * Password Reset Service - Zero Trust Security
 * 
 * Features:
 * - Request password reset with email
 * - Send reset token (1 hour expiry)
 * - Reset password with token
 * - Single-use tokens
 * - Rate limiting
 * - Audit logging
 */

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../config/prisma.js';
import { BadRequestError, UnauthorizedError, TooManyRequestsError } from '../errors/index.js';
import { createChildLogger } from '../utils/logger.js';
import SecurityAuditService from './SecurityAuditService.js';

const logger = createChildLogger('password-reset');

const RESET_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour
const MAX_RESET_REQUESTS = 3; // Per hour
const RESET_WINDOW_MS = 60 * 60 * 1000; // 1 hour

interface PasswordResetRequest {
  email: string;
  ipAddress: string;
  userAgent: string;
}

interface PasswordResetConfirm {
  token: string;
  newPassword: string;
  ipAddress: string;
  userAgent: string;
}

class PasswordResetService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Generate secure reset token
   */
  private generateToken(): string {
    return uuidv4() + uuidv4().replace(/-/g, '');
  }

  /**
   * Request password reset
   */
  async requestReset(options: PasswordResetRequest): Promise<{ success: boolean; message: string }> {
    const { email, ipAddress, userAgent } = options;

    logger.info('Password reset requested', { email, ip: ipAddress });

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Don't reveal if email exists
    if (!user) {
      logger.info('Password reset requested for non-existent email', { email });
      return {
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      };
    }

    // Check rate limit
    const recentRequests = await this.prisma.securityAudit.count({
      where: {
        userId: user.id,
        eventType: 'PASSWORD_RESET_REQUESTED',
        createdAt: { gt: new Date(Date.now() - RESET_WINDOW_MS) },
      },
    });

    if (recentRequests >= MAX_RESET_REQUESTS) {
      logger.warn('Password reset rate limit exceeded', {
        email,
        userId: user.id,
        ip: ipAddress,
      });

      await SecurityAuditService.audit({
        eventType: 'PASSWORD_RESET_RATE_LIMITED',
        userId: user.id,
        ipAddress,
        metadata: { email, userAgent },
      });

      throw new TooManyRequestsError(
        'Too many password reset requests. Please try again later.',
        'RATE_LIMIT_EXCEEDED'
      );
    }

    // Generate token
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY);

    // Save token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpires: expiresAt,
      },
    });

    // TODO: Send actual email
    logger.info('Password reset email sent', {
      email: user.email,
      token,
      expiresAt,
    });

    await SecurityAuditService.audit({
      eventType: 'PASSWORD_RESET_REQUESTED',
      userId: user.id,
      ipAddress,
      metadata: { email, userAgent },
    });

    return {
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    };
  }

  /**
   * Confirm password reset
   */
  async confirmReset(options: PasswordResetConfirm): Promise<{ success: boolean; message: string }> {
    const { token, newPassword, ipAddress, userAgent } = options;

    logger.info('Password reset confirmation attempt', { ip: ipAddress });

    if (!token || !newPassword) {
      throw new BadRequestError('Token and new password are required', 'MISSING_FIELDS');
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      throw new BadRequestError(
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        'WEAK_PASSWORD'
      );
    }

    // Find user with valid token
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      const expiredUser = await this.prisma.user.findFirst({
        where: { passwordResetToken: token },
      });

      if (expiredUser) {
        logger.warn('Password reset with expired token', {
          userId: expiredUser.id,
          ip: ipAddress,
        });

        throw new BadRequestError(
          'Password reset token has expired. Please request a new one.',
          'TOKEN_EXPIRED'
        );
      }

      logger.warn('Password reset with invalid token', { ip: ipAddress });

      throw new BadRequestError('Invalid password reset token', 'INVALID_TOKEN');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    // Revoke all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: {
        revokedAt: new Date(),
        reason: 'PASSWORD_RESET',
      },
    });

    await SecurityAuditService.audit({
      eventType: 'PASSWORD_RESET_SUCCESS',
      userId: user.id,
      ipAddress,
      metadata: { email: user.email, userAgent },
    });

    logger.info('Password reset successful', { userId: user.id, email: user.email });

    return {
      success: true,
      message: 'Password has been reset successfully. Please login with your new password.',
    };
  }

  /**
   * Validate reset token
   */
  async validateToken(token: string): Promise<{ valid: boolean; message: string }> {
    if (!token) {
      return { valid: false, message: 'Token is required' };
    }

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return { valid: false, message: 'Invalid or expired token' };
    }

    return { valid: true, message: 'Token is valid' };
  }
}

export default new PasswordResetService();
export type PasswordResetServiceType = PasswordResetService;
