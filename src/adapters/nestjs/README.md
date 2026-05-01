# AuthBoilerplate for NestJS

Complete authentication solution for NestJS applications with:
- 🔐 PASETO V2 tokens
- ✉️ Magic Link (passwordless)
- 📱 OTP (coming soon)
- 🔗 Social Login (coming soon)
- 💻 Session Management (coming soon)

Fully integrated with NestJS ecosystem:
- ✅ Dependency Injection
- ✅ Decorators (@Roles, @Public)
- ✅ Guards (AuthGuard)
- ✅ Modules (AuthModule)
- ✅ TypeScript support

---

## 📦 Installation

```bash
npm install @authboilerplate/core @authboilerplate/nestjs
```

Required NestJS packages:
```bash
npm install @nestjs/common @nestjs/core reflect-metadata
```

---

## 🚀 Quick Start

### 1. Configure Module

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '@authboilerplate/nestjs';
import { PrismaRepository } from '@authboilerplate/prisma';
import { NodemailerProvider } from '@authboilerplate/nodemailer';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    
    // AuthBoilerplate module
    AuthModule.forRoot({
      pasetoSecretKey: process.env.PASETO_SECRET_KEY,
      repository: new PrismaRepository(),
      emailProvider: new NodemailerProvider({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }),
      magicLinkExpiration: 15, // minutes
      enableGuard: true, // Enable global auth guard
    }),
  ],
})
export class AppModule {}
```

### 2. Create Auth Controller

```typescript
// auth.controller.ts
import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard, Roles, Public } from '@authboilerplate/nestjs';
import { AuthService } from '@authboilerplate/nestjs';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public() // Skip authentication
  @Post('magic-link/request')
  async requestMagicLink(@Body() body: { email: string; callbackURL?: string }) {
    return this.authService.getMagicLinkService().requestMagicLink(/* adapter */);
  }

  @Public()
  @Get('magic-link/verify')
  async verifyMagicLink(@Query() query: { token: string }) {
    return this.authService.getMagicLinkService().verifyMagicLink(/* adapter */);
  }
}
```

### 3. Protect Routes

```typescript
// users.controller.ts
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard, Roles } from '@authboilerplate/nestjs';

@Controller('users')
@UseGuards(AuthGuard) // Protect all routes
export class UsersController {
  
  // Only authenticated users
  @Get('profile')
  async getProfile(@Request() req) {
    return req.user; // User attached by guard
  }

  // Only admins
  @Get('admin')
  @Roles('ADMIN')
  async getAdmin(@Request() req) {
    return { message: 'Admin access granted' };
  }

  // Multiple roles
  @Get('moderator')
  @Roles('MODERATOR', 'ADMIN')
  async getModerator(@Request() req) {
    return { message: 'Moderator access' };
  }

  // Public route (override global guard)
  @Get('public')
  @Public()
  async getPublic() {
    return { message: 'Public access' };
  }
}
```

---

## 📋 API Reference

### AuthModule

#### `forRoot(options: AuthModuleOptions): DynamicModule`

Synchronous configuration:

```typescript
AuthModule.forRoot({
  pasetoSecretKey: process.env.PASETO_SECRET_KEY,
  repository: new PrismaRepository(),
  emailProvider: new NodemailerProvider({ /* config */ }),
  magicLinkExpiration: 15,
  enableGuard: true,
  global: true, // Make module global
});
```

#### `forRootAsync(options: AsyncOptions): DynamicModule`

Asynchronous configuration (e.g., with ConfigService):

```typescript
AuthModule.forRootAsync({
  useFactory: async (config: ConfigService) => ({
    pasetoSecretKey: config.get('PASETO_SECRET_KEY'),
    repository: new PrismaRepository(),
    emailProvider: new NodemailerProvider({
      host: config.get('SMTP_HOST'),
      // ...
    }),
  }),
  inject: [ConfigService],
  global: true,
});
```

#### Options

```typescript
interface AuthModuleOptions {
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
  
  // Module options
  global?: boolean;                // Make module global (default: false)
  enableGuard?: boolean;           // Enable global guard (default: true)
}
```

---

### Decorators

#### `@Public()`

Skip authentication for a route:

```typescript
@Public()
@Get('public-endpoint')
async publicEndpoint() {
  // No authentication required
}
```

#### `@Roles(...roles: string[])`

Require specific roles:

```typescript
@Roles('ADMIN')
@Get('admin')
async adminOnly() { ... }

