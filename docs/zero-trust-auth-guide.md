# Zero Trust Authentication Implementation Guide

## Prinsip Zero Trust Security

**Zero Trust** = "Never trust, always verify" - Jangan pernah percaya, selalu verifikasi.

### 4 Pilar Utama:

1. **Verify Explicitly** - Selalu verifikasi identitas user
2. **Least Privilege Access** - Beri akses minimal yang diperlukan
3. **Assume Breach** - Anggap sistem sudah compromised, audit semua
4. **Defense in Depth** - Multiple layers of security

---

## Implementasi Zero Trust di Auth Service

### 1. Service Layer dengan Security Audit

```typescript
// src/services/AuthService.ts

class AuthService extends BaseService<UserRepositoryType> {
  
  // ✅ ZERO TRUST: Audit semua event
  async login(email: string, password: string): Promise<UserWithTokens> {
    const startTime = Date.now();
    const ipAddress = '192.168.1.1'; // Dari request
    const userAgent = 'Mozilla/5.0...'; // Dari request
    
    try {
      // 1. Verify credentials (Jangan percaya input user)
      const user = await this.userRepository.findByEmailWithPassword(email);
      if (!user) {
        // ✅ Audit failed attempt
        await this.auditSecurityEvent('LOGIN_FAILED', null, ipAddress, {
          email,
          reason: 'USER_NOT_FOUND',
        });
        throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
      }

      // 2. Verify password
      const isValid = await this.userRepository.comparePassword(password, user.password);
      if (!isValid) {
        // ✅ Audit failed attempt dengan detail
        await this.auditSecurityEvent('LOGIN_FAILED', user.id, ipAddress, {
          email,
          reason: 'INVALID_PASSWORD',
          attemptCount: await this.getFailedLoginCount(user.id),
        });
        throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
      }

      // 3. Verify account status
      if (user.status !== 'ACTIVE') {
        await this.auditSecurityEvent('LOGIN_BLOCKED', user.id, ipAddress, {
          status: user.status,
        });
        throw new ForbiddenError('Account is not active', 'ACCOUNT_INACTIVE');
      }

      // 4. Generate tokens dengan expiration pendek (Least Privilege)
      const tokens = await this.generateTokens(user.id, user.email, user.role, ipAddress);

      // 5. Audit successful login
      await this.auditSecurityEvent('LOGIN_SUCCESS', user.id, ipAddress, {
        duration: Date.now() - startTime,
      });

      // 6. Update last login (untuk tracking)
      await this.userRepository.updateLastLogin(user.id);

      return { user, tokens };
    } catch (error) {
      // ✅ Audit semua errors
      await this.auditSecurityEvent('LOGIN_ERROR', null, ipAddress, {
        error: error.message,
        email,
      });
      throw error;
    }
  }

  // ✅ ZERO TRUST: Refresh token dengan validasi ketat
  async refreshTokens(refreshToken: string, ipAddress: string): Promise<Tokens> {
    // 1. Verify token exists
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord) {
      await this.auditSecurityEvent('REFRESH_TOKEN_INVALID', null, ipAddress, {
        reason: 'TOKEN_NOT_FOUND',
      });
      throw new UnauthorizedError('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
    }

    // 2. Verify token not revoked
    if (tokenRecord.revokedAt) {
      await this.auditSecurityEvent('REFRESH_TOKEN_REVOKED', tokenRecord.userId, ipAddress, {
        revokedAt: tokenRecord.revokedAt,
        reason: tokenRecord.reason,
      });
      throw new UnauthorizedError('Token has been revoked', 'TOKEN_REVOKED');
    }

    // 3. Verify token not expired
    if (tokenRecord.expiresAt < new Date()) {
      await this.auditSecurityEvent('REFRESH_TOKEN_EXPIRED', tokenRecord.userId, ipAddress, {
        expiresAt: tokenRecord.expiresAt,
      });
      throw new UnauthorizedError('Token has expired', 'TOKEN_EXPIRED');
    }

    // 4. Verify IP consistency (detect potential token theft)
    const ipMismatch = await this.detectSuspiciousActivity(tokenRecord.userId, ipAddress);
    if (ipMismatch) {
      await this.auditSecurityEvent('SUSPICIOUS_ACTIVITY', tokenRecord.userId, ipAddress, {
        type: 'IP_MISMATCH_ON_REFRESH',
      });
      // ✅ Assume breach - revoke all tokens
      await this.revokeAllUserTokens(tokenRecord.userId, 'SUSPICIOUS_ACTIVITY');
      throw new ForbiddenError('Suspicious activity detected', 'SECURITY_ALERT');
    }

    // 5. Generate new tokens
    const tokens = this.generateTokens(tokenRecord.user);

    // 6. Revoke old token (single use refresh tokens)
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: {
        revokedAt: new Date(),
        reason: 'replaced',
        replacedByToken: tokens.refreshToken,
      },
    });

    await this.auditSecurityEvent('TOKEN_REFRESHED', tokenRecord.userId, ipAddress);

    return tokens;
  }

  // ✅ ZERO TRUST: Security Audit Trail
  private async auditSecurityEvent(
    eventType: string,
    userId: string | null,
    ipAddress: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.prisma.securityAudit.create({
      data: {
        eventType,
        eventLevel: this.getEventLevel(eventType),
        userId,
        ipAddress,
        userAgent: metadata.userAgent || null,
        path: '/api/auth',
        method: 'POST',
        statusCode: metadata.error ? 401 : 200,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  // ✅ ZERO TRUST: Detect suspicious patterns
  private async detectSuspiciousActivity(userId: string, ipAddress: string): Promise<boolean> {
    const recentLogins = await this.prisma.securityAudit.findMany({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }, // Last 5 minutes
        eventType: 'LOGIN_SUCCESS',
      },
    });

    // Check for impossible travel (logins from different IPs in short time)
    const differentIp = recentLogins.some(log => {
      const meta = log.metadata as any;
      return meta.ipAddress && meta.ipAddress !== ipAddress;
    });

    return differentIp;
  }

  // ✅ ZERO TRUST: Revoke all tokens on suspicion
  private async revokeAllUserTokens(userId: string, reason: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), reason },
    });
  }
}
```

