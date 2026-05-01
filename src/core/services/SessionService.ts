/**
 * Session Service - Framework Agnostic
 *
 * Features:
 * - List active sessions/devices
 * - Revoke specific session
 * - Revoke all sessions
 * - Device fingerprinting
 * - Session metadata (IP, UA, location)
 * - Auto-expire old sessions
 * - Suspicious activity detection
 *
 * Zero Trust Principles:
 * - Track all active sessions
 * - Allow users to revoke access
 * - Detect suspicious activity
 * - Auto-expire inactive sessions
 */

import { v4 as uuidv4 } from 'uuid';
import {
  IAuthAdapter,
  IRepository,
  ICacheProvider,
  ILogger,
  IUser,
  ITokenService,
  AuthResult,
  ISession,
  DeviceInfo,
} from '../interfaces/index.js';
import TokenService from '../../services/TokenService.js';

export interface SessionInfo extends ISession {
  deviceName?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  location?: string;
  isCurrentSession?: boolean;
}

export interface CreateSessionOptions {
  userId: string;
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
  deviceInfo?: Partial<DeviceInfo>;
}

export class SessionService {
  private repository: IRepository;
  private tokenService: ITokenService;
  private cacheProvider?: ICacheProvider;
  private logger: ILogger;

  constructor(
    repository: IRepository,
    tokenService: ITokenService,
    options?: {
      cacheProvider?: ICacheProvider;
      logger?: ILogger;
    }
  ) {
    this.repository = repository;
    this.tokenService = tokenService;
    this.cacheProvider = options?.cacheProvider;
    this.logger = options?.logger || console;
  }

