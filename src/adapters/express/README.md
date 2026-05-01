# AuthBoilerplate for Express.js

Complete authentication solution for Express.js applications with support for:
- 🔐 PASETO V2 tokens
- ✉️ Magic Link (passwordless)
- 📱 OTP (coming soon)
- 🔗 Social Login (coming soon)
- 💻 Session Management (coming soon)

---

## 📦 Installation

```bash
npm install @authboilerplate/core @authboilerplate/express
```

---

## 🚀 Quick Start

### 1. Basic Setup

```typescript
import express from 'express';
import { AuthBoilerplateExpress } from '@authboilerplate/express';
import { PrismaRepository } from '@authboilerplate/prisma';
import { NodemailerProvider } from '@authboilerplate/nodemailer';

const app = express();

// Initialize AuthBoilerplate
const auth = new AuthBoilerplateExpress({
  pasetoSecretKey: process.env.PASETO_SECRET_KEY,
  repository: new PrismaRepository(),
  emailProvider: new NodemailerProvider({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  }),
  magicLinkExpiration: 15, // minutes
});

// Mount auth routes
app.use('/auth', auth.getRoutes());

// Protect routes
app.get('/profile', auth.middleware(), (req, res) => {
  res.json({ user: req.user });
});

// Role-based access
app.get('/admin', auth.middleware({ roles: ['ADMIN'] }), (req, res) => {
  res.json({ message: 'Admin access granted' });
});
```

---

## 📋 API Reference

### AuthBoilerplateExpress

#### Constructor Options

```typescript
interface AuthBoilerplateExpressOptions {
  // Required
  pasetoSecretKey: string;     // Your PASETO V2 secret key
  repository: IRepository;      // Database repository
  emailProvider: IEmailProvider; // Email service
  
  // Optional
  cacheProvider?: ICacheProvider;  // For rate limiting
  logger?: ILogger;                // Custom logger
  
  // Configuration
  tokenExpiration?: number;        // Access token TTL in seconds (default: 900)
  refreshExpiration?: number;      // Refresh token TTL in days (default: 7)
  magicLinkExpiration?: number;    // Magic link TTL in minutes (default: 15)
  callbackURL?: string;            // Default callback URL for magic links
}
```

#### Methods

```typescript
// Get Express router with all auth routes
auth.getRoutes(): Router

// Get authentication middleware
auth.middleware(options?: {
  roles?: string[];    // Required roles
  optional?: boolean;  // Don't fail if no token
}): Middleware

// Get optional auth middleware (never fails)
auth.optionalAuth(): Middleware

// Get role authorization middleware
auth.authorize(...roles: string[]): Middleware

// Get services
auth.getMagicLinkService(): MagicLinkService
auth.getTokenService(): TokenService
auth.getConfig(): AuthConfig
```

---

## 📝 Usage Examples

### Magic Link Authentication

#### Request Magic Link

```typescript
// Frontend: Send magic link
fetch('/auth/magic-link/request', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    callbackURL: 'http://localhost:3000/auth/magic-link/verify',
  }),
});
```

#### Verify Magic Link

```typescript
// User clicks link in email: /auth/magic-link/verify?token=xxx
// Backend handles automatically via route
// Redirects to /dashboard on success
```

### Protected Routes

#### Basic Protection

```typescript
app.get('/profile', auth.middleware(), (req, res) => {
  // req.user is available
  res.json({
    user: req.user,
  });
});
```

#### Role-Based Access

```typescript
// Admin only
app.get('/admin/users', auth.middleware({ roles: ['ADMIN'] }), (req, res) => {
  res.json({ users: [] });
});

// Multiple roles
app.post('/posts', auth.middleware({ roles: ['USER', 'ADMIN'] }), (req, res) => {
  res.json({ message: 'Post created' });
});
```

#### Optional Authentication

```typescript
// Public route, but attach user if logged in
app.get('/posts', auth.optionalAuth(), (req, res) => {
  if (req.user) {
    // Show personalized content
  } else {
    // Show public content
  }
  res.json({ posts: [] });
});
```

### Manual Token Handling

#### Generate Tokens

```typescript
import { TokenService } from '@authboilerplate/express';

const tokens = await TokenService.generateTokenPair(
  userId,
  email,
  role
);

// tokens.accessToken (PASETO V2, 15 min)
// tokens.refreshToken (UUID, 7 days)
```

#### Verify Tokens

