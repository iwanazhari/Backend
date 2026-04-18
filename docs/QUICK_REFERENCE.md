# 🚀 Backend Starter Kit - Quick Reference

## Command Paling Penting

### Generate Module Baru (HEMAT 70% WAKTU!)

```bash
# Generate semua file untuk module baru
npm run generate:all -- namaModule

# Contoh:
npm run generate:all -- product
npm run generate:all -- blog-post
npm run generate:all -- user-profile
```

Ini akan otomatis membuat:
- ✅ `src/models/Product.js`
- ✅ `src/repositories/ProductRepository.js`
- ✅ `src/services/ProductService.js`
- ✅ `src/controllers/ProductController.js`
- ✅ `src/routes/product.routes.js`
- ✅ `tests/unit/controllers/ProductController.test.js`
- ✅ Update `src/routes/index.js`

### Generate Individual

```bash
npm run generate:controller -- ProductName
npm run generate:service -- ProductName
npm run generate:repository -- ProductName
npm run generate:model -- ProductName
```

## Development Workflow

```bash
# 1. Setup awal
./setup.sh

# 2. Start database (Docker)
docker-compose up -d postgres redis

# 3. Start development
npm run dev

# 4. Generate module baru
npm run generate:all -- product

# 5. Edit business logic di service
#    src/services/ProductService.js

# 6. Add validation di controller
#    src/controllers/ProductController.js

# 7. Test
npm run test
```

## Struktur Folder

```
backend-starter-kit/
├── src/
│   ├── config/           # Konfigurasi
│   ├── controllers/      # HTTP layer
│   ├── middlewares/      # Auth, validation, logging
│   ├── models/           # Database models
│   ├── repositories/     # Data access
│   ├── services/         # Business logic
│   ├── routes/           # Routes
│   ├── errors/           # Custom errors
│   ├── utils/            # Helpers
│   └── index.js          # Entry point
│
├── scripts/              # Code generators
├── tests/                # Tests
├── docs/                 # Documentation
├── docker-compose.yml
└── package.json
```

## Arsitektur (Clean Architecture)

```
HTTP Request
    ↓
Controller (thin)      → Handle HTTP only
    ↓
Service (fat)          → Business logic
    ↓
Repository             → Data access
    ↓
Database               → Persistence
```

## Pola Penting

### 1. Repository Pattern

```javascript
// Repository
class ProductRepository extends BaseRepository {
  async findByName(name) {
    return this.findOne({ name });
  }
}

// Service menggunakan repository
class ProductService extends BaseService {
  async createProduct(data) {
    // Business logic
    return this.repository.create(data);
  }
}
```

### 2. Thin Controller

```javascript
// ✅ GOOD
class ProductController extends BaseController {
  getAll = this.handle(async (req, res) => {
    const options = this.extractQueryParams(req);
    const result = await this.service.getAll(options);
    this.sendPaginated(res, result);
  });
}

// ❌ BAD - Jangan taruh business logic di controller!
```

### 3. Error Handling

```javascript
// Custom errors
throw new BadRequestError('Invalid input', 'INVALID_INPUT');
throw new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND');
throw new ConflictError('Email exists', 'EMAIL_EXISTS');

// Ditangkap otomatis oleh errorHandler middleware
```

### 4. Authentication

```javascript
// Di routes
router.get('/profile', authenticate, controller.getProfile);
router.post('/admin', authenticate, authorize('admin'), controller.admin);

// Di controller
async getProfile = this.handle(async (req, res) => {
  // req.user tersedia
  const userId = req.user.id;
  const result = await this.service.getProfile(userId);
  this.sendSuccess(res, result);
});
```

## API Endpoints (Built-in)

### Authentication
```
POST /api/auth/register     - Register
POST /api/auth/login        - Login
POST /api/auth/refresh      - Refresh token
POST /api/auth/logout       - Logout (auth required)
GET  /api/auth/profile      - Get profile (auth required)
PUT  /api/auth/profile      - Update profile (auth required)
POST /api/auth/change-password - Change password (auth required)
DELETE /api/auth/account    - Delete account (auth required)
```

### Users (Admin)
```
GET    /api/users           - Get all users (admin)
GET    /api/users/:id       - Get user (admin)
PATCH  /api/users/:id/status - Update status (admin)
DELETE /api/users/:id       - Delete user (admin)
GET    /api/users/search    - Search users
GET    /api/users/stats     - Statistics (admin)
```

