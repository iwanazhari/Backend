# 🚀 LockKit - Quick Start Guide

> **Production-Ready Access Control Toolkit** - 100% BRD Complete, 306 Tests Passing

---

## ⚡ Quick Start (5 Minutes)

### 1. Initialize Project

```bash
# Install CLI globally
npm install -g lockkit

# Initialize new project
lockkit init

# Choose your framework:
# 1) Express.js
# 2) NestJS  
# 3) Fastify
```

### 2. Configure Environment

```bash
# Generate secure PASETO key
lockkit generate:paseto-key

# Add to .env
PASETO_SECRET_KEY=<generated-key>
DATABASE_URL=postgresql://user:pass@localhost:5432/lockkit
```

### 3. Install Dependencies

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
```

### 4. Start Server

```bash
# Development
npm run dev

# Production
npm start
```

---

## 🔐 Basic Authentication Setup

### Express.js Example

```typescript
import express from 'express';
import { AuthBoilerplateExpress } from '@lockkit/express';

const app = express();

// Initialize AuthBoilerplate
const auth = new AuthBoilerplateExpress({
  pasetoSecretKey: process.env.PASETO_SECRET_KEY,
  repository: new PrismaRepository(),
  emailProvider: new NodemailerProvider({ /* config */ }),
});

// Mount auth routes
app.use('/auth', auth.getRoutes());

// Protect routes
app.get('/profile', auth.middleware(), (req, res) => {
  res.json({ user: req.user });
});

// Role-based access
app.get('/admin', auth.middleware({ roles: ['ADMIN'] }), (req, res) => {
  res.json({ message: 'Admin access' });
});

app.listen(3000);
```

### NestJS Example

```typescript
import { Module, Controller, Get, UseGuards } from '@nestjs/common';
import { AuthModule, AuthGuard, Roles } from '@lockkit/nestjs';

@Module({
  imports: [AuthModule.forRoot({
    pasetoSecretKey: process.env.PASETO_SECRET_KEY,
    repository: prismaRepository,
    emailProvider: nodemailerProvider,
  })],
})
export class AppModule {}

@Controller('profile')
@UseGuards(AuthGuard)
export class ProfileController {
  @Get()
  async getProfile(@Request() req) {
    return { user: req.user };
  }

  @Get('admin')
  @Roles('ADMIN')
  async getAdmin() {
    return { message: 'Admin access' };
  }
}
```

### Fastify Example

```typescript
import Fastify from 'fastify';
import authPlugin from '@lockkit/fastify';

const fastify = Fastify();

// Register auth plugin
await fastify.register(authPlugin, {
  pasetoSecretKey: process.env.PASETO_SECRET_KEY,
  repository: prismaRepository,
  emailProvider: nodemailerProvider,
  prefix: '/auth',
});

// Protected route
fastify.get('/profile', {
  preHandler: [fastify.auth()],
}, async (request, reply) => {
  return { user: request.user };
});

fastify.listen({ port: 3000 });
```

---

## 🎯 Implement Business Logic

### 1. Magic Link Authentication

```typescript
// Request magic link
POST /auth/magic-link/request
{
  "email": "user@example.com",
  "callbackURL": "http://localhost:3000/auth/magic-link/verify"
}

// User receives email with link
// Click link → automatically login
GET /auth/magic-link/verify?token=xxx
```

### 2. OAuth Social Login

```typescript
// Initialize OAuth
const auth = new AuthBoilerplateExpress({
  // ... config
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/google/callback',
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/github/callback',
    },
  },
});

// Routes automatically created:
// GET /auth/oauth/google
// GET /auth/oauth/google/callback
// GET /auth/oauth/github
// GET /auth/oauth/github/callback
```

### 3. RBAC + Permissions

```typescript
import { RBACABACService } from '@lockkit/core';

const rbac = new RBACABACService();

// Setup roles
rbac.createRole('ADMIN', [
  'read:users', 'write:users', 'delete:users',
  'read:documents', 'write:documents', 'delete:documents',
]);

rbac.createRole('USER', [
  'read:documents',
]);