```typescript
const user = await TokenService.extractUser(accessToken);
// user = { id, email, role, jti }
```

---

## 🔧 Configuration

### Environment Variables

```env
# Required
PASETO_SECRET_KEY=your-32-byte-secret-key

# Email (for Magic Link)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
EMAIL_FROM=noreply@yourapp.com

# Optional
NODE_ENV=production
```

### Generate PASETO Key

```bash
# If using @authboilerplate/cli
npx @authboilerplate/cli generate:paseto-key

# Or manually
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 🍪 Cookie Configuration

By default, tokens are set as HTTP-only cookies:

```typescript
// Access token cookie
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000, // 15 minutes
}

// Refresh token cookie
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
}
```

---

## 🚨 Error Handling

All errors follow this format:

```typescript
{
  success: false,
  error: {
    type: string;      // Error type (e.g., 'UnauthorizedError')
    message: string;   // Human-readable message
    code: string;      // Machine-readable code (e.g., 'TOKEN_INVALID')
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `TOKEN_REQUIRED` | 401 | No token provided |
| `TOKEN_INVALID` | 401 | Token is invalid or expired |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required role |
| `INVALID_EMAIL` | 400 | Email format is invalid |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 📚 Advanced Usage

### Custom Token Extraction

```typescript
import { authMiddleware } from '@authboilerplate/express';

app.use(authMiddleware({
  // Custom logger
  logger: {
    info: (msg) => winston.info(msg),
    error: (msg) => winston.error(msg),
  },
  
  // Custom roles
  roles: ['ADMIN', 'MODERATOR'],
}));
```

### Combining Middlewares

```typescript
// With other Express middlewares
app.use(
  '/admin',
  helmet(),           // Security headers
  cors(),             // CORS
  auth.middleware({ roles: ['ADMIN'] }), // Auth
  adminController     // Your controller
);
```

### Custom Response Format

```typescript
// Override default response in routes
app.use('/auth', (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    return originalJson({
      success: true,
      data: data,
      timestamp: new Date().toISOString(),
    });
  };
  next();
}, auth.getRoutes());
```

---

## 🧪 Testing

### Mock Authentication in Tests

```typescript
import { TokenService } from '@authboilerplate/express';

// Generate test token
const tokens = await TokenService.generateTokenPair(
  'test-user-id',
  'test@example.com',
  'USER'
);

// Use in tests
const response = await request(app)
  .get('/profile')
  .set('Authorization', `Bearer ${tokens.accessToken}`)
  .expect(200);
```

---

## 🔒 Security Best Practices

1. **Always use HTTPS in production**
   ```typescript
   app.set('trust proxy', 1); // Trust proxy for HTTPS detection
   ```

2. **Set secure cookies**
   ```typescript
   // Already default in production
   secure: process.env.NODE_ENV === 'production'
   ```

3. **Use rate limiting**
   ```typescript
   import rateLimit from 'express-rate-limit';
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100, // limit each IP to 100 requests per windowMs
   });
   
   app.use('/auth', limiter);
   ```

4. **Enable CORS properly**
   ```typescript
   import cors from 'cors';
   
   app.use(cors({
     origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
     credentials: true,
   }));
   ```

---

## 📦 Package Exports

```typescript
// Main class
import { AuthBoilerplateExpress } from '@authboilerplate/express';

// Adapters
import { ExpressAdapter } from '@authboilerplate/express';

// Middlewares
import { authMiddleware, optionalAuthMiddleware, authorizeRoles } from '@authboilerplate/express';

// Services
import { MagicLinkService, TokenService } from '@authboilerplate/express';

// Routes
import { createAuthRoutes } from '@authboilerplate/express';
```

---

## 🆘 Troubleshooting

### "No token provided" error

**Problem**: Token not being sent  
**Solution**: Check Authorization header or cookies

```typescript
// Client side
fetch('/profile', {
  headers: {
    'Authorization': 'Bearer ' + accessToken
  }
});
```

### "Invalid token" error

**Problem**: Token expired or invalid  
**Solution**: Request new tokens or re-login

### Magic link not received

**Problem**: Email not sent  
**Solution**: Check SMTP configuration and spam folder

---

## 📖 Related

- [Core Documentation](../core/README.md)
- [NestJS Adapter](../nestjs/README.md)
- [Fastify Adapter](../fastify/README.md)
- [TDD Guidelines](../docs/TDD_GUIDELINES.md)

---

**Version**: 1.0.0  
**License**: MIT
