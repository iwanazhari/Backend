# 🚀 Backend Starter Kit v5.0

**Production-Ready TypeScript Backend** dengan Clean Architecture, Zero Trust Security, WebSocket, Swagger Docs, dan Code Generation CLI.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.7-cyan.svg)](https://www.prisma.io/)
[![CI/CD](https://github.com/your-repo/backend-starter-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/your-repo/backend-starter-kit/actions)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📖 **Daftar Isi**

- [Fitur Utama](#-fitur-utama)
- [Teknologi Stack](#-teknologi-stack)
- [Quick Start](#-quick-start)
- [Struktur Project](#-struktur-project)
- [Code Generation](#-code-generation)
- [API Documentation](#-api-documentation)
- [Database](#-database)
- [Security](#-security)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Keunggulan & Kerugian](#-keunggulan--kerugian)
- [FAQ](#-faq)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ **Fitur Utama**

### 🎯 **Core Features**

| Feature | Description | Status |
|---------|-------------|--------|
| **TypeScript** | Full type safety dengan Prisma | ✅ Ready |
| **Code Generator** | 1 command = 6 files | ✅ Ready |
| **Prisma ORM** | Type-safe database queries | ✅ Ready |
| **Zero Trust Security** | 10 layer security | ✅ Ready |
| **WebSocket** | Real-time communication | ✅ Ready |
| **Swagger Docs** | Auto-generated API docs | ✅ Ready |
| **CI/CD Pipeline** | Auto test & deploy | ✅ Ready |
| **Database Seed** | Easy onboarding | ✅ Ready |

### 🔥 **Highlights**

```bash
# Generate full module dalam 1 menit
npm run generate:all -- product

# Auto-generated API docs
http://localhost:3000/api/docs

# Real-time WebSocket support
ws://localhost:3000

# Production deployment
npm start  # PM2 cluster mode
```

---

## 🛠️ **Teknologi Stack**

### **Backend Framework**
- **Node.js 18+** - Runtime environment
- **Express.js 4.x** - Web framework
- **TypeScript 5.x** - Type safety

### **Database**
- **PostgreSQL 15** - Primary database
- **Prisma 5.x** - ORM with type safety
- **Redis 7** - Caching & sessions

### **Security**
- **Helmet** - Security headers
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **express-rate-limit** - Rate limiting
- **express-validator** - Input validation

### **Real-time**
- **Socket.IO 4.x** - WebSocket server

### **Documentation**
- **Swagger/OpenAPI** - API documentation
- **swagger-ui-express** - Interactive UI

### **Development**
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Jest** - Testing framework
- **tsx** - TypeScript execution

### **Deployment**
- **PM2** - Process manager
- **Docker** - Containerization
- **GitHub Actions** - CI/CD

---

## 🚀 **Quick Start**

### **Prerequisites**

```bash
# Required
- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker & Docker Compose (optional, untuk database)
```

### **1. Clone & Install**

```bash
# Clone repository
git clone <your-repo-url>
cd backend-starter-kit

# Install dependencies
npm install
```

### **2. Setup Environment**

```bash
# Copy environment file
cp .env.example .env

# Edit .env dengan credentials Anda
# Minimal ubah:
# - DATABASE_URL
# - JWT_SECRET
# - JWT_REFRESH_SECRET
```

### **3. Setup Database**

**Option A: Docker (Recommended)**
```bash
# Start PostgreSQL & Redis
docker-compose up -d postgres redis

# Wait for services
docker-compose ps
```

**Option B: Manual**
```bash
# Install PostgreSQL & Redis manually
# Update DATABASE_URL di .env
```

### **4. Initialize Database**

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database (optional)
npm run prisma:seed
```

### **5. Start Development**

```bash
# Start development server
npm run dev

# Server running at:
# - HTTP: http://localhost:3000
# - API Docs: http://localhost:3000/api/docs
# - WebSocket: ws://localhost:3000
```

### **6. Test Login**

```
Email: admin@example.com
Password: Admin123!
```

**🎉 Done! Siap development!**

---

## 📁 **Struktur Project**

```
backend-starter-kit/
├── .github/
│   └── workflows/
│       └── ci.yml              # CI/CD pipeline
│
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Seed data
│
├── src/
│   ├── config/
│   │   ├── index.ts            # App configuration
│   │   ├── prisma.ts           # Prisma client
│   │   ├── redis.ts            # Redis client
│   │   ├── websocket.ts        # WebSocket setup
│   │   └── app.ts              # Express app
│   │
│   ├── controllers/
│   │   ├── BaseController.ts   # Base controller
│   │   ├── AuthController.ts   # Authentication
│   │   └── UserController.ts   # User management
│   │
│   ├── services/
│   │   ├── BaseService.ts      # Base service
│   │   └── UserService.ts      # User service
│   │
│   ├── repositories/
│   │   ├── BaseRepository.ts   # Base repository
│   │   └── UserRepository.ts   # User repository
│   │
│   ├── routes/
│   │   ├── index.ts            # Route aggregator
│   │   ├── auth.routes.ts      # Auth routes
│   │   └── user.routes.ts      # User routes
│   │
│   ├── middlewares/
│   │   ├── authenticate.ts     # JWT auth
│   │   ├── errorHandler.ts     # Error handling
│   │   ├── validator.ts        # Validation
│   │   └── security.ts         # Zero Trust security
│   │
│   ├── errors/
│   │   └── index.ts            # Custom errors
│   │
│   ├── utils/
│   │   └── logger.ts           # Winston logger
│   │
│   ├── types/
│   │   └── global.d.ts         # Global types
│   │
│   └── index.ts                # Main entry point
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── ZERO_TRUST.md
│   ├── PHASE_1.md
│   └── ES_MODULES.md
│
├── scripts/
│   ├── generate-all.ts         # Code generator
│   └── generate-swagger.ts     # Swagger generator
│
├── docker-compose.yml
├── Dockerfile
├── pm2.config.js
├── tsconfig.json
├── package.json
└── README.md
```

---

## ⚡ **Code Generation**

### **Generate Full Module**

```bash
# 1 command generates 6 files!
npm run generate:all -- product

# Output:
✅ src/repositories/ProductRepository.ts
✅ src/services/ProductService.ts
✅ src/controllers/ProductController.ts
✅ src/routes/product.routes.ts
✅ tests/unit/controllers/ProductController.test.ts
✅ Update src/routes/index.ts
```

### **Generate Individual Components**

```bash
# Generate Prisma model
npm run generate:prisma-model -- Product name:string price:decimal:10,2

# Generate specific components
npm run generate:controller -- ProductName
npm run generate:service -- ProductName
npm run generate:repository -- ProductName
```

### **Complete Workflow**

```bash
# 1. Generate Prisma model
npm run generate:prisma-model -- BlogPost title:string content:text published:boolean:false

# 2. Generate Prisma Client
npm run prisma:generate

# 3. Run migration
npm run prisma:migrate

# 4. Generate module
npm run generate:all -- blog-post

# 5. Edit business logic
# - Edit src/services/BlogPostService.ts
# - Edit src/controllers/BlogPostController.ts

# 6. Test
npm run dev
```

**Time: 5-10 menit!** ⚡

---

## 📖 **API Documentation**

### **Access Swagger UI**

```
http://localhost:3000/api/docs
```

### **Features**

- ✅ Interactive API testing
- ✅ JWT authentication support
- ✅ Auto-generated from code
- ✅ Always up-to-date
- ✅ Request/response examples

### **Auto-Generate on Changes**

```bash
# Watch mode - auto regenerate
npm run swagger:watch

# Manual generate
npm run swagger:generate
```

### **Add Documentation**

```typescript
// Add JSDoc comment to routes
/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create new product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Product created
 */
router.post('/', ProductController.create);
```

---

## 🗄️ **Database**

### **Prisma Schema**

```prisma
// prisma/schema.prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  firstName String
  lastName  String?
  role      Role     @default(USER)
  status    UserStatus @default(ACTIVE)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([email])
  @@index([status])
}
```

### **Commands**

```bash
# Generate Prisma Client
npm run prisma:generate

# Create migration
npm run prisma:migrate

# Reset database
npm run prisma:reset

# Open Prisma Studio (GUI)
npm run prisma:studio

# Seed database
npm run prisma:seed
```

### **Type-Safe Queries**

```typescript
// Auto-complete & type safety!
const users = await prisma.user.findMany({
  where: { 
    status: 'ACTIVE',
    role: 'USER'
  },
  include: {
    posts: true
  },
  orderBy: {
    createdAt: 'desc'
  }
});
```

---

## 🔒 **Security**

### **Zero Trust Architecture**

**10 Security Layers:**

1. ✅ **Request Tracking** - Unique ID per request
2. ✅ **Security Headers** - Helmet, CSP, HSTS
3. ✅ **Strict CORS** - No wildcards
4. ✅ **Rate Limiting** - Per user/IP/global
5. ✅ **Audit Logging** - Log everything
6. ✅ **Request Validation** - SQL/XSS/Path traversal
7. ✅ **API Key Validation** - Optional
8. ✅ **Request Signature** - Prevent tampering
9. ✅ **JWT Authentication** - Short-lived tokens
10. ✅ **Suspicious Activity Detection** - Auto-alert

### **Authentication**

```typescript
// Routes with auth
router.get('/profile', authenticate, UserController.getProfile);

// Routes with role
router.get('/admin', authenticate, authorize('ADMIN'), UserController.admin);
```

### **API Key Management**

```bash
# Create API key
POST /api/api-keys
{
  "name": "Mobile App",
  "permissions": ["read"],
  "expiresAt": "2025-12-31"
}

# Use API key
GET /api/products
X-API-Key: your-api-key-here
```

---

## 🧪 **Testing**

### **Run Tests**

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# With coverage
npm run test -- --coverage

# E2E tests
npm run test:e2e
```

### **Test Example**

```typescript
// tests/unit/controllers/AuthController.test.ts
import request from 'supertest';
import { createApp } from '../../src/config/app';

describe('Auth Controller', () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  it('should login successfully', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'Admin123!',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('accessToken');
  });
});
```

---

## 🚀 **Deployment**

### **Production with PM2**

```bash
# Build TypeScript
npm run build

# Run migrations
npm run prisma:migrate:prod

# Start with PM2
npm start

# Monitor
pm2 monit

# View logs
pm2 logs backend-starter-kit

# Restart
pm2 restart backend-starter-kit
```

### **Docker Deployment**

```bash
# Build image
docker build -t backend-starter-kit:latest .

# Run with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

### **CI/CD Deployment**

```yaml
# .github/workflows/ci.yml
# Auto-deploy on push to main
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - Deploy to production server
      - Restart PM2
```

---

## ✅ **Keunggulan & Kerugian**

### **👍 Keunggulan**

| Aspek | Benefit | Impact |
|-------|---------|--------|
| **TypeScript** | Type safety, auto-complete, catch errors early | ⭐⭐⭐⭐⭐ |
| **Code Generator** | Hemat 85-90% waktu development | ⭐⭐⭐⭐⭐ |
| **Prisma ORM** | Type-safe queries, auto migrations | ⭐⭐⭐⭐⭐ |
| **Zero Trust Security** | Production-ready security | ⭐⭐⭐⭐⭐ |
| **CI/CD Pipeline** | Auto test & deploy | ⭐⭐⭐⭐⭐ |
| **WebSocket Ready** | Real-time features built-in | ⭐⭐⭐⭐⭐ |
| **Swagger Docs** | Auto-generated, always updated | ⭐⭐⭐⭐⭐ |
| **Clean Architecture** | Easy to maintain & scale | ⭐⭐⭐⭐⭐ |
| **Documentation** | Complete guides | ⭐⭐⭐⭐⭐ |
| **Developer Experience** | Excellent DX | ⭐⭐⭐⭐⭐ |

### **👎 Kerugian / Trade-offs**

| Aspek | Trade-off | Mitigation |
|-------|-----------|------------|
| **Learning Curve** | TypeScript butuh belajar | Docs lengkap, 1-2 hari |
| **Build Step** | Perlu compile TypeScript | Fast dengan tsx |
| **File Size** | Lebih besar (types) | Minified di production |
| **Complexity** | Banyak fitur sekaligus | Modular, bisa disable |
| **Initial Setup** | Setup awal 30 menit | One-time only |
| **Dependencies** | Banyak dependencies | Production-ready |
| **Over-engineering** | Mungkin overkill untuk project kecil | Bisa simplify |
| **Prisma Cold Start** | First query lambat | Cache Prisma Client |

### **Kapan Menggunakan**

**✅ Cocok Untuk:**
- Startup yang butuh cepat scale
- Enterprise projects
- Team collaboration
- Production-critical apps
- Long-term projects
- API-first development

**❌ Kurang Cocok Untuk:**
- Prototype sekali pakai
- Project sangat kecil (< 5 endpoints)
- Serverless functions
- Real-time only apps (perlu adjust)
- GraphQL-first projects

---

## ❓ **FAQ**

### **Q: Apakah wajib pakai TypeScript?**
**A:** Sangat recommended untuk type safety, tapi bisa pakai JavaScript dengan convert file ke `.js`.

### **Q: Bisa pakai database selain PostgreSQL?**
**A:** Bisa! Prisma support MySQL, SQLite, SQL Server, MongoDB. Ubah di `prisma/schema.prisma`.

### **Q: Bagaimana cara disable WebSocket?**
**A:** Comment out WebSocket setup di `src/index.js` dan `src/config/app.js`.

### **Q: Apakah CI/CD wajib?**
**A:** Tidak, tapi highly recommended. File ada di `.github/workflows/`, bisa dihapus jika tidak perlu.

### **Q: Berapa ukuran project setelah install?**
**A:** Sekitar 300-400MB dengan node_modules. Production build sekitar 50MB.

### **Q: Apakah bisa deploy ke VPS?**
**A:** Ya! Pakai PM2 atau Docker. Ada panduan lengkap di docs/.

### **Q: Bagaimana update starter kit?**
**A:** Clone sebagai template, copy business logic Anda ke structure baru.

### **Q: License apa?**
**A:** MIT License - bebas pakai untuk personal & commercial projects.

---

## 🤝 **Contributing**

### **Cara Contribute**

```bash
# 1. Fork repository
git fork <repo-url>

# 2. Clone fork
git clone <your-fork>

# 3. Create branch
git checkout -b feature/amazing-feature

# 4. Make changes

# 5. Commit (conventional commits)
git commit -m "feat: add amazing feature"

# 6. Push
git push origin feature/amazing-feature

# 7. Create Pull Request
```

### **Development Guidelines**

- ✅ Follow TypeScript strict mode
- ✅ Write tests for new features
- ✅ Update documentation
- ✅ Follow conventional commits
- ✅ Pass CI/CD pipeline

---

## 📄 **License**

MIT License - Copyright (c) 2024

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software.

---

## 📞 **Support & Contact**

- **Documentation:** [docs/](docs/)
- **Issues:** [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions:** [GitHub Discussions](https://github.com/your-repo/discussions)

---

## 🌟 **Show Your Support**

Jika project ini membantu Anda, please give a ⭐️ star di GitHub!

---

## 📊 **Stats**

![Stars](https://img.shields.io/github/stars/your-repo/backend-starter-kit?style=social)
![Forks](https://img.shields.io/github/forks/your-repo/backend-starter-kit?style=social)
![Issues](https://img.shields.io/github/issues/your-repo/backend-starter-kit)
![Pull Requests](https://img.shields.io/github/issues-pr/your-repo/backend-starter-kit)

---

**Made with ❤️ using TypeScript, Prisma, and Clean Architecture**

**Backend Starter Kit v5.0 - Production-Ready!** 🚀