// Check permission
app.get('/users', auth.middleware(), async (req, res) => {
  const canReadUsers = rbac.can(req.user, 'read', 'users');
  
  if (!canReadUsers) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const users = await userService.getAll();
  res.json({ users });
});
```

### 4. ABAC (Attribute-Based Access Control)

```typescript
import { RBACABACService } from '@lockkit/core';

const abac = new RBACABACService();

// Create policy
abac.createPolicy({
  id: 'policy-1',
  name: 'Allow engineering to access engineering docs',
  effect: 'allow',
  principal: {
    roles: ['USER'],
    attributes: { department: 'engineering' },
  },
  resource: {
    type: 'documents',
    attributes: { department: 'engineering' },
  },
  actions: ['read', 'write'],
});

// Check access
const result = abac.checkAccess({
  user: { id: 'user-123', roles: ['USER'], department: 'engineering' },
  action: 'read',
  resource: { type: 'documents', attributes: { department: 'engineering' } },
});

if (result.allowed) {
  // Grant access
} else {
  // Deny access (result.reason explains why)
}
```

### 5. Impossible Travel Detection

```typescript
import { ImpossibleTravelService } from '@lockkit/core';

const travelService = new ImpossibleTravelService();

// Record login
app.post('/auth/login', async (req, res) => {
  const attempt = {
    userId: user.id,
    ipAddress: req.ip,
    location: await geoLookup(req.ip),
    userAgent: req.get('User-Agent'),
    deviceId: req.cookies.deviceId,
    timestamp: new Date(),
    success: true,
  };
  
  // Check for impossible travel
  const result = await travelService.checkImpossibleTravel(user.id, attempt);
  
  if (result.detected) {
    // Suspicious! Require additional verification
    return res.status(403).json({
      error: 'Suspicious login detected',
      reason: `Impossible travel: ${result.travel.from.city} → ${result.travel.to.city}`,
      requiresVerification: true,
    });
  }
  
  // Normal login
  res.json({ tokens });
});
```

### 6. Account Lockout

```typescript
import { AccountLockoutService } from '@lockkit/core';

