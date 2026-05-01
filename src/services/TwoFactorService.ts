/**
 * Two-Factor Authentication (2FA) Service
 * 
 * Features:
 * - Generate 2FA secret (TOTP)
 * - Generate QR code for Google Authenticator
 * - Verify 2FA code
 * - Enable/disable 2FA
 * - Generate backup codes
 * - Verify backup codes
 */

import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../config/prisma.js';
import { BadRequestError, UnauthorizedError } from '../errors/index.js';
import { createChildLogger } from '../utils/logger.js';
import SecurityAuditService from './SecurityAuditService.js';

const logger = createChildLogger('2fa');

interface Enable2FAOptions {
  userId: string;
  email: string;
}

interface Verify2FAOptions {
  userId: string;
  token: string;
}

interface GenerateBackupCodesResult {
  backupCodes: string[];
  hashedBackupCodes: string[];
}

class TwoFactorService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Generate 2FA secret
   */
  private generateSecret(email: string) {
    return speakeasy.generateSecret({
      name: `Backend Starter Kit (${email})`,
      issuer: 'Backend Starter Kit',
      length: 32,
    });
  }

  /**
   * Setup 2FA for user
   * Returns QR code and secret
   */
  async setup2FA(options: Enable2FAOptions): Promise<{
    secret: string;
    qrCodeUrl: string;
    qrCodeDataUri: string;
  }> {
    const { userId, email } = options;

    // Check if 2FA already enabled
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });

    if (user?.twoFactorEnabled) {
      throw new BadRequestError('2FA is already enabled', '2FA_ALREADY_ENABLED');
    }

    // Generate secret
    const secret = this.generateSecret(email);

    // Generate QR code
    const qrCodeUrl = secret.otpauth_url!;
    const qrCodeDataUri = await QRCode.toDataURL(qrCodeUrl);

    logger.info('2FA setup initiated', { userId, email });

    return {
      secret: secret.base32,
      qrCodeUrl,
      qrCodeDataUri,
    };
  }

  /**
   * Enable 2FA after verification
   */
  async enable2FA(
    userId: string,
    token: string,
    secret: string
  ): Promise<{ backupCodes: string[] }> {
    // Verify token first
    const isValid = this.verifyToken(token, secret);

    if (!isValid) {
      throw new BadRequestError('Invalid 2FA token', 'INVALID_2FA_TOKEN');
    }

    // Generate backup codes
    const { backupCodes, hashedBackupCodes } = this.generateBackupCodes();

    // Save 2FA secret and backup codes to database
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        twoFactorBackupCodes: JSON.stringify(hashedBackupCodes),
      },
    });

    // Audit the event
    await SecurityAuditService.audit({
      eventType: '2FA_ENABLED',
      userId,
      ipAddress: 'system',
      metadata: {},
    });

    logger.info('2FA enabled successfully', { userId });

    return { backupCodes };
  }

  /**
   * Verify 2FA token during login
   */
  async verify2FA(options: Verify2FAOptions): Promise<boolean> {
    const { userId, token } = options;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        twoFactorSecret: true,
        twoFactorBackupCodes: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found', 'USER_NOT_FOUND');
    }

    if (!user.twoFactorEnabled) {
      // 2FA not enabled, skip verification
      return true;
    }

    if (!user.twoFactorSecret) {
      throw new UnauthorizedError('2FA secret not found', '2FA_SECRET_MISSING');
    }

    // Verify token
    const isValid = this.verifyToken(token, user.twoFactorSecret);

    if (isValid) {
      await SecurityAuditService.audit({
        eventType: '2FA_VERIFIED',
        userId,
        ipAddress: 'system',
        metadata: {},
      });
      return true;
    }

    // Check backup codes
    const isBackupCode = await this.verifyBackupCode(userId, token);

    if (isBackupCode) {
      await SecurityAuditService.audit({
        eventType: '2FA_BACKUP_CODE_USED',
        userId,
        ipAddress: 'system',
        metadata: {},
      });
      return true;
    }

    await SecurityAuditService.audit({
      eventType: '2FA_VERIFICATION_FAILED',
      userId,
      ipAddress: 'system',
      metadata: {},
    });

    throw new UnauthorizedError('Invalid 2FA token or backup code', 'INVALID_2FA_TOKEN');
  }

  /**
   * Disable 2FA
   */
  async disable2FA(userId: string, token: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true, twoFactorSecret: true },
    });

    if (!user?.twoFactorEnabled) {
      throw new BadRequestError('2FA is not enabled', '2FA_NOT_ENABLED');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestError('2FA secret not found', '2FA_SECRET_MISSING');
    }

    // Verify current token
    const isValid = this.verifyToken(token, user.twoFactorSecret);

    if (!isValid) {
      throw new BadRequestError('Invalid 2FA token', 'INVALID_2FA_TOKEN');
    }

    // Disable 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      },
    });

    // Audit the event
    await SecurityAuditService.audit({
      eventType: '2FA_DISABLED',
      userId,
      ipAddress: 'system',
      metadata: {},
    });

    logger.info('2FA disabled', { userId });
  }

  /**
   * Verify TOTP token
   */
  private verifyToken(token: string, secret: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps before/after (±60 seconds)
    });
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): GenerateBackupCodesResult {
    const backupCodes: string[] = [];
    const hashedBackupCodes: string[] = [];

    // Generate 10 backup codes
    for (let i = 0; i < 10; i++) {
      const code = this.generateBackupCode();
      backupCodes.push(code);
      hashedBackupCodes.push(this.hashBackupCode(code));
    }

    return { backupCodes, hashedBackupCodes };
  }

  /**
   * Generate single backup code
   */
  private generateBackupCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 1, 0
    let code = '';
    
    for (let i = 0; i < 8; i++) {
      if (i > 0 && i % 4 === 0) {
        code += '-';
      }
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return code;
  }

  /**
   * Hash backup code for storage
   */
  private hashBackupCode(code: string): string {
    // Simple hash - in production, use bcrypt
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(code.toLowerCase().replace(/-/g, '')).digest('hex');
  }

  /**
   * Verify backup code
   */
  private async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorBackupCodes: true },
    });

    if (!user?.twoFactorBackupCodes) {
      return false;
    }

    const hashedBackupCodes: string[] = JSON.parse(user.twoFactorBackupCodes);
    const hashedCode = this.hashBackupCode(code);

    const index = hashedBackupCodes.indexOf(hashedCode);

    if (index === -1) {
      return false;
    }

    // Remove used backup code
    hashedBackupCodes.splice(index, 1);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorBackupCodes: JSON.stringify(hashedBackupCodes),
      },
    });

    return true;
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string, token: string): Promise<{ backupCodes: string[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true, twoFactorSecret: true },
    });

    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestError('2FA is not enabled', '2FA_NOT_ENABLED');
    }

    // Verify current token
    const isValid = this.verifyToken(token, user.twoFactorSecret);

    if (!isValid) {
      throw new BadRequestError('Invalid 2FA token', 'INVALID_2FA_TOKEN');
    }

    // Generate new backup codes
    const { backupCodes, hashedBackupCodes } = this.generateBackupCodes();

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorBackupCodes: JSON.stringify(hashedBackupCodes),
      },
    });

    logger.info('Backup codes regenerated', { userId });

    return { backupCodes };
  }
}

export default new TwoFactorService();
export type TwoFactorServiceType = TwoFactorService;