### Health Checks
```
GET /api/health      - Basic health
GET /api/health/ready - Readiness check
GET /api/health/live  - Liveness check
GET /api/health/info  - App info
```

## Environment Variables

```bash
# .env
NODE_ENV=development
APP_PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=starter_kit_dev
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRE=30d
```

## Scripts

```bash
# Development
npm run dev              # Start dengan nodemon
npm run start            # Start production

# Code Generation (🔥)
npm run generate:all -- moduleName
npm run generate:controller -- ModuleName
npm run generate:service -- ModuleName
npm run generate:repository -- ModuleName
npm run generate:model -- ModuleName

# Database
npm run db:migrate       # Run migrations
npm run db:seed          # Run seeders
npm run db:reset         # Reset database

# Code Quality
npm run lint             # Check code
npm run lint:fix         # Fix code
npm run format           # Format code

# Testing
npm run test             # Run tests
npm run test:watch       # Watch mode
npm run test:e2e         # E2E tests

# Docker
npm run docker:up        # Start containers
npm run docker:down      # Stop containers
```

## Tips untuk Junior Developer

### 1. Memulai Project Baru

```bash
# 1. Clone & setup
./setup.sh

# 2. Start database
docker-compose up -d postgres redis

# 3. Generate module pertama
npm run generate:all -- product

# 4. Edit model (tambah fields)
# src/models/Product.js

# 5. Edit service (tambah business logic)
# src/services/ProductService.js

# 6. Edit controller (tambah validation)
# src/controllers/ProductController.js

# 7. Test!
npm run test
```

### 2. Menambah Field Baru

```javascript
// 1. Edit model
// src/models/Product.js
const Product = sequelize.define('Product', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  description: { type: DataTypes.TEXT },
  // Tambah field baru di sini
});

// 2. Buat migration
npx sequelize-cli migration:generate --name add_product_fields

// 3. Run migration
npm run db:migrate
```

### 3. Menambah Business Logic

```javascript
// src/services/ProductService.js
class ProductService extends BaseService {
  async createProduct(data) {
    // 1. Validasi business rule
    const existing = await this.repository.findByName(data.name);
    if (existing) {
      throw new ConflictError('Product already exists', 'DUPLICATE_PRODUCT');
    }

    // 2. Buat product
    const product = await this.repository.create(data);

    // 3. Log atau side effects
    this.logger.info('Product created', { productId: product.id });

    return product;
  }
}
```

### 4. Menambah Validation

```javascript
// src/controllers/ProductController.js
class ProductController extends BaseController {
  static validation = [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: 255 })
      .withMessage('Name too long'),
    body('price')
      .notEmpty()
      .withMessage('Price is required')
      .isFloat({ min: 0 })
      .withMessage('Price must be positive'),
    handleValidationErrors,
  ];
}
```

## Troubleshooting

### Database Connection Failed
```bash
# Check PostgreSQL running
docker-compose ps

# Restart
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### Port Already in Use
```bash
# Change in .env
APP_PORT=3001
```

### Migration Error
```bash
# Reset database
npm run db:reset

# Or undo last migration
npx sequelize-cli db:migrate:undo
```

### Tests Failing
```bash
# Clear cache
npm run test -- --clearCache

# Run specific test
npm run test -- tests/unit/controllers/ProductController.test.js
```

## Best Practices

### ✅ DO
- Use code generator untuk module baru
- Taruh business logic di service
- Gunakan repository untuk data access
- Validate semua input
- Gunakan logger bukan console.log
- Write tests
- Use custom errors

### ❌ DON'T
- Taruh business logic di controller
- Hardcode sensitive data (use .env)
- Skip validation
- Use console.log (use logger)
- Skip tests
- Direct database access dari controller
- Ignore error handling

## Resources

### Documentation
- [Architecture Guide](docs/ARCHITECTURE.md)
- [README.md](README.md)

### Books
- The Pragmatic Programmer
- Clean Code
- Designing Data-Intensive Applications

### External Links
- [Express.js](https://expressjs.com/)
- [Sequelize ORM](https://sequelize.org/)
- [Jest Testing](https://jestjs.io/)

---

**Happy Coding! 🚀**

Generated with Backend Starter Kit - Menghemat 70% waktu development Anda!
