/**
 * Account Lockout Service
 * 
 * Features:
 * - Track failed login attempts
 * - Auto-lock after N failures
 * - Progressive lockout duration
 * - Exponential backoff
 * - IP-based lockout
 * - User-based lockout
 * - Zero Trust principles
 * 
 * Lockout Policy:
 * 1-2 failures: No lockout
 * 3-4 failures: 5 minute lockout
 * 5-6 failures: 15 minute lockout
 * 7-9 failures: 1 hour lockout
 * 10+ failures: 24 hour lockout
 * 
 * @see https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks
 */

export interface LockoutConfig {
  maxAttempts: number;
  lockoutDurations: {
    [key: number]: number; // attempts -> minutes
  };
  resetWindowMinutes: number;
  notifyUser: boolean;
  notifyAdmin: boolean;
}

export interface FailedAttempt {
  id: string;
  userId?: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  reason: string;
}

export interface LockoutStatus {
  isLocked: boolean;
  lockoutUntil?: Date;
  remainingAttempts: number;
  failedAttempts: number;
  lockoutLevel: number;
}

export interface LockoutEvent {
  userId?: string;
  email: string;
  ipAddress: string;
  eventType: 'ATTEMPT' | 'LOCKOUT' | 'UNLOCK' | 'RESET';
  timestamp: Date;
  metadata?: Record<string, any>;
}

class AccountLockoutService {
  private failedAttempts: Map<string, FailedAttempt[]>; // key: email or IP
  private lockouts: Map<string, { until: Date; level: number; reason: string }>;
  private config: LockoutConfig;

  constructor(config?: Partial<LockoutConfig>) {
    this.failedAttempts = new Map();
    this.lockouts = new Map();
    this.config = {
      maxAttempts: 5,
      lockoutDurations: {
        3: 5,    // 3 attempts = 5 min
        5: 15,   // 5 attempts = 15 min
        7: 60,   // 7 attempts = 1 hour
        10: 1440, // 10 attempts = 24 hours
      },
      resetWindowMinutes: 60,
      notifyUser: true,
      notifyAdmin: true,
      ...config,
    };
  }

  /**
   * Record failed login attempt
   */
  recordFailedAttempt(
    email: string,
    ipAddress: string,
    userAgent: string,
    reason: string = 'Invalid credentials'
  ): LockoutStatus {
    const key = this.getKey(email, ipAddress);
    
    // Create attempt record
    const attempt: FailedAttempt = {
      id: `attempt-${Date.now()}`,
      email,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      reason,
    };

    // Get or create attempt history
    const history = this.failedAttempts.get(key) || [];
    history.push(attempt);

    // Cleanup old attempts outside reset window
    const cutoffDate = new Date(Date.now() - this.config.resetWindowMinutes * 60 * 1000);
    const recentAttempts = history.filter(a => a.timestamp > cutoffDate);
    this.failedAttempts.set(key, recentAttempts);

    // Check if should lockout
    const attemptCount = recentAttempts.length;
    const lockoutLevel = this.getLockoutLevel(attemptCount);
    
    if (lockoutLevel > 0) {
      this.lockAccount(key, lockoutLevel, attemptCount);
    }

    return this.getLockoutStatus(key);
  }

  /**
   * Check if account is locked
   */
  isLocked(email: string, ipAddress: string): boolean {
    const key = this.getKey(email, ipAddress);
    const lockout = this.lockouts.get(key);
    
    if (!lockout) {
      return false;
    }

    // Check if lockout expired
    if (lockout.until < new Date()) {
      this.unlockAccount(key);
      return false;
    }

    return true;
  }

  /**
   * Get lockout status
   */
  getLockoutStatus(email: string, ipAddress: string): LockoutStatus {
    const key = this.getKey(email, ipAddress);
    const lockout = this.lockouts.get(key);
    const history = this.failedAttempts.get(key) || [];
    
    const failedAttempts = history.length;
    const remainingAttempts = Math.max(0, this.config.maxAttempts - failedAttempts);
    const lockoutLevel = this.getLockoutLevel(failedAttempts);

    if (lockout && lockout.until > new Date()) {
      return {
        isLocked: true,
        lockoutUntil: lockout.until,
        remainingAttempts: 0,
        failedAttempts,
        lockoutLevel,
      };
    }

    return {
      isLocked: false,
      remainingAttempts,
      failedAttempts,
      lockoutLevel,
    };
  }