---

### 2. Controller dengan Input Validation

```typescript
// src/controllers/AuthController.ts

class AuthController extends BaseController<AuthServiceType> {
  
  // ✅ ZERO TRUST: Validate ALL input
  login = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Login');

    const { email, password } = req.body;

    // 1. Validate input exists
    if (!email || !password) {
      throw new BadRequestError('Email and password are required', 'MISSING_CREDENTIALS');
    }

    // 2. Validate format (prevent injection attacks)
    if (!this.isValidEmail(email)) {
      throw new BadRequestError('Invalid email format', 'INVALID_EMAIL');
    }

    // 3. Rate limiting check (prevent brute force)
    const rateLimitKey = `login:${email}`;
    const attempts = await this.getRateLimitAttempts(rateLimitKey);
    if (attempts > 5) {
      throw new TooManyRequestsError('Too many login attempts', 'RATE_LIMIT_EXCEEDED');
    }

    // 4. Get IP and User-Agent for audit
    const ipAddress = this.getClientIp(req);
    const userAgent = req.get('User-Agent');

    // 5. Call service dengan context security
    const result = await this.service.login(email, password, {
      ipAddress,
      userAgent,
    });

    // 6. Set secure headers
    this.setSecurityHeaders(res);

    this.sendSuccess(res, result);
  });

  // ✅ ZERO TRUST: Secure token refresh
  refreshTokens = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Refresh Tokens');

    const { refreshToken } = req.body;

    // 1. Validate token exists
    if (!refreshToken) {
      throw new BadRequestError('Refresh token is required', 'MISSING_TOKEN');
    }

    // 2. Validate token format (UUID)
    if (!this.isValidUUID(refreshToken)) {
      throw new BadRequestError('Invalid token format', 'INVALID_TOKEN');
    }

    const ipAddress = this.getClientIp(req);
    const userAgent = req.get('User-Agent');

    const result = await this.service.refreshTokens(refreshToken, {
      ipAddress,
      userAgent,
    });

    this.sendSuccess(res, result);
  });

  // ✅ ZERO TRUST: Secure logout
  logout = this.handle(async (req: Request, res: Response) => {
    this.logRequest(req, 'Logout');

    const userId = (req as any).user?.id;
    const ipAddress = this.getClientIp(req);

    // 1. Revoke current token
    await this.service.logout(userId, ipAddress);

    // 2. Clear cookies securely
    this.clearSecureCookies(res);

    this.sendSuccess(res, { message: 'Logged out successfully' });
  });

  // ✅ Helper: Security headers
  private setSecurityHeaders(res: Response): void {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // ✅ Helper: Get client IP (handle proxies)
  private getClientIp(req: Request): string {
    const forwarded = req.get('X-Forwarded-For');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }
}
```