  /**
   * Create new session
   *
   * Flow:
   * 1. Parse user agent for device info
   * 2. Create session in database
   * 3. Clean up old sessions
   * 4. Return session info
   */
  async createSession(
    adapter: IAuthAdapter,
    options: CreateSessionOptions
  ): Promise<AuthResult<{ session: SessionInfo }>> {
    const { userId, refreshToken, ipAddress, userAgent, deviceInfo } = options;

    try {
      this.logger.info('Creating new session', { userId, ip: ipAddress });

      // 1. Parse user agent for device info
      const parsedDeviceInfo = this.parseUserAgent(userAgent);
      const fullDeviceInfo: DeviceInfo = {
        deviceId: uuidv4(),
        deviceName: this.getDeviceName(parsedDeviceInfo),
        deviceType: parsedDeviceInfo.deviceType,
        os: parsedDeviceInfo.os,
        browser: parsedDeviceInfo.browser,
        ...deviceInfo,
      };

      // 2. Create session in database
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const session = await this.saveSession({
        userId,
        refreshToken,
        ipAddress,
        userAgent,
        deviceInfo: fullDeviceInfo,
        expiresAt,
      });

      // 3. Clean up old/expired sessions
      await this.cleanupExpiredSessions(userId);

      // 4. Build session info
      const sessionInfo: SessionInfo = {
        ...session,
        deviceName: fullDeviceInfo.deviceName,
        deviceType: fullDeviceInfo.deviceType,
        browser: fullDeviceInfo.browser,
        os: fullDeviceInfo.os,
        isCurrentSession: true,
      };

      this.logger.info('Session created', { sessionId: session.id, userId });

      return {
        success: true,
        data: {
          session: sessionInfo,
        },
      };
    } catch (error) {
      this.logger.error('Failed to create session', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return this.errorResult('Failed to create session', 'INTERNAL_ERROR');
    }
  }

  /**
   * Get all active sessions for user
   */
  async getUserSessions(
    adapter: IAuthAdapter,
    userId: string,
    currentRefreshToken?: string
  ): Promise<AuthResult<{ sessions: SessionInfo[] }>> {
    try {
      this.logger.info('Getting user sessions', { userId });

      const sessions = await this.findActiveSessions(userId);

      const sessionInfos: SessionInfo[] = sessions.map(session => ({
        ...session,
        deviceInfo: session.deviceInfo as any,
        deviceName: this.getDeviceNameFromInfo(session.deviceInfo as any),
        deviceType: (session.deviceInfo as any)?.deviceType,
        browser: (session.deviceInfo as any)?.browser,
        os: (session.deviceInfo as any)?.os,
        isCurrentSession: session.refreshToken === currentRefreshToken,
      }));

      return {
        success: true,
        data: {
          sessions: sessionInfos,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get user sessions', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return this.errorResult('Failed to get sessions', 'INTERNAL_ERROR');
    }
  }

  /**
   * Revoke specific session
   */
  async revokeSession(
    adapter: IAuthAdapter,
    userId: string,
    sessionId: string,
    reason: string = 'user_revoked'
  ): Promise<AuthResult<{ success: boolean }>> {
    try {
      this.logger.info('Revoking session', { userId, sessionId, reason });

      await this.revokeSessionById(sessionId, reason);

      this.logger.info('Session revoked', { sessionId });

      return {
        success: true,
        data: {
          success: true,
        },
      };
    } catch (error) {
      this.logger.error('Failed to revoke session', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return this.errorResult('Failed to revoke session', 'INTERNAL_ERROR');
    }
  }

  /**
   * Revoke all sessions for user
   */
  async revokeAllSessions(
    adapter: IAuthAdapter,
    userId: string,
    reason: string = 'user_revoked_all'
  ): Promise<AuthResult<{ success: boolean }>> {
    try {
      this.logger.info('Revoking all sessions', { userId, reason });

      await this.revokeAllUserSessions(userId, reason);

      this.logger.info('All sessions revoked', { userId });

      return {
        success: true,
        data: {
          success: true,
        },
      };
    } catch (error) {
      this.logger.error('Failed to revoke all sessions', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return this.errorResult('Failed to revoke sessions', 'INTERNAL_ERROR');
    }
  }

  /**
   * Detect suspicious activity
   *
   * Checks:
   * - Multiple sessions from different locations
   * - Sessions from unusual locations
   * - Rapid session creation
   */
  async detectSuspiciousActivity(
    adapter: IAuthAdapter,
    userId: string,
    currentIpAddress: string
  ): Promise<AuthResult<{ suspicious: boolean; reasons: string[] }>> {
    try {
      this.logger.info('Checking for suspicious activity', { userId, ip: currentIpAddress });

      const sessions = await this.findActiveSessions(userId);
      const reasons: string[] = [];

      // Check for multiple different IPs
      const uniqueIps = new Set(sessions.map(s => s.ipAddress));
      if (uniqueIps.size > 3) {
        reasons.push('Multiple different IP addresses detected');
      }

      // Check for impossible travel (sessions from different IPs in short time)
      const recentSessions = sessions.filter(s => {
        const lastActive = s.lastActiveAt || s.createdAt;
        return (Date.now() - lastActive.getTime()) < 60 * 60 * 1000; // Last hour
      });

      const recentIps = new Set(recentSessions.map(s => s.ipAddress));
      if (recentIps.size > 2) {
        reasons.push('Impossible travel detected (multiple IPs in short time)');
      }

      // Check for rapid session creation
      const sessionCount = sessions.length;
      if (sessionCount > 10) {
        reasons.push('Unusual number of active sessions');
      }

      const suspicious = reasons.length > 0;

      if (suspicious) {
        this.logger.warn('Suspicious activity detected', {
          userId,
          reasons,
          ip: currentIpAddress,
        });

        // Audit log
        await this.auditLog('SUSPICIOUS_ACTIVITY', userId, currentIpAddress, '', {
          reasons,
          sessionCount,
        });
      }

      return {
        success: true,
        data: {
          suspicious,
          reasons,
        },
      };
    } catch (error) {
      this.logger.error('Failed to detect suspicious activity', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return this.errorResult('Failed to check activity', 'INTERNAL_ERROR');
    }
  }

  /**
   * Parse User-Agent string
   */
  private parseUserAgent(userAgent: string): DeviceInfo {
    const ua = userAgent.toLowerCase();

    // Detect device type
    let deviceType: DeviceInfo['deviceType'] = 'desktop';
    if (/mobile|android|iphone|ipad/i.test(ua)) {
      deviceType = /tablet|ipad/i.test(ua) ? 'tablet' : 'mobile';
    }

    // Detect OS
    let os = 'Unknown';
    if (/windows/i.test(ua)) {
      os = 'Windows';
    } else if (/mac os/i.test(ua)) {
      os = 'macOS';
    } else if (/linux/i.test(ua)) {
      os = 'Linux';
    } else if (/android/i.test(ua)) {
      os = 'Android';
    } else if (/ios/i.test(ua)) {
      os = 'iOS';
    }

    // Detect browser
    let browser = 'Unknown';
    if (/chrome/i.test(ua) && !/edg/i.test(ua)) {
      browser = 'Chrome';
    } else if (/firefox/i.test(ua)) {
      browser = 'Firefox';
    } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
      browser = 'Safari';
    } else if (/edg/i.test(ua)) {
      browser = 'Edge';
    } else if (/opr/i.test(ua)) {
      browser = 'Opera';
    }

    return {
      deviceType,
      os,
      browser,
    };
  }

  /**
   * Get human-readable device name
   */
  private getDeviceName(deviceInfo: DeviceInfo): string {
    const { deviceType, os, browser } = deviceInfo;

    const typeStr = deviceType === 'mobile' ? 'Mobile' :
                    deviceType === 'tablet' ? 'Tablet' : 'Desktop';

    return `${os} ${typeStr} (${browser})`;
  }

  /**
   * Get device name from session deviceInfo
   */
  private getDeviceNameFromInfo(deviceInfo?: DeviceInfo): string {
    if (!deviceInfo) return 'Unknown Device';
    return this.getDeviceName(deviceInfo);
  }

  /**
   * Save session to database
   */
  private async saveSession(options: {
    userId: string;
    refreshToken: string;
    ipAddress: string;
    userAgent: string;
    deviceInfo: DeviceInfo;
    expiresAt: Date;
  }): Promise<ISession> {
    const prisma = await this.getPrismaClient();

    const session = await prisma.session.create({
      data: {
        userId: options.userId,
        refreshToken: options.refreshToken,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        deviceInfo: options.deviceInfo as any,
        expiresAt: options.expiresAt,
      },
    });

    return session as ISession;
  }

  /**
   * Find active sessions for user
   */
  private async findActiveSessions(userId: string): Promise<ISession[]> {
    const prisma = await this.getPrismaClient();

    const sessions = await prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        lastActiveAt: 'desc',
      },
    });

    return sessions as ISession[];
  }

  /**
   * Revoke session by ID
   */
  private async revokeSessionById(sessionId: string, reason: string): Promise<void> {
    const prisma = await this.getPrismaClient();

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });
  }

  /**
   * Revoke all user sessions
   */
  private async revokeAllUserSessions(userId: string, reason: string): Promise<void> {
    const prisma = await this.getPrismaClient();

    await prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });
  }

  /**
   * Cleanup expired sessions
   */
  private async cleanupExpiredSessions(userId: string): Promise<void> {
    const prisma = await this.getPrismaClient();

    await prisma.session.deleteMany({
      where: {
        userId,
        OR: [
          { expiresAt: { lt: new Date() } },
          { revokedAt: { not: null } },
        ],
      },
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
          eventLevel: eventType.includes('SUSPICIOUS') ? 'WARN' : 'INFO',
          userId,
          ipAddress,
          userAgent,
          path: '/auth/session',
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
        type: 'SessionError',
        message,
        code,
      },
    };
  }
}

export default SessionService;
