# Framework-Agnostic Architecture

## 📋 Overview

AuthBoilerplate Enterprise dirancang dengan arsitektur **framework-agnostic** yang memungkinkan developer menggunakan library ini dengan **backend framework apapun** (Express, NestJS, Fastify, Koa, Hapi, dll).

## 🏗️ Architecture Layers

```
┌─────────────────────────────────────────────────┐
│           Application Layer (Your Code)          │
│  Express / NestJS / Fastify / Koa / Hapi        │
└─────────────────────────────────────────────────┘
                       ↓↑
┌─────────────────────────────────────────────────┐
│          Adapter Layer (Framework Specific)      │
│  - Express Adapter                               │
│  - NestJS Adapter                                │
│  - Fastify Adapter                               │
│  - Koa Adapter                                   │
│  - Hapi Adapter                                  │
└─────────────────────────────────────────────────┘
                       ↓↑
┌─────────────────────────────────────────────────┐
│         Core Auth Module (Framework Agnostic)    │
│  - Authentication Service                        │
│  - Token Service (PASETO V2)                     │
│  - Magic Link Service                            │
│  - OTP Service                                   │
│  - OAuth Service (Social Login)                  │
│  - Session Service                               │
│  - Audit Service                                 │
└─────────────────────────────────────────────────┘
                       ↓↑
┌─────────────────────────────────────────────────┐
│        Infrastructure Layer (Interfaces)         │
│  - Database Repository Interface                 │
│  - Email Provider Interface                      │
│  - SMS Provider Interface                        │
│  - Cache Provider Interface                      │
│  - Logger Interface                              │
└─────────────────────────────────────────────────┘
```

## 📦 Package Structure

```
@authboilerplate/core
├── src/
│   ├── core/                    # Framework-agnostic core
│   │   ├── services/
│   │   │   ├── AuthService.ts
│   │   │   ├── TokenService.ts
│   │   │   ├── MagicLinkService.ts
│   │   │   ├── OTPService.ts
│   │   │   ├── OAuthService.ts
│   │   │   ├── SessionService.ts
│   │   │   └── AuditService.ts
│   │   ├── entities/
│   │   │   ├── User.ts
│   │   │   ├── Token.ts
│   │   │   ├── Session.ts
│   │   │   └── AuditLog.ts
│   │   ├── interfaces/
│   │   │   ├── IRepository.ts
│   │   │   ├── IEmailProvider.ts
│   │   │   ├── ISMSProvider.ts
│   │   │   ├── ICacheProvider.ts
│   │   │   └── ILogger.ts
│   │   └── types/
│   │       ├── auth.types.ts
│   │       └── common.types.ts
│   │
│   ├── adapters/                # Framework-specific adapters
│   │   ├── express/
│   │   │   ├── ExpressAdapter.ts
│   │   │   ├── ExpressMiddleware.ts
│   │   │   └── ExpressRoutes.ts
│   │   ├── nestjs/
│   │   │   ├── NestJSAdapter.ts
│   │   │   ├── AuthGuard.ts
│   │   │   └── AuthModule.ts
│   │   ├── fastify/
│   │   │   ├── FastifyAdapter.ts
│   │   │   ├── FastifyPlugin.ts
│   │   │   └── FastifyHooks.ts
│   │   └── koa/
│   │       ├── KoaAdapter.ts
│   │       └── KoaMiddleware.ts
│   │
│   └── infrastructure/          # Implementations
│       ├── database/
│       │   ├── PrismaRepository.ts
│       │   ├── TypeORMRepository.ts
│       │   └── SequelizeRepository.ts
│       ├── email/
│       │   ├── NodemailerProvider.ts
│       │   ├── SendGridProvider.ts
│       │   └── SESProvider.ts
│       ├── sms/
│       │   ├── TwilioProvider.ts
│       │   └── VonageProvider.ts
│       └── cache/
│           ├── RedisProvider.ts
│           └── MemoryProvider.ts
│
└── package.json
```

## 🔌 Adapter Pattern

### Core Interface

```typescript
// src/core/interfaces/IAuthAdapter.ts

export interface IAuthAdapter {
  // Request/Response abstraction
  getRequest(): any;
  getResponse(): any;
  getBody(): any;
  getParams(): any;
  getQuery(): any;
  getHeaders(): any;
  
  // Authentication helpers
  setHeader(key: string, value: string): void;
  setStatus(code: number): void;
  send(data: any): void;
  redirect(url: string): void;
  
  // Session/Cookies
  setCookie(name: string, value: string, options?: CookieOptions): void;
  clearCookie(name: string): void;
  getCookie(name: string): string | undefined;
  
  // Utilities
  getClientIP(): string;
  getUserAgent(): string;
  isSecure(): boolean;
}
```

