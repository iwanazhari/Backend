# 👥 Team Guidelines & Conventions

## 📋 Purpose

Dokumen ini berisi **aturan wajib** untuk memastikan konsistensi code ketika dikerjakan oleh tim. Tujuannya:
- ✅ Menghindari typo dan human error
- ✅ Konsistensi code style
- ✅ Mencegah perbedaan implementasi
- ✅ Memudahkan code review
- ✅ Mempercepat onboarding member baru

---

## 🚨 WAJIB DILAKUKAN (Non-negotiable)

### 1. **Selalu Gunakan Code Generator**

❌ **JANGAN** buat file manual
```javascript
// ❌ SALAH - Buat manual
// Manual create ProductController.js
```

✅ **GUNAKAN** generator
```bash
# ✅ BENAR
npm run generate:all -- product
```

**Alasan**: Generator memastikan semua file mengikuti pattern yang sama, menghindari typo, dan menghemat waktu.

---

### 2. **Pre-commit Hook (Lint-staged)**

Code akan **otomatis di-lint dan di-format** sebelum commit.

```bash
# Install dependencies
npm install

# Pre-commit hook otomatis aktif
# Jangan skip!
```

**Jika error saat commit**:
```bash
# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Commit lagi
git add .
git commit -m "feat: your message"
```

---

### 3. **Conventional Commits**

Format commit **WAJIB** mengikuti conventional commits:

```bash
# ✅ BENAR
git commit -m "feat(auth): add JWT refresh token"
git commit -m "fix(users): resolve email validation"
git commit -m "docs(readme): update installation guide"

# ❌ SALAH
git commit -m "update code"
git commit -m "fix bug"
git commit -m "wip"
```

**Types yang valid**:
- `feat` - Fitur baru
- `fix` - Bug fix
- `docs` - Dokumentasi
- `style` - Code style (formatting)
- `refactor` - Refactoring
- `test` - Test
- `chore` - Maintenance

---

### 4. **Prisma Workflow**

Setiap kali mengubah schema Prisma:

```bash
# 1. Edit prisma/schema.prisma

# 2. Generate Prisma Client (WAJIB)
npm run prisma:generate

# 3. Create migration
npm run prisma:migrate

# 4. Commit perubahan
```

**Jangan skip generate!** Kalau skip, akan error: `Cannot find module '.prisma/client'`

---

### 5. **Code Review Checklist**

Sebelum request review, pastikan:

```markdown
- [ ] Lint passed (npm run lint)
- [ ] Format passed (npm run format:check)
- [ ] Tests passed (npm run test)
- [ ] Test coverage > 70%
- [ ] No console.log (gunakan logger)
- [ ] Error handling lengkap
- [ ] Validation di controller
- [ ] Business logic di service
- [ ] Commit message sesuai conventional commit
```

---

## 📝 Code Conventions

### 1. **Naming Conventions**

```javascript
// ✅ BENAR
class UserRepository { }           // PascalCase untuk class
const userService = new UserService(); // camelCase untuk variable
const USER_STATUS = 'ACTIVE';      // UPPER_CASE untuk constant
function getUserById() { }         // camelCase untuk function
const user_routes = '...';         // snake_case untuk file routes

// ❌ SALAH
class userrepository { }           // lowercase
const UserService = ...            // PascalCase untuk variable
const userStatus = 'ACTIVE';       // camelCase untuk constant
```

### 2. **File Naming**

```
✅ BENAR:
- UserController.js         (PascalCase)
- user.routes.js            (snake_case untuk routes)
- BaseRepository.js         (PascalCase)
- auth.middleware.js        (snake_case untuk middleware)

❌ SALAH:
- userController.js
- UserRoutes.js
- baserepository.js
```

### 3. **Error Handling**

```javascript
// ✅ BENAR - Gunakan custom error
throw new NotFoundError('User not found', 'USER_NOT_FOUND');
throw new ConflictError('Email exists', 'EMAIL_EXISTS');

// ❌ SALAH - Jangan throw string
throw 'User not found';
throw new Error('User not found'); // Kurang spesifik
```

### 4. **Validation**

```javascript
// ✅ BENAR - Validate di controller dengan express-validator
static validation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  handleValidationErrors,
];

// ❌ SALAH - Validate di service atau tidak validate
async create(data) {
  // Jangan validate di sini!
  if (!data.email) throw 'Email required';
}
```

### 5. **Logging**

```javascript
// ✅ BENAR - Gunakan logger
const logger = require('../utils/logger').createChildLogger('service');
logger.info('User created', { userId: user.id });

// ❌ SALAH - Jangan console.log
console.log('User created');
console.error('Error occurred');
```

---

## 🛠️ Development Workflow

### 1. **Setup Development Environment**

```bash
# Clone repository
git clone <repository>
cd backend-starter-kit

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Setup database
docker-compose up -d postgres redis
npm run prisma:generate
npm run prisma:migrate

# Start development
npm run dev
```

### 2. **Menambah Fitur Baru**

