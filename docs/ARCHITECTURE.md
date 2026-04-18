# Architecture Documentation

## Overview

Backend Starter Kit mengikuti prinsip-prinsip dari:
- **The Pragmatic Programmer** - Fail-fast, DRY, Convention over Configuration
- **Clean Code** - Meaningful names, Single Responsibility, Thin controllers
- **Designing Data-Intensive Applications** - Caching strategies, Connection pooling, Reliability

## Architecture Layers

```
┌─────────────────────────────────────────┐
│          HTTP Layer (Express)           │
│              Controllers                │
├─────────────────────────────────────────┤
│         Business Logic Layer            │
│              Services                   │
├─────────────────────────────────────────┤
│         Data Access Layer               │
│            Repositories                 │
├─────────────────────────────────────────┤
│          Database (Sequelize)           │
│              Models                     │
└─────────────────────────────────────────┘
```

## Request Flow

```
Client Request
    ↓
Middleware (Auth, Validation, Logging)
    ↓
Controller (HTTP handling only)
    ↓
Service (Business logic)
    ↓
Repository (Data access)
    ↓
Database
    ↓
Repository
    ↓
Service
    ↓
Controller
    ↓
Middleware (Error handling)
    ↓
Client Response
```

## Design Patterns

### 1. Repository Pattern

**Purpose**: Abstract data access logic from business logic.

```javascript
// Repository
class UserRepository extends BaseRepository {
  async findByEmail(email) {
    return this.findOne({ email });
  }
}

// Service uses repository
class UserService extends BaseService {
  async getUserByEmail(email) {
    return this.repository.findByEmail(email);
  }
}
```

**Benefits**:
- Easy to swap database implementation
- Easy to test (mock repositories)
- Single Responsibility Principle

### 2. Service Layer Pattern

**Purpose**: Encapsulate business logic.

```javascript
class UserService extends BaseService {
  async register(userData) {
    // Business rules
    const existing = await this.repository.findByEmail(userData.email);
    if (existing) {
      throw new ConflictError('Email exists');
    }
    
    // Create user
    return this.repository.create(userData);
  }
}
```

**Benefits**:
- Centralized business logic
- Easy to test
- Reusable across controllers

### 3. Thin Controller Pattern

**Purpose**: Controllers only handle HTTP, not business logic.

```javascript
// ✅ Good: Thin controller
class UserController extends BaseController {
  getAll = this.handle(async (req, res) => {
    const options = this.extractQueryParams(req);
    const result = await this.service.getAll(options);
    this.sendPaginated(res, result);
  });
}

// ❌ Bad: Fat controller (avoid this)
class UserController {
  getAll = async (req, res) => {
    // Don't put business logic here!
    const users = await User.findAll();
    res.json(users);
  };
}
```

### 4. Dependency Injection

**Purpose**: Loose coupling through constructor injection.

```javascript
class UserService extends BaseService {
  constructor(userRepository) {
    super(userRepository);
  }
}

// Usage
const userService = new UserService(UserRepository);
```

### 5. Singleton Pattern

**Purpose**: Single instance of services and repositories.

```javascript
// Export singleton
module.exports = new UserService();

// Import anywhere
const UserService = require('../services/UserService');
```

## Key Principles

### 1. Fail-Fast

Validate early, fail early.

```javascript
// Configuration validation on startup
config.validate();

// Dependency check
require('./utils/require-check');

// Request validation
router.post('/', validationRules, controller.create);
```

### 2. DRY (Don't Repeat Yourself)

Base classes provide reusable functionality.

```javascript
// Base Repository with common CRUD
class BaseRepository {
  async findAll() { ... }
  async findById() { ... }
  async create() { ... }
}

// Base Service with common operations
class BaseService {
  async getAll() { ... }
  async getById() { ... }
  async create() { ... }
}

// Base Controller with response handling
class BaseController {
  sendSuccess() { ... }
  sendPaginated() { ... }
}
```

### 3. Convention over Configuration

Standard naming and structure reduces decision fatigue.

```
ModuleName/
├── ModuleName Model
├── ModuleNameRepository
├── ModuleNameService
├── ModuleNameController
└── module.routes.js
```

### 4. Separation of Concerns

Each layer has one responsibility.

```
Config    → Configuration only
Models    → Database schema only
Repositories → Data access only
Services  → Business logic only
Controllers → HTTP handling only
Middlewares → Cross-cutting concerns
```

## Caching Strategy

### Cache-Aside Pattern

```javascript
async function getUserWithCache(id) {
  return cacheWrapper(
    `user:${id}`,           // Cache key
    () => userRepository.findById(id),  // Fetch function
    3600                     // TTL (seconds)
  );
}
```

**Flow**:
1. Check cache
2. If hit → return cached data
3. If miss → fetch from database, store in cache, return

## Error Handling

### Custom Error Classes

```javascript
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

class BadRequestError extends AppError {
  constructor(message, code) {
    super(message, 400, code);
  }
}
```