---

### 3. Rate Limiting Middleware

```typescript
// src/middlewares/rateLimiter.ts

import rateLimit from 'express-rate-limit';

// ✅ ZERO TRUST: Strict rate limits untuk auth endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    error: {
      type: 'TooManyRequestsError',
      message: 'Too many login attempts, please try again later',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by email (prevent distributed brute force)
    return req.body.email?.toLowerCase() || req.ip;
  },
  handler: async (req, res) => {
    // ✅ Audit rate limit hits
    await auditSecurityEvent('RATE_LIMIT_HIT', null, req.ip, {
      endpoint: '/api/auth/login',
      email: req.body.email,
    });
    res.status(429).json({
      success: false,
      error: {
        type: 'TooManyRequestsError',
        message: 'Too many attempts',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
      },
    });
  },
});
```

---

## Checklist Zero Trust Implementation

### ✅ Authentication:
- [ ] Validate semua input (format, type, length)
- [ ] Hash password dengan bcrypt (min 12 rounds)
- [ ] Use short-lived access tokens (15 min - 1 hour)
- [ ] Use single-use refresh tokens
- [ ] Audit semua login attempts (success & failed)
- [ ] Rate limiting per email/IP
- [ ] Detect suspicious patterns (impossible travel)
- [ ] Revoke tokens on suspicious activity

### ✅ Authorization:
- [ ] Verify JWT signature on EVERY request
- [ ] Check token expiration
- [ ] Validate user permissions/role
- [ ] Log all access attempts

### ✅ Data Protection:
- [ ] Never log passwords/tokens
- [ ] Use HTTPS only
- [ ] Set secure cookie flags (HttpOnly, Secure, SameSite)
- [ ] Sanitize all outputs

### ✅ Monitoring:
- [ ] Log all security events
- [ ] Alert on suspicious patterns
- [ ] Track failed login attempts
- [ ] Monitor token refresh anomalies

---

## Contoh Flow Login dengan Zero Trust

```
User Login Request
    ↓
1. Rate Limit Check (prevent brute force)
    ↓
2. Input Validation (email format, password exists)
    ↓
3. Find User (with password hash)
    ↓
4. Verify Password (bcrypt compare)
    ↓
5. Check Account Status (ACTIVE?)
    ↓
6. Check Suspicious Activity (IP consistency)
    ↓
7. Generate Tokens (short expiration)
    ↓
8. Save Refresh Token (with expiration)
    ↓
9. Audit Security Event (LOGIN_SUCCESS)
    ↓
10. Return Tokens (never log them)
```

---

## Testing Zero Trust Auth

```typescript
// tests/unit/services/AuthService.test.ts

describe('AuthService - Zero Trust', () => {
  it('should audit failed login attempts', async () => {
    await expect(authService.login('wrong@email.com', 'wrongpass'))
      .rejects.toThrow(UnauthorizedError);
    
    const auditLogs = await prisma.securityAudit.findMany({
      where: { eventType: 'LOGIN_FAILED' },
    });
    expect(auditLogs.length).toBeGreaterThan(0);
  });

  it('should detect suspicious IP activity', async () => {
    // Login from IP 1
    await authService.login(user.email, password, { ipAddress: '1.1.1.1' });
    
    // Refresh from IP 2 (should trigger alert)
    await expect(authService.refreshTokens(token, { ipAddress: '2.2.2.2' }))
      .rejects.toThrow(ForbiddenError);
  });

  it('should revoke all tokens on suspicious activity', async () => {
    // Trigger suspicious activity
    try {
      await authService.refreshTokens(token, { ipAddress: 'suspicious-ip' });
    } catch (e) {}
    
    const activeTokens = await prisma.refreshToken.count({
      where: { userId: user.id, revokedAt: null },
    });
    expect(activeTokens).toBe(0);
  });
});
```

---

## Key Takeaways

1. **Trust No One** - Verify EVERY request, EVERY time
2. **Audit Everything** - Log all security events
3. **Assume Breach** - Detect and respond to anomalies
4. **Least Privilege** - Short token expiration, minimal permissions
5. **Defense in Depth** - Multiple security layers (rate limit, validation, audit)