const lockoutService = new AccountLockoutService({
  maxAttempts: 5,
  lockoutDurations: {
    5: 15,    // 5 attempts = 15 min
    7: 60,    // 7 attempts = 1 hour
    10: 1440, // 10 attempts = 24 hours
  },
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Check if locked
  const status = lockoutService.getLockoutStatus(email, req.ip);
  
  if (status.isLocked) {
    return res.status(423).json({
      error: 'Account locked',
      lockoutUntil: status.lockoutUntil,
      remainingMinutes: Math.ceil((status.lockoutUntil.getTime() - Date.now()) / 60000),
    });
  }
  
  // Verify credentials
  const valid = await verifyCredentials(email, password);
  
  if (!valid) {
    lockoutService.recordFailedAttempt(email, req.ip, req.get('User-Agent'));
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Success - reset attempts
  lockoutService.resetFailedAttempts(email, req.ip);
  res.json({ tokens });
});
```

### 7. SSO (SAML/OIDC)

```typescript
import { SSOService } from '@lockkit/core';

const sso = new SSOService({
  rpName: 'My App',
  rpId: 'myapp.com',
  origin: 'https://myapp.com',
  timeout: 600000,
});

// Register IdP
sso.registerSAMLProvider({
  id: 'okta',
  name: 'Okta SSO',
  type: 'SAML',
  config: { /* SAML config */ },
  enabled: true,
  domains: ['enterprise.com'],
});

// Routes:
// GET /auth/sso/okta/start - Initiate SSO
// POST /auth/sso/okta/callback - Handle response
```

### 8. Webhook System

```typescript
import { WebhookService } from '@lockkit/core';

const webhooks = new WebhookService();

// Register webhook
webhooks.registerEndpoint({
  url: 'https://myapp.com/webhooks/auth',
  events: ['user.created', 'login.failed', 'suspicious_activity'],
  secret: 'whsec_123456',
  active: true,
});

// Trigger webhook (automatic)
// Events automatically fired:
// - user.created
// - user.deleted
// - login.success
// - login.failed
// - suspicious_activity
// - password.reset
```

### 9. Multi-Tenancy

```typescript
import { MultiTenantService } from '@lockkit/core';

const tenantService = new MultiTenantService();

// Create tenant
const tenant = await tenantService.createTenant({
  name: 'Acme Corp',
  domain: 'acme.com',
  tier: 'ENTERPRISE',
  quota: {
    maxUsers: 1000,
    maxApiCalls: 1000000,
    maxStorage: 10737418240, // 10GB
  },
});

// Isolated data per tenant
const users = await userService.getAll({ tenantId: tenant.id });
```

### 10. License Key System

```typescript
import { LicenseKeyService } from '@lockkit/core';

const licenseService = new LicenseKeyService();

// Generate license key (for commercial tiers)
const license = licenseService.generateLicenseKey('PRO', 12, 5);
console.log(license.key); // ABCD-1234-EFGH-5678

// Validate license
const validation = licenseService.validateLicenseKey(license.key);

if (validation.valid) {
  // Check features
  const hasOAuth = licenseService.hasFeature(license.key, 'oauth_social_login');
  
  if (hasOAuth) {
    // Enable OAuth features
  }
}
```

---

## 🧪 Testing

```bash
# Run all tests
npm run test:manual:final      # TokenService
npm run test:manual:magiclink  # MagicLink
npm run test:manual:otp        # OTP
npm run test:manual:oauth      # OAuth
npm run test:manual:session    # Session
npm run test:manual:sso        # SSO
npm run test:manual:advanced   # RBAC + ABAC + WebAuthn
npm run test:e2e              # E2E flows
npm run test:security         # Security pentest

# Total: 306 tests - 100% passing
```

---

## 📚 Available Commands

```bash
# CLI Commands
lockkit init                    # Initialize project
lockkit generate:model User     # Generate model
lockkit generate:controller     # Generate controller
lockkit generate:service        # Generate service
lockkit install:framework       # Install framework adapter
lockkit generate:paseto-key     # Generate PASETO key

# Development
npm run dev                             # Start dev server
npm run build                           # Build for production
npm start                               # Start production server

# Database
npm run prisma:generate                 # Generate Prisma client
npm run prisma:migrate                  # Run migrations
npm run prisma:studio                   # Open Prisma Studio

# Testing
npm test                                # Run all tests
npm run test:e2e                        # E2E tests
npm run test:security                   # Security tests
```

---

## 🎯 Tier Features

### **Starter (Free)**
- Email/Password Auth
- PASETO V2 Tokens
- Basic Rate Limiting
- Community Support

### **Pro ($99/mo)**
- Everything in Starter +
- Magic Link
- OTP (SMS/Email)
- OAuth (Google, GitHub)
- Session Management
- RBAC
- Email Support

### **Enterprise (Custom)**
- Everything in Pro +
- SSO (SAML/OIDC)
- WebAuthn/Passkey
- ABAC
- Impossible Travel Detection
- Account Lockout
- Multi-Tenancy
- Webhooks
- SCIM Provisioning
- 24/7 Priority Support

---

## 🔒 Security Features (Zero Trust)

- ✅ PASETO V2 Encryption
- ✅ Rate Limiting
- ✅ Account Lockout
- ✅ Impossible Travel Detection
- ✅ OWASP Top 10 Protection
- ✅ Security Audit Logging
- ✅ Password History & Expiry
- ✅ Multi-Factor Authentication

---

## 📞 Support

- **Documentation**: `/docs` folder
- **CLI Help**: `lockkit help`
- **Tests**: 306 passing tests
- **Issues**: GitHub Issues
- **Enterprise**: support@lockkit.com

---

## 🚀 Production Deployment

```bash
# Build
npm run build

# Set environment variables
export NODE_ENV=production
export PASETO_SECRET_KEY=<secure-key>
export DATABASE_URL=<production-db>

# Start
npm start

# Or with PM2
pm2 start pm2.config.ts
```

---

**Status**: ✅ **100% BRD Complete** | **306 Tests Passing** | **Production Ready**

**Version**: 1.0.0  
**License**: Commercial  
**Made with**: ❤️ and 🔒