### Express Adapter Example

```typescript
// src/adapters/express/ExpressAdapter.ts

import { Request, Response } from 'express';
import { IAuthAdapter, CookieOptions } from '../../core/interfaces/IAuthAdapter';

export class ExpressAdapter implements IAuthAdapter {
  constructor(
    private req: Request,
    private res: Response
  ) {}

  getRequest(): any {
    return this.req;
  }

  getResponse(): any {
    return this.res;
  }

  getBody(): any {
    return this.req.body;
  }

  getParams(): any {
    return this.req.params;
  }

  getQuery(): any {
    return this.req.query;
  }

  getHeaders(): any {
    return this.req.headers;
  }

  setHeader(key: string, value: string): void {
    this.res.setHeader(key, value);
  }

  setStatus(code: number): void {
    this.res.status(code);
  }

  send(data: any): void {
    this.res.json(data);
  }

  redirect(url: string): void {
    this.res.redirect(url);
  }

  setCookie(name: string, value: string, options?: CookieOptions): void {
    this.res.cookie(name, value, options);
  }

  clearCookie(name: string): void {
    this.res.clearCookie(name);
  }

  getCookie(name: string): string | undefined {
    return this.req.cookies?.[name];
  }

  getClientIP(): string {
    return this.req.ip || this.req.socket.remoteAddress || 'unknown';
  }

  getUserAgent(): string {
    return this.req.get('User-Agent') || 'unknown';
  }

  isSecure(): boolean {
    return this.req.secure || this.req.get('X-Forwarded-Proto') === 'https';
  }
}
```

### NestJS Adapter Example

```typescript
// src/adapters/nestjs/NestJSAdapter.ts

import { ExecutionContext, Injectable } from '@nestjs/common';
import { IAuthAdapter, CookieOptions } from '../../core/interfaces/IAuthAdapter';

@Injectable()
export class NestJSAdapter implements IAuthAdapter {
  constructor(
    private request: any,
    private response: any
  ) {}

  static fromContext(context: ExecutionContext): NestJSAdapter {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    return new NestJSAdapter(request, response);
  }

  getRequest(): any {
    return this.request;
  }

  getResponse(): any {
    return this.response;
  }

  getBody(): any {
    return this.request.body;
  }

  getParams(): any {
    return this.request.params;
  }

  getQuery(): any {
    return this.request.query;
  }

  getHeaders(): any {
    return this.request.headers;
  }

  setHeader(key: string, value: string): void {
    this.response.setHeader(key, value);
  }

  setStatus(code: number): void {
    this.response.status(code);
  }

  send(data: any): void {
    this.response.json(data);
  }

  redirect(url: string): void {
    this.response.redirect(url);
  }

  setCookie(name: string, value: string, options?: CookieOptions): void {
    this.response.cookie(name, value, options);
  }

  clearCookie(name: string): void {
    this.response.clearCookie(name);
  }

  getCookie(name: string): string | undefined {
    return this.request.cookies?.[name];
  }

  getClientIP(): string {
    return this.request.ip || this.request.socket?.remoteAddress || 'unknown';
  }

  getUserAgent(): string {
    return this.request.headers['user-agent'] || 'unknown';
  }

  isSecure(): boolean {
    return this.request.secure || this.request.headers['x-forwarded-proto'] === 'https';
  }
}
```

### Fastify Adapter Example

```typescript
// src/adapters/fastify/FastifyAdapter.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { IAuthAdapter, CookieOptions } from '../../core/interfaces/IAuthAdapter';

export class FastifyAdapter implements IAuthAdapter {
  constructor(
    private req: FastifyRequest,
    private res: FastifyReply
  ) {}

  getRequest(): any {
    return this.req;
  }

  getResponse(): any {
    return this.res;
  }

  getBody(): any {
    return this.req.body;
  }

  getParams(): any {
    return this.req.params;
  }

  getQuery(): any {
    return this.req.query;
  }

  getHeaders(): any {
    return this.req.headers;
  }

  setHeader(key: string, value: string): void {
    this.res.header(key, value);
  }

  setStatus(code: number): void {
    this.res.status(code);
  }

  send(data: any): void {
    this.res.send(data);
  }

  redirect(url: string): void {
    this.res.redirect(url);
  }

  setCookie(name: string, value: string, options?: CookieOptions): void {
    this.res.setCookie(name, value, options);
  }

  clearCookie(name: string): void {
    this.res.clearCookie(name);
  }

  getCookie(name: string): string | undefined {
    return (this.req.cookies as any)?.[name];
  }

  getClientIP(): string {
    return this.req.ip || this.req.socket?.remoteAddress || 'unknown';
  }

  getUserAgent(): string {
    return this.req.headers['user-agent'] || 'unknown';
  }

  isSecure(): boolean {
    return this.req.protocol === 'https' || this.req.headers['x-forwarded-proto'] === 'https';
  }
}
```