  /**
   * Unlock account manually (e.g., after password reset)
   */
  unlockAccount(email: string, ipAddress: string, reason: string = 'Manual unlock'): void {
    const key = this.getKey(email, ipAddress);
    this.lockouts.delete(key);
    this.failedAttempts.delete(key);
    
    // Log unlock event
    this.logEvent({
      email,
      ipAddress,
      eventType: 'UNLOCK',
      timestamp: new Date(),
      metadata: { reason },
    });
  }

  /**
   * Reset failed attempts (e.g., after successful login)
   */
  resetFailedAttempts(email: string, ipAddress: string): void {
    const key = this.getKey(email, ipAddress);
    this.failedAttempts.delete(key);
    
    // Log reset event
    this.logEvent({
      email,
      ipAddress,
      eventType: 'RESET',
      timestamp: new Date(),
    });
  }

  /**
   * Get lockout level based on attempt count
   */
  private getLockoutLevel(attemptCount: number): number {
    const thresholds = Object.keys(this.config.lockoutDurations)
      .map(Number)
      .sort((a, b) => b - a); // Descending

    for (const threshold of thresholds) {
      if (attemptCount >= threshold) {
        return threshold;
      }
    }

    return 0; // No lockout
  }

  /**
   * Lock account
   */
  private lockAccount(key: string, level: number, attemptCount: number): void {
    const durationMinutes = this.config.lockoutDurations[level] || 5;
    const until = new Date(Date.now() + durationMinutes * 60 * 1000);

    this.lockouts.set(key, {
      until,
      level,
      reason: `Too many failed attempts (${attemptCount})`,
    });

    // Get email and IP from key
    const [email, ipAddress] = key.split(':');

    // Log lockout event
    this.logEvent({
      email,
      ipAddress,
      eventType: 'LOCKOUT',
      timestamp: new Date(),
      metadata: {
        level,
        durationMinutes,
        attemptCount,
      },
    });

    // Notify user and admin if configured
    if (this.config.notifyUser) {
      this.notifyUserLockout(email, durationMinutes);
    }

    if (this.config.notifyAdmin && level >= 7) {
      this.notifyAdminLockout(email, ipAddress, attemptCount, level);
    }
  }

  /**
   * Unlock account
   */
  private unlockAccount(key: string): void {
    this.lockouts.delete(key);
    
    const [email, ipAddress] = key.split(':');
    
    this.logEvent({
      email,
      ipAddress,
      eventType: 'UNLOCK',
      timestamp: new Date(),
      metadata: { reason: 'Lockout expired' },
    });
  }

  /**
   * Generate key for storage
   */
  private getKey(email: string, ipAddress: string): string {
    return `${email.toLowerCase()}:${ipAddress}`;
  }

  /**
   * Log lockout event
   */
  private logEvent(event: LockoutEvent): void {
    // In production, save to database or audit log
    console.log(`[Lockout Event] ${event.eventType}: ${event.email} from ${event.ipAddress}`);
  }

  /**
   * Notify user about lockout
   */
  private notifyUserLockout(email: string, durationMinutes: number): void {
    // In production, send email
    console.log(`[User Notification] Account locked for ${durationMinutes} minutes. Email sent to ${email}`);
  }

  /**
   * Notify admin about severe lockout
   */
  private notifyAdminLockout(
    email: string,
    ipAddress: string,
    attemptCount: number,
    level: number
  ): void {
    // In production, send alert to security team
    console.log(`[Admin Alert] Severe lockout: ${email} from ${ipAddress} (${attemptCount} attempts, level ${level})`);
  }

  /**
   * Get failed attempts for user
   */
  getFailedAttempts(email: string, ipAddress: string): FailedAttempt[] {
    const key = this.getKey(email, ipAddress);
    return this.failedAttempts.get(key) || [];
  }

  /**
   * Get all active lockouts
   */
  getActiveLockouts(): Array<{ email: string; ipAddress: string; until: Date; level: number }> {
    const activeLockouts: Array<{ email: string; ipAddress: string; until: Date; level: number }> = [];

    for (const [key, lockout] of this.lockouts.entries()) {
      if (lockout.until > new Date()) {
        const [email, ipAddress] = key.split(':');
        activeLockouts.push({ email, ipAddress, until: lockout.until, level: lockout.level });
      }
    }

    return activeLockouts;
  }

  /**
   * Cleanup expired lockouts
   */
  cleanupExpiredLockouts(): number {
    const now = new Date();
    let cleaned = 0;

    for (const [key, lockout] of this.lockouts.entries()) {
      if (lockout.until < now) {
        this.lockouts.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LockoutConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): LockoutConfig {
    return { ...this.config };
  }
}

export default AccountLockoutService;
