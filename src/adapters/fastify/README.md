# AuthBoilerplate for Fastify

High-performance authentication for Fastify applications with:
- 🔐 PASETO V2 tokens
- ✉️ Magic Link (passwordless)
- 📱 OTP (coming soon)
- 🔗 Social Login (coming soon)
- 💻 Session Management (coming soon)

Fully integrated with Fastify ecosystem:
- ✅ Plugin architecture
- ✅ Hooks system
- ✅ Decorators
- ✅ TypeScript support
- ✅ Performance optimized (2-3x faster than Express)

---

## 📦 Installation

```bash
npm install @authboilerplate/core @authboilerplate/fastify
```

Required Fastify plugins:
```bash
npm install @fastify/cookie @fastify/cors
```

---

## 🚀 Quick Start

### 1. Basic Setup

```typescript
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import authPlugin from '@authboilerplate/fastify';
import { PrismaRepository } from '@authboilerplate/prisma';
import { NodemailerProvider } from '@authboilerplate/nodemailer';

const fastify = Fastify();

// Register required plugins
await fastify.register(cookie);
await fastify.register(cors, {
  origin: process.env.ALLOWED_ORIGINS,
  credentials: true,
});

// Register auth plugin
await fastify.register(authPlugin, {
  pasetoSecretKey: process.env.PASETO_SECRET_KEY,
  repository: new PrismaRepository(),
  emailProvider: new NodemailerProvider({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  }),
  magicLinkExpiration: 15, // minutes
  prefix: '/auth',
});

// Start server
await fastify.listen({ port: 3000 });
```

### 2. Protect Routes

```typescript
import { authHook, authorizeRoles } from '@authboilerplate/fastify';

// Protected route
fastify.get('/profile', {
  preHandler: [authHook()],
}, async (request, reply) => {
  return { user: request.user };
});

// Role-based access
fastify.get('/admin', {
  preHandler: [authorizeRoles('ADMIN')],
}, async (request, reply) => {
  return { message: 'Admin access granted' };
});

// Optional auth
fastify.get('/public', {
  preHandler: [authHook({ optional: true })],
}, async (request, reply) => {
  if (request.user) {
    return { message: 'User is logged in', user: request.user };
  }
  return { message: 'Public access' };
});
```

---

## 📋 API Reference

### Plugin Options

```typescript
interface FastifyAuthOptions {
  // Required
  pasetoSecretKey: string;     // PASETO V2 secret
  repository: IRepository;      // Database repository
  emailProvider: IEmailProvider; // Email service
  
  // Optional
  cacheProvider?: ICacheProvider;  // For rate limiting
  logger?: ILogger;                // Custom logger
  
  // Configuration
  tokenExpiration?: number;        // seconds (default: 900)
  refreshExpiration?: number;      // days (default: 7)
  magicLinkExpiration?: number;    // minutes (default: 15)
  callbackURL?: string;            // Default callback URL
  
  // Plugin options
  prefix?: string;                 // Route prefix (default: '/auth')
}
```

### Plugin Registration

```typescript
// Basic registration
fastify.register(authPlugin, {
  pasetoSecretKey: process.env.PASETO_SECRET_KEY,
  repository: prismaRepository,
  emailProvider: nodemailerProvider,
});

// With custom prefix
fastify.register(authPlugin, {
  // ... config
  prefix: '/api/auth',
});

// As encapsulated plugin
fastify.register(async (fastify) => {
  await fastify.register(authPlugin, { /* config */ });
  
  // Routes inside this scope will have auth
  fastify.get('/protected', {
    preHandler: [authHook()]
  }, handler);
});
```

### Hooks

#### `authHook(options?)`

Authentication hook for route protection:

```typescript
// Basic auth
fastify.get('/profile', {
  preHandler: [authHook()]
}, handler);

// With roles
fastify.get('/admin', {
  preHandler: [authHook({ roles: ['ADMIN'] })]
}, handler);

// Optional (never fails)
fastify.get('/public', {
  preHandler: [authHook({ optional: true })]
}, handler);
```

#### `authorizeRoles(...roles)`

Role-based authorization:

```typescript
// Single role
fastify.get('/admin', {
  preHandler: [authorizeRoles('ADMIN')]
}, handler);

// Multiple roles
fastify.get('/moderator', {
  preHandler: [authorizeRoles('MODERATOR', 'ADMIN')]
}, handler);
```

#### `optionalAuthHook()`

