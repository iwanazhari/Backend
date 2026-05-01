/**
 * Security Audit Service - Zero Trust
 * 
 * Logs all security-relevant events for:
 * - Threat detection
 * - Incident response
 * - Compliance
 * - Forensic analysis
 */

import { getPrismaClient } from '../config/prisma.js';
import { PrismaClient } from '@prisma/client';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('security-audit');

interface AuditEventData {
  eventType: string;
  userId: string | null;
  ipAddress: string;
  userAgent?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  metadata?: Record<string, any>;
}

class SecurityAuditService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Log security event
   * Zero Trust: Audit EVERYTHING
   */
  async audit(data: AuditEventData): Promise<void> {
    try {
      await this.prisma.securityAudit.create({
        data: {
          eventType: data.eventType,
          eventLevel: this.determineEventLevel(data.eventType),
          userId: data.userId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent || null,
          path: data.path || '/api/auth',
          method: data.method || 'POST',
          statusCode: data.statusCode,
          metadata: {
            ...data.metadata,
            timestamp: new Date().toISOString(),
          },
        },
      });
      logger.debug(`Security event audited: ${data.eventType}`);
    } catch (error) {
      // Jangan gagal jika audit gagal
      logger.error('Failed to create security audit:', error);
    }
  }

  /**
   * Determine event level based on type
   */
  private determineEventLevel(eventType: string): string {
    const criticalEvents = [
      'SUSPICIOUS_ACTIVITY',
      'TOKEN_REVOKED',
      'SECURITY_ALERT',
      'BRUTE_FORCE_DETECTED',
    ];
    
    const warningEvents = [
      'LOGIN_FAILED',
      'REGISTER_FAILED',
      'REFRESH_FAILED',
      'PASSWORD_CHANGE_FAILED',
      'RATE_LIMIT_HIT',
    ];

    if (criticalEvents.includes(eventType)) return 'CRITICAL';
    if (warningEvents.includes(eventType)) return 'WARN';
    return 'INFO';
  }

  /**
   * Detect suspicious activity patterns
   * Zero Trust: Assume breach, detect anomalies
   */
  async detectSuspiciousActivity(
    userId: string,
    currentIpAddress: string
  ): Promise<{
    isSuspicious: boolean;
    reason: string;
    details?: any;
  }> {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Check 1: Impossible travel (logins from different IPs dalam 5 menit)
    const recentLogins = await this.prisma.securityAudit.findMany({
      where: {
        userId,
        eventType: 'LOGIN_SUCCESS',
        createdAt: { gte: fiveMinutesAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const login of recentLogins) {
      if (login.ipAddress && login.ipAddress !== currentIpAddress) {
        return {
          isSuspicious: true,
          reason: 'IMPOSSIBLE_TRAVEL',
          details: {
            previousIp: login.ipAddress,
            currentIp: currentIpAddress,
            timeDifference: now.getTime() - new Date(login.createdAt).getTime(),
          },
        };
      }
    }

    // Check 2: Too many failed attempts dalam 1 jam
    const failedAttempts = await this.prisma.securityAudit.count({
      where: {
        userId,
        eventType: 'LOGIN_FAILED',
        createdAt: { gte: oneHourAgo },
      },
    });

    if (failedAttempts >= 5) {
      return {
        isSuspicious: true,
        reason: 'MULTIPLE_FAILED_ATTEMPTS',
        details: {
          failedCount: failedAttempts,
          timeWindow: '1 hour',
        },
      };
    }

    // Check 3: Concurrent sessions dari IP berbeda
    const activeTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: now },
      },
    });

    // Jika ada banyak active tokens, bisa jadi token sharing atau theft
    if (activeTokens.length > 5) {
      return {
        isSuspicious: true,
        reason: 'EXCESSIVE_ACTIVE_SESSIONS',
        details: {
          activeSessionCount: activeTokens.length,
          threshold: 5,
        },
      };
    }

    return { isSuspicious: false, reason: 'NONE' };
  }

  /**
   * Revoke all user tokens on security breach
   */
  async revokeAllTokens(userId: string, reason: string): Promise<void> {
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        reason: reason,
      },
    });

    logger.warn(`Revoked ${result.count} tokens for user ${userId}`, { reason });

    // Audit the revocation
    await this.audit({
      eventType: 'TOKENS_REVOKED',
      userId,
      ipAddress: 'SYSTEM',
      metadata: {
        reason,
        tokensRevoked: result.count,
      },
    });
  }

  /**
   * Get recent security events for user
   */
  async getUserSecurityEvents(userId: string, limit = 10): Promise<any[]> {
    return this.prisma.securityAudit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

// Export singleton instance
export default new SecurityAuditService();
export type SecurityAuditServiceType = SecurityAuditService;