## 🔧 Usage Examples

### Express

```typescript
import express from 'express';
import { AuthBoilerplate, ExpressAdapter } from '@authboilerplate/core';
import { PrismaRepository } from '@authboilerplate/prisma';
import { NodemailerProvider } from '@authboilerplate/nodemailer';

const app = express();

// Initialize AuthBoilerplate
const auth = new AuthBoilerplate({
  repository: new PrismaRepository(),
  emailProvider: new NodemailerProvider({ /* config */ }),
  pasetoSecretKey: process.env.PASETO_SECRET_KEY,
});

// Use Express adapter
app.post('/auth/login', async (req, res) => {
  const adapter = new ExpressAdapter(req, res);
  const result = await auth.login(adapter);
  // Response handled by adapter
});

app.post('/auth/register', async (req, res) => {
  const adapter = new ExpressAdapter(req, res);
  const result = await auth.register(adapter);
});

app.post('/auth/magic-link', async (req, res) => {
  const adapter = new ExpressAdapter(req, res);
  const result = await auth.requestMagicLink(adapter);
});

app.get('/auth/magic-link/verify', async (req, res) => {
  const adapter = new ExpressAdapter(req, res);
  const result = await auth.verifyMagicLink(adapter);
});

// Use Express middleware
app.use(auth.middleware(ExpressAdapter));
```

### NestJS

```typescript
import { Module, Controller, Post, Body } from '@nestjs/common';
import { AuthBoilerplate, NestJSAdapter, AuthGuard } from '@authboilerplate/nestjs';
import { PrismaRepository } from '@authboilerplate/prisma';

@Module({
  providers: [
    {
      provide: 'AUTH_BOILERPLATE',
      useFactory: () => new AuthBoilerplate({
        repository: new PrismaRepository(),
        // ... config
      }),
    },
  ],
})
export class AuthModule {}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthBoilerplate) {}

  @Post('login')
  async login(@Body() body: any, @AuthGuard() adapter: NestJSAdapter) {
    return this.auth.login(adapter);
  }

  @Post('register')
  async register(@Body() body: any, @AuthGuard() adapter: NestJSAdapter) {
    return this.auth.register(adapter);
  }

  @Post('magic-link')
  async requestMagicLink(@Body() body: any, @AuthGuard() adapter: NestJSAdapter) {
    return this.auth.requestMagicLink(adapter);
  }

  @Get('magic-link/verify')
  async verifyMagicLink(@AuthGuard() adapter: NestJSAdapter) {
    return this.auth.verifyMagicLink(adapter);
  }
}
```

### Fastify

```typescript
import Fastify from 'fastify';
import { AuthBoilerplate, FastifyAdapter } from '@authboilerplate/fastify';
import { PrismaRepository } from '@authboilerplate/prisma';

const fastify = Fastify();

const auth = new AuthBoilerplate({
  repository: new PrismaRepository(),
  // ... config
});

fastify.post('/auth/login', async (req, res) => {
  const adapter = new FastifyAdapter(req, res);
  return auth.login(adapter);
});

fastify.post('/auth/register', async (req, res) => {
  const adapter = new FastifyAdapter(req, res);
  return auth.register(adapter);
});

fastify.post('/auth/magic-link', async (req, res) => {
  const adapter = new FastifyAdapter(req, res);
  return auth.requestMagicLink(adapter);
});

fastify.get('/auth/magic-link/verify', async (req, res) => {
  const adapter = new FastifyAdapter(req, res);
  return auth.verifyMagicLink(adapter);
});

// Use Fastify plugin
fastify.register(auth.plugin(FastifyAdapter));
```

## 🎯 Benefits

1. **Framework Flexibility** - Switch frameworks without changing auth logic
2. **Testability** - Core logic is framework-agnostic, easy to test
3. **Reusability** - Write once, use with any framework
4. **Maintainability** - Clear separation of concerns
5. **Scalability** - Add new framework adapters without touching core

## 📝 Next Steps

1. Implement Magic Link Service (framework-agnostic)
2. Implement OTP Service (framework-agnostic)
3. Implement OAuth Service (framework-agnostic)
4. Create Express, NestJS, Fastify adapters
5. Create CLI tool with framework selection