```bash
# 1. Generate Prisma model
npm run generate:prisma-model -- Product name:string price:decimal:10,2

# 2. Generate Prisma client
npm run prisma:generate

# 3. Run migration
npm run prisma:migrate

# 4. Generate module
npm run generate:all -- product

# 5. Edit business logic
# - src/services/ProductService.js

# 6. Edit validation
# - src/controllers/ProductController.js

# 7. Write tests
# - tests/unit/controllers/ProductController.test.js

# 8. Test
npm run test

# 9. Commit
git add .
git commit -m "feat(products): add product management"
```

### 3. **Fixing Bug**

```bash
# 1. Create branch
git checkout -b fix/bug-description

# 2. Fix the bug

# 3. Run tests
npm run test

# 4. Commit
git commit -m "fix(module): describe the fix"

# 5. Push dan PR
```

---

## 🚫 Common Mistakes (Hindari!)

### 1. **Skip Pre-commit Hook**

```bash
# ❌ JANGAN
git commit --no-verify -m "feat: skip validation"

# ✅ BENAR
# Fix error yang muncul, jangan di-skip
```

### 2. **Direct Database Access dari Controller**

```javascript
// ❌ SALAH
class ProductController {
  async getAll(req, res) {
    const products = await prisma.product.findMany(); // Langsung akses Prisma!
    res.json(products);
  }
}

// ✅ BENAR
class ProductController {
  async getAll(req, res) {
    const result = await this.service.getAll(); // Lewat service!
    this.sendPaginated(res, result);
  }
}
```

### 3. **Business Logic di Controller**

```javascript
// ❌ SALAH
async create(req, res) {
  const { name, price } = req.body;
  
  // Business logic di controller!
  if (price < 0) throw 'Price must be positive';
  const product = await prisma.product.create({ data: { name, price } });
  res.json(product);
}

// ✅ BENAR
async create(req, res) {
  const result = await this.service.create(req.body); // Business logic di service
  this.sendCreated(res, result);
}
```

### 4. **Hardcode Values**

```javascript
// ❌ SALAH
const secret = 'my-secret-key';
const port = 3000;

// ✅ BENAR
const config = require('../config');
const secret = config.jwt.secret;
const port = config.app.port;
```

---

## 📊 Quality Metrics

### Target Minimal

```yaml
Test Coverage:
  Statements: 70%
  Branches: 70%
  Functions: 70%
  Lines: 70%

Code Quality:
  ESLint: No errors
  Prettier: Formatted
  Commit Messages: Conventional
```

### Check Before PR

```bash
# Run all checks
npm run lint
npm run format:check
npm run test -- --coverage

# Check coverage
open coverage/index.html
```

---

## 🔧 Useful Commands

```bash
# Development
npm run dev              # Start dengan nodemon

# Code Quality
npm run lint             # Check code
npm run lint:fix         # Fix automatically
npm run format           # Format code
npm run format:check     # Check formatting

# Testing
npm run test             # Run tests
npm run test:watch       # Watch mode
npm run test -- --coverage  # With coverage

# Database
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio

# Code Generation
npm run generate:all -- moduleName          # Generate full module
npm run generate:prisma-model -- ModelName  # Generate Prisma model

# Production
npm start                # Start dengan PM2
npm run docker:up        # Start Docker
```

---

## 📚 Resources

### Documentation
- [Architecture Guide](docs/ARCHITECTURE.md)
- [Quick Reference](docs/QUICK_REFERENCE.md)
- [Prisma Docs](https://www.prisma.io/docs)
- [Express.js Docs](https://expressjs.com/)

### Tools
- [ESLint](https://eslint.org/)
- [Prettier](https://prettier.io/)
- [Jest](https://jestjs.io/)
- [PM2](https://pm2.keymetrics.io/)

---

## 💡 Tips

### Untuk Junior Developer

1. **Selalu gunakan generator** - Jangan buat manual!
2. **Ikuti pattern yang ada** - Lihat contoh User module
3. **Test sebelum commit** - `npm run test`
4. **Baca error message** - Biasanya jelas
5. **Tanya jika ragu** - Lebih baik tanya daripada salah

### Untuk Senior Developer

1. **Review code dengan checklist** - Jangan skip
2. **Ensure coverage > 70%** - Minimal target
3. **Check conventional commit** - Konsistensi
4. **Mentor junior** - Bantu kalau ada yang stuck

---

## ⚠️ Consequences

Jika tidak mengikuti guidelines:

1. **Pre-commit hook akan reject** - Code tidak bisa di-commit
2. **CI/CD akan fail** - Build tidak akan deploy
3. **PR akan di-reject** - Harus fix dulu
4. **Code inconsistency** - Sulit maintain

---

**Remember**: Guidelines ini dibuat untuk **mempermudah** pekerjaan tim, bukan mempersulit. Dengan mengikuti aturan, kita hemat waktu dan menghindari bug! 🚀

Last updated: 2024-01-XX