### Global Error Handler

```javascript
// Middleware catches all errors
function errorHandler(err, req, res, next) {
  // Log error
  logger.error(err);
  
  // Send appropriate response
  res.status(err.statusCode).json({
    success: false,
    error: { message, code }
  });
}
```

## Security

### Authentication Flow

```
1. Client sends credentials
2. Server validates credentials
3. Server generates JWT access token + refresh token
4. Client stores tokens
5. Client sends access token in Authorization header
6. Server validates token, extracts user
7. When access token expires, use refresh token to get new one
```

### Middleware Stack

```javascript
// Apply to routes
router.use(helmet());              // Security headers
router.use(cors());                // CORS
router.use(rateLimiter);           // Rate limiting
router.use(authenticate);          // JWT validation
router.use(authorize('admin'));    // Role check
router.use(validationRules);       // Input validation
```

## Database Design

### Model Conventions

```javascript
const Model = sequelize.define('Model', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  // Timestamps added automatically
  // created_at, updated_at, deleted_at
}, {
  tableName: 'models',
  paranoid: true,        // Soft deletes
  underscored: true,     // snake_case columns
  timestamps: true,
  indexes: [
    { fields: ['email'], unique: true },
  ],
});
```

### Connection Pooling

```javascript
pool: {
  max: 10,      // Maximum connections
  min: 2,       // Minimum connections
  acquire: 30000, // Max time to get connection
  idle: 10000,  // Max idle time before release
}
```

## Testing Strategy

### Test Pyramid

```
        /\
       /  \      E2E Tests (few)
      /----\
     /      \    Integration Tests (some)
    /--------\
   /          \   Unit Tests (many)
  /------------\
```

### Unit Test Example

```javascript
describe('UserService', () => {
  let service, mockRepository;

  beforeEach(() => {
    mockRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };
    service = new UserService(mockRepository);
  });

  it('should register user', async () => {
    mockRepository.findByEmail.mockResolvedValue(null);
    mockRepository.create.mockResolvedValue(user);

    const result = await service.register(userData);

    expect(result).toBeDefined();
    expect(mockRepository.create).toHaveBeenCalled();
  });
});
```

## Code Generation

### How It Works

```javascript
// generate-all.js
function generateAll(moduleName) {
  generateModel(moduleName);
  generateRepository(moduleName);
  generateService(moduleName);
  generateController(moduleName);
  generateRoutes(moduleName);
  generateTest(moduleName);
  updateRoutesIndex(moduleName);
}
```

### Templates

Each generator uses template strings:

```javascript
const content = `
class ${pascalName}Service extends BaseService {
  // TODO: Add business logic
}
`;

writeFile(`src/services/${pascalName}Service.js`, content);
```

## Performance Optimization

### 1. Database Indexes

```javascript
indexes: [
  { fields: ['email'], unique: true },
  { fields: ['status'] },
  { fields: ['created_at'] },
]
```

### 2. Connection Pooling

```javascript
pool: {
  max: 10,
  min: 2,
}
```

### 3. Redis Caching

```javascript
// Cache frequently accessed data
const user = await cacheWrapper(
  `user:${id}`,
  () => userRepository.findById(id),
  3600
);
```

### 4. Rate Limiting

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
});
```

## Monitoring & Observability

### Structured Logging

```javascript
logger.info('User registered', {
  userId: user.id,
  email: user.email,
  timestamp: new Date().toISOString(),
});
```

### Request Tracking

```javascript
// Each request gets unique ID
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000

// Logged throughout request lifecycle
logger.info('Request started', { requestId });
logger.info('Request completed', { requestId, duration });
```

### Health Checks

```javascript
// /api/health/ready
{
  status: 'ready',
  checks: {
    app: true,
    database: true,
    redis: true
  }
}
```

## Best Practices Checklist

### Code Quality
- [ ] ESLint passes
- [ ] Prettier formatted
- [ ] No console.log (use logger)
- [ ] No magic numbers
- [ ] Meaningful variable names

### Security
- [ ] Input validation
- [ ] Authentication required
- [ ] Authorization checked
- [ ] SQL injection prevented (ORM)
- [ ] XSS prevented (helmet)

### Testing
- [ ] Unit tests for services
- [ ] Integration tests for controllers
- [ ] Error cases tested
- [ ] Edge cases covered

### Documentation
- [ ] JSDoc comments
- [ ] README updated
- [ ] API endpoints documented
- [ ] TODO comments for future work

### Performance
- [ ] Database indexes added
- [ ] N+1 queries avoided
- [ ] Caching implemented where appropriate
- [ ] Connection pooling configured

---

This architecture is designed to be:
- **Scalable** - Easy to add new features
- **Maintainable** - Clear structure, easy to understand
- **Testable** - Dependency injection, clear boundaries
- **Secure** - Built-in security best practices
- **Performant** - Caching, connection pooling, indexes
