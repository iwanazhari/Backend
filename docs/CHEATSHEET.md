# 📋 Backend Starter Kit - Cheatsheet

**Quick Reference Guide** | v5.0

---

## 🚀 Quick Start

```bash
# Clone & Install
git clone <repo-url> && cd backend-starter-kit
npm install
cp .env.example .env

# Start Database (Docker)
docker-compose up -d postgres redis

# Setup Database
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# Development
npm run dev
# → http://localhost:3000
# → http://localhost:3000/api/docs
```

---

## 📦 Code Generation

### **Generate Full Module** (1 Command = 6 Files)
```bash
npm run generate:all -- resource-name
# Example: npm run generate:all -- product
```

**Generates:**
- ✅ `src/repositories/{Name}Repository.ts`
- ✅ `src/services/{Name}Service.ts`
- ✅ `src/controllers/{Name}Controller.ts`
- ✅ `src/routes/{name}.routes.ts`
- ✅ `tests/unit/controllers/{Name}Controller.test.ts`
- ✅ Updates `src/routes/index.ts`

### **Generate Individual Components**
```bash
npm run generate:controller -- ProductName
npm run generate:service -- ProductName
npm run generate:repository -- ProductName
```

### **Generate Prisma Model**
```bash
npm run generate:prisma-model -- ModelName field1:type field2:type
# Example: npm run generate:prisma-model -- BlogPost title:string content:text published:boolean:false
```

### **Complete Workflow**
```bash
# 1. Generate Prisma model
npm run generate:prisma-model -- BlogPost title:string content:text

# 2. Generate Prisma Client + Migration
npm run prisma:generate
npm run prisma:migrate

# 3. Generate module
npm run generate:all -- blog-post

# 4. Start development
npm run dev
```

---

## 🗄️ Prisma Commands

```bash
# Generate Prisma Client
npm run prisma:generate

# Create & apply migration
npm run prisma:migrate

# Production migration (no prompts)
npm run prisma:migrate:prod

# Reset database (⚠️ DELETES ALL DATA)
npm run prisma:reset

# Open Prisma Studio (GUI)
npm run prisma:studio

# Seed database
npm run prisma:seed

# Format schema
npx prisma format
```

### **Prisma Schema Quick Reference**

```prisma
// Basic Model
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([email])
  @@index([role])
}

// Enum
enum Role {
  USER
  ADMIN
}

// Relations
model Post {
  id       String  @id @default(uuid())
  title    String
  authorId String
  author   User    @relation(fields: [authorId], references: [id])
}

// Decimal
model Product {
  price Decimal @db.Decimal(10, 2)
}

// Array
model Article {
  tags String[]
}

// Optional
model Profile {
  bio String?
}
```

---

## 🔒 Authentication

### **Login**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "Admin123!"
}

# Response:
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "id": "uuid",
      "email": "admin@example.com",
      "role": "ADMIN"
    }
  }
}
```

### **Protected Routes**
```bash
GET /api/profile
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### **Add Auth to Routes**
```typescript
// Public route
router.get('/products', ProductController.getAll);

// Protected route (need login)
router.post('/products', authenticate, ProductController.create);

// Admin only
router.delete('/products/:id', authenticate, authorize('ADMIN'), ProductController.delete);
```

### **Get Current User in Controller**
```typescript
// req.user is available after authenticate middleware
const userId = req.user.userId;
const userRole = req.user.role;
```

---

## 🌐 WebSocket

### **Connect from Client**
```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: accessToken }
});

// Join room
socket.emit('join-room', 'room-id');

// Listen to event
socket.on('notification', (data) => {
  console.log(data);
});

// Emit event
socket.emit('message', { text: 'Hello!' });
```

### **Broadcast from Server**
```typescript
import { getWebSocketServer } from '../config/websocket';

const ws = getWebSocketServer();

// Broadcast to all
ws.broadcast('product:created', { id: 1, name: 'Product' });

// Send to room
ws.toRoom('room-id', 'order:updated', { orderId: 123 });
```

### **Common Events**
```typescript
// Client → Server
socket.emit('join-room', roomId);
socket.emit('send-message', { roomId, message });

// Server → Client
socket.on('receive-message', (data) => {});
socket.on('notification', (data) => {});
socket.on('user:online', (data) => {});
```

---

## 📖 Swagger Documentation

### **Access**
```
http://localhost:3000/api/docs
```

### **Add Documentation to Routes**
```typescript
/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       401:
 *         description: Unauthorized
 */
router.get('/', ProductController.getAll);
```

### **Auto-Regenerate on Changes**
```bash
npm run swagger:watch
```

### **Manual Generate**
```bash
npm run swagger:generate
```

---

## 🧪 Testing

### **Run Tests**
```bash
# All tests
npm run test

# Watch mode
npm run test:watch

# With coverage
npm run test -- --coverage

# E2E tests
npm run test:e2e

# Specific file
npm run test -- tests/unit/controllers/ProductController.test.ts
```

### **Test Example**
```typescript
import request from 'supertest';
import { createApp } from '../../../src/config/app';

describe('Product Controller', () => {
  let app: Express;
  let authToken: string;

  beforeAll(async () => {
    app = createApp();
    
    // Get auth token
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'Admin123!'
      });
    
    authToken = response.body.data.accessToken;
  });

  it('should create product', async () => {
    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test', price: 100, stock: 10 })
      .expect(201);

    expect(response.body.success).toBe(true);
  });
});
```

---

## 🐳 Docker

### **Local Development**
```bash
# Start PostgreSQL + Redis
docker-compose up -d postgres redis

# Check status
docker-compose ps

# View logs
docker-compose logs -f postgres

# Stop
docker-compose down
```