Optional authentication (doesn't fail if no token):

```typescript
fastify.get('/public', {
  preHandler: [optionalAuthHook()]
}, handler);
```

---

## 📝 Usage Examples

### Magic Link Flow

```typescript
import { FastifyInstance } from 'fastify';

export async function authRoutes(fastify: FastifyInstance) {
  // Request magic link
  fastify.post('/auth/magic-link/request', async (request, reply) => {
    const { email, callbackURL } = request.body as any;
    
    // Your implementation
    return { success: true, message: 'Magic link sent' };
  });

  // Verify magic link
  fastify.get('/auth/magic-link/verify', async (request, reply) => {
    const { token } = request.query as any;
    
    // Your implementation
    return { success: true, user: {...}, tokens: {...} };
  });
}
```

### Protected API Routes

```typescript
fastify.get('/api/users/me', {
  preHandler: [authHook()],
}, async (request, reply) => {
  // request.user is available
  return {
    id: request.user.id,
    email: request.user.email,
    role: request.user.role,
  };
});

fastify.get('/api/users/me/settings', {
  preHandler: [authHook()],
}, async (request, reply) => {
  return { settings: 'user settings' };
});
```

### Admin Routes

```typescript
fastify.get('/api/admin/users', {
  preHandler: [authorizeRoles('ADMIN')],
}, async (request, reply) => {
  return { users: [] };
});

fastify.post('/api/admin/users', {
  preHandler: [authorizeRoles('ADMIN', 'MODERATOR')],
}, async (request, reply) => {
  return { message: 'User created' };
});
```

### Encapsulated Routes

```typescript
// Register auth in a scope
fastify.register(async (fastify) => {
  // All routes in this scope are protected
  fastify.get('/profile', {
    preHandler: [authHook()]
  }, async (request) => {
    return request.user;
  });

  fastify.get('/settings', {
    preHandler: [authHook()]
  }, async (request) => {
    return { settings: '...' };
  });
}, { prefix: '/api' });
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
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 🍪 Cookie Configuration

Default cookie settings:

```typescript
// Access token (15 minutes)
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000,
  path: '/',
}

// Refresh token (7 days)
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
}
```

---

## 🚨 Error Handling

All errors follow this format:

```typescript
{
  success: false,
  error: {
    type: string;      // e.g., 'UnauthorizedError'
    message: string;   // Human-readable
    code: string;      // Machine-readable
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `TOKEN_REQUIRED` | 401 | No token provided |
| `TOKEN_INVALID` | 401 | Invalid or expired token |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required role |
| `INVALID_EMAIL` | 400 | Email format invalid |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 🧪 Testing

```typescript
import Fastify from 'fastify';
import { TokenService } from '@authboilerplate/fastify';

describe('Auth Routes', () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    fastify = Fastify();
    // Setup plugins and routes
  });

  it('should protect route', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/profile',
    });

    expect(response.statusCode).toBe(401);
  });

  it('should allow valid token', async () => {
    const tokens = await TokenService.generateTokenPair(
      'user-id',
      'test@example.com',
      'USER'
    );

    const response = await fastify.inject({
      method: 'GET',
      url: '/profile',
      headers: {
        authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
  });
});
```

---

## 🔒 Security Best Practices

1. **Enable HTTPS in production**
   ```typescript
   await fastify.register(cors, {
     origin: process.env.ALLOWED_ORIGINS,
     credentials: true,
   });
   ```

2. **Use helmet for security headers**
   ```typescript
   import helmet from '@fastify/helmet';
   await fastify.register(helmet);
   ```

3. **Enable rate limiting**
   ```typescript
   import rateLimit from '@fastify/rate-limit';
   await fastify.register(rateLimit, {
     max: 100,
     timeWindow: '1 minute',
   });
   ```

4. **Validate input with Ajv**
   ```typescript
   fastify.post('/auth/magic-link/request', {
     schema: {
       body: {
         type: 'object',
         required: ['email'],
         properties: {
           email: { type: 'string', format: 'email' },
         },
       },
     },
     handler: async (request, reply) => { ... }
   });
   ```

---

## 📦 Package Exports

```typescript
// Plugin
import authPlugin, { authHook, authorizeRoles } from '@authboilerplate/fastify';

// Adapter
import { FastifyAdapter } from '@authboilerplate/fastify';

// Services
import { MagicLinkService, TokenService } from '@authboilerplate/fastify';

// Types
import type { FastifyAuthOptions } from '@authboilerplate/fastify';
```

---

## 🆘 Troubleshooting

### "No token provided" error

**Problem**: Token not being sent  
**Solution**: Check Authorization header or cookies

```typescript
// Client
fetch('/profile', {
  headers: {
    'Authorization': 'Bearer ' + accessToken
  }
});
```

### Cookies not working

**Problem**: Cookies plugin not registered  
**Solution**: Register @fastify/cookie before auth plugin

```typescript
await fastify.register(cookie); // Must be before auth plugin
await fastify.register(authPlugin, { /* ... */ });
```

### Hook not protecting route

**Problem**: Hook not applied  
**Solution**: Ensure hook is in preHandler array

```typescript
fastify.get('/protected', {
  preHandler: [authHook()] // Make sure it's here
}, handler);
```

---

## 📖 Related

- [Express Adapter](../express/README.md)
- [NestJS Adapter](../nestjs/README.md)
- [Core Documentation](../../core/README.md)
- [TDD Guidelines](../../docs/TDD_GUIDELINES.md)

---

**Version**: 1.0.0  
**License**: MIT