@Roles('MODERATOR', 'ADMIN')
@Get('moderator')
async moderatorOrAdmin() { ... }
```

---

### Guards

#### `AuthGuard`

Global authentication guard (automatically applied if `enableGuard: true`):

```typescript
// Manual usage
@UseGuards(AuthGuard)
@Get('protected')
async protected() { ... }
```

---

### AuthService

Injected service for controllers:

```typescript
import { AuthService } from '@authboilerplate/nestjs';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('tokens')
  async getTokens() {
    const tokenService = this.authService.getTokenService();
    const tokens = await tokenService.generateTokenPair(
      userId,
      email,
      role
    );
    return tokens;
  }
}
```

#### Methods:

```typescript
authService.getMagicLinkService(): MagicLinkService
authService.getTokenService(): TokenService
authService.getConfig(): AuthConfig
```

---

## 📝 Usage Examples

### Magic Link Flow

#### Controller Implementation

```typescript
import { Controller, Post, Body, Get, Query, Res, Redirect } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '@authboilerplate/nestjs';
import { AuthService } from '@authboilerplate/nestjs';
import { NestJSAdapter } from '@authboilerplate/nestjs';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('magic-link/request')
  async requestMagicLink(
    @Body() body: { email: string; callbackURL?: string },
  ) {
    // Note: You'll need to create adapter from request
    const magicLinkService = this.authService.getMagicLinkService();
    return magicLinkService.requestMagicLink(/* adapter */, {
      email: body.email,
      callbackURL: body.callbackURL,
    });
  }

  @Public()
  @Get('magic-link/verify')
  @Redirect()
  async verifyMagicLink(
    @Query() query: { token: string; redirect?: string },
    @Res() res: Response,
  ) {
    const magicLinkService = this.authService.getMagicLinkService();
    const result = await magicLinkService.verifyMagicLink(/* adapter */, {
      token: query.token,
    });

    if (result.success) {
      // Set cookies
      res.cookie('accessToken', result.data.tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
      });

      res.cookie('refreshToken', result.data.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return {
        statusCode: 302,
        url: query.redirect || '/dashboard',
      };
    }

    return {
      statusCode: 302,
      url: `/login?error=${result.error?.code || 'UNKNOWN'}`,
    };
  }
}
```

---

### Protected Routes

```typescript
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard, Roles } from '@authboilerplate/nestjs';

@Controller('profile')
@UseGuards(AuthGuard) // Protect all routes
export class ProfileController {
  
  @Get()
  async getProfile(@Request() req) {
    // req.user is available
    return {
      user: req.user,
      message: 'Profile data',
    };
  }

  @Get('settings')
  async getSettings(@Request() req) {
    return { settings: 'user settings' };
  }
}
```

---

### Role-Based Access Control

```typescript
import { Controller, Get, Post, Delete } from '@nestjs/common';
import { Roles } from '@authboilerplate/nestjs';

@Controller('admin')
export class AdminController {

  @Get('users')
  @Roles('ADMIN')
  async getAllUsers() {
    return { users: [] };
  }

  @Post('users')
  @Roles('ADMIN', 'MODERATOR')
  async createUser() {
    return { message: 'User created' };
  }

  @Delete('users/:id')
  @Roles('ADMIN')
  async deleteUser() {
    return { message: 'User deleted' };
  }
}
```

---

### Custom Guard Usage

```typescript
// Disable global guard, use manually
AuthModule.forRoot({
  // ...
  enableGuard: false, // Disable global guard
});

// Then use manually in controllers
@Controller('api')
export class ApiController {
  
  @UseGuards(AuthGuard)
  @Get('protected')
  async protected() { ... }

  @Public()
  @Get('public')
  async public() { ... }
}
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

# Output: your-base64-encoded-key
```

---

## 🍪 Cookie Configuration

Default cookie settings:

```typescript
// Access token
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000, // 15 minutes
}

// Refresh token
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

### Unit Tests

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '@authboilerplate/nestjs';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            getMagicLinkService: jest.fn(),
            getTokenService: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
```

### E2E Tests

```typescript
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { TokenService } from '@authboilerplate/nestjs';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Setup app
  });

  it('/auth/magic-link/request (POST)', () => {
    return request(app.getHttpServer())
      .post('/auth/magic-link/request')
      .send({ email: 'test@example.com' })
      .expect(200);
  });

  it('/profile (GET) - Protected', async () => {
    const tokens = await TokenService.generateTokenPair(
      'user-id',
      'test@example.com',
      'USER'
    );

    return request(app.getHttpServer())
      .get('/profile')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(200);
  });
});
```

---

## 🔒 Security Best Practices

1. **Enable HTTPS in production**
   ```typescript
   // main.ts
   app.enableCors({
     origin: process.env.ALLOWED_ORIGINS,
     credentials: true,
   });
   ```

2. **Use helmet for security headers**
   ```typescript
   import helmet from 'helmet';
   app.use(helmet());
   ```

3. **Enable rate limiting**
   ```typescript
   import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

   @Module({
     imports: [
       ThrottlerModule.forRoot([{
         ttl: 60000,
         limit: 10,
       }]),
     ],
   })
   ```

4. **Validate input with class-validator**
   ```typescript
   import { IsEmail, IsNotEmpty } from 'class-validator';

   class MagicLinkDto {
     @IsEmail()
     @IsNotEmpty()
     email: string;
   }
   ```

---

## 📦 Package Exports

```typescript
// Module
import { AuthModule, AuthService } from '@authboilerplate/nestjs';

// Decorators
import { Roles, Public } from '@authboilerplate/nestjs';

// Guards
import { AuthGuard } from '@authboilerplate/nestjs';

// Adapter
import { NestJSAdapter } from '@authboilerplate/nestjs';

// Services
import { MagicLinkService, TokenService } from '@authboilerplate/nestjs';
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

### Guard not working

**Problem**: Global guard not applied  
**Solution**: Check `enableGuard: true` in module config

```typescript
AuthModule.forRoot({
  enableGuard: true, // Make sure this is true
});
```

### Decorators not working

**Problem**: `@Roles` not restricting access  
**Solution**: Ensure guard is applied

```typescript
@UseGuards(AuthGuard) // Required for @Roles to work
@Roles('ADMIN')
```

---

## 📖 Related

- [Express Adapter](../express/README.md)
- [Fastify Adapter](../fastify/README.md)
- [Core Documentation](../../core/README.md)
- [TDD Guidelines](../../docs/TDD_GUIDELINES.md)

---

**Version**: 1.0.0  
**License**: MIT