### **Production Build**
```bash
# Build image
docker build -t backend-starter-kit:latest .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e JWT_SECRET=your-secret \
  backend-starter-kit
```

### **Docker Compose (Full Stack)**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: starter_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/starter_db
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
```

---

## 🚀 Deployment

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

# Logs
pm2 logs backend-starter-kit

# Restart
pm2 restart backend-starter-kit

# Status
pm2 status
```

### **Environment Variables (Production)**
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=use-strong-random-string-min-32-chars
JWT_REFRESH_SECRET=another-strong-random-string
REDIS_URL=redis://host:6379
FRONTEND_URL=https://your-frontend.com
```

### **Deployment Checklist**
```
✅ Set NODE_ENV=production
✅ Update all environment variables
✅ Run prisma migrate deploy
✅ Build TypeScript (npm run build)
✅ Start with PM2/Docker
✅ Setup log aggregation
✅ Setup monitoring/alerting
✅ Configure backup database
```

---

## 🛡️ Security Features

### **10 Security Layers**
1. ✅ Request Tracking (unique ID per request)
2. ✅ Security Headers (Helmet, CSP, HSTS)
3. ✅ Strict CORS (no wildcards)
4. ✅ Rate Limiting (per user/IP/global)
5. ✅ Audit Logging (log everything)
6. ✅ Request Validation (SQL/XSS/Path traversal)
7. ✅ API Key Validation (optional)
8. ✅ Request Signature (prevent tampering)
9. ✅ JWT Authentication (short-lived tokens)
10. ✅ Suspicious Activity Detection (auto-alert)

### **Rate Limiting**
```typescript
// Default: 100 requests per 15 minutes
// Configured in src/middlewares/security.ts

// Custom rate limit
import rateLimit from 'express-rate-limit';

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10
});

router.post('/sensitive', strictLimiter, handler);
```

---

## 📝 Environment Variables

### **Required (.env)**
```bash
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/starter_db?schema=public

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-token-secret-also-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Frontend (for CORS)
FRONTEND_URL=http://localhost:3001

# Optional
API_KEY_HEADER=X-API-Key
LOG_LEVEL=info
```

---

## 🔧 Development Scripts

```bash
# Development
npm run dev              # Start with tsx watch
npm run build            # Build TypeScript
npm run build:watch      # Build watch mode

# Linting
npm run lint             # ESLint
npm run lint:fix         # ESLint fix
npm run format           # Prettier
npm run format:check     # Prettier check

# Testing
npm run test             # Run tests
npm run test:watch       # Watch mode
npm run test:e2e         # E2E tests

# Database
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Create & apply migration
npm run prisma:studio    # Open Prisma Studio
npm run prisma:seed      # Seed database
npm run prisma:reset     # Reset database

# Documentation
npm run swagger:generate # Generate Swagger
npm run swagger:watch    # Watch & regenerate

# Code Generation
npm run generate:all -- name         # Full module
npm run generate:controller -- name  # Controller only
npm run generate:service -- name     # Service only
npm run generate:repository -- name  # Repository only

# Docker
docker-compose up -d     # Start containers
docker-compose down      # Stop containers
docker-compose logs -f   # View logs

# Git Hooks
npm run prepare          # Install Husky
```

---

## 📁 Project Structure

```
backend-starter-kit/
├── src/
│   ├── controllers/     # HTTP request handlers
│   ├── services/        # Business logic
│   ├── repositories/    # Database queries
│   ├── routes/          # API route definitions
│   ├── middlewares/     # Auth, validation, error handling
│   ├── config/          # App, Prisma, Redis, WebSocket
│   ├── errors/          # Custom error classes
│   ├── utils/           # Logger, helpers
│   ├── types/           # TypeScript types
│   └── index.ts         # Entry point
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Seed data
├── tests/
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   └── e2e/             # E2E tests
├── docs/                # Documentation
├── scripts/             # Code generators
├── docker-compose.yml
├── Dockerfile
├── pm2.config.js
├── package.json
└── README.md
```

---

## 🎯 Common Patterns

### **BaseController Pattern**
```typescript
import { BaseController } from './BaseController';

export class ProductController extends BaseController {
  getAll = this.handleAsync(async (req, res) => {
    const products = await this.service.findAll();
    return this.success(res, products);
  });
}
```

### **Service Layer Pattern**
```typescript
export class ProductService {
  async findAll() {
    return this.repository.findMany();
  }

  async findById(id: string) {
    const item = await this.repository.findById(id);
    if (!item) throw new Error('Not found');
    return item;
  }
}
```

### **Repository Pattern**
```typescript
export class ProductRepository {
  async findMany() {
    return prisma.product.findMany();
  }

  async findById(id: string) {
    return prisma.product.findUnique({ where: { id } });
  }
}
```

---

## 🆘 Troubleshooting

### **Prisma Client not generated**
```bash
npm run prisma:generate
```

### **Database connection error**
```bash
# Check Docker
docker-compose ps

# Restart database
docker-compose restart postgres

# Check connection
docker-compose exec postgres psql -U postgres -c "\l"
```

### **Port already in use**
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3001
```

### **Migration error**
```bash
# Reset database (⚠️ DELETES DATA)
npm run prisma:reset

# Or fix migration manually
rm prisma/migrations/*
npm run prisma:migrate
```

---

## 📞 Support

- **Documentation:** `docs/`
- **Issues:** GitHub Issues
- **Discord:** [Your Discord Link]
- **Email:** [Your Email]

---

**Backend Starter Kit v5.0** | Made with ❤️ using TypeScript, Prisma, and Clean Architecture
