# 📦 ES Modules (ESM) Migration Guide

Backend Starter Kit v4.0 sekarang menggunakan **ES Modules** secara penuh untuk syntax `import/export` yang lebih modern dan clean.

---

## 🎯 What Changed

### CommonJS (v3.0) → ES Modules (v4.0)

```javascript
// ❌ CommonJS (OLD)
const express = require('express');
const config = require('./config');
module.exports = { functionName };

// ✅ ES Modules (NEW)
import express from 'express';
import config from './config.js';
export function functionName() {}
export default functionName;
```

---

## 🔧 Configuration

### package.json

```json
{
  "type": "module",  // ← Ini yang mengaktifkan ES Modules
  "main": "src/index.js"
}
```

### File Extensions

Semua import harus menggunakan **`.js` extension**:

```javascript
// ✅ CORRECT
import config from './config/index.js';
import logger from '../utils/logger.js';

// ❌ WRONG
import config from './config';
import logger from '../utils/logger';
```

---

## 📝 Import/Export Patterns

### Named Exports

```javascript
// utils.js
export function function1() {}
export function function2() {}
export const CONSTANT = 'value';

// main.js
import { function1, function2, CONSTANT } from './utils.js';
```

### Default Export

```javascript
// config.js
export default {
  app: { port: 3000 },
  // ...
};

// main.js
import config from './config.js';
```

### Mixed Exports

```javascript
// logger.js
export default logger;
export function createChildLogger(name) {}

// main.js
import logger, { createChildLogger } from './logger.js';
```

---

## 🔄 Common Patterns Migration

### 1. Express App

```javascript
// ❌ CommonJS
const express = require('express');
const app = express();
module.exports = app;

// ✅ ES Modules
import express from 'express';
const app = express();
export default app;
```

### 2. Middleware

```javascript
// ❌ CommonJS
const authenticate = (req, res, next) => {
  // logic
};
module.exports = { authenticate };

// ✅ ES Modules
export const authenticate = (req, res, next) => {
  // logic
};
```

### 3. Classes

```javascript
// ❌ CommonJS
class BaseController {
  constructor() {}
}
module.exports = BaseController;

// ✅ ES Modules
export default class BaseController {
  constructor() {}
}
```

### 4. Singleton Pattern

```javascript
// ❌ CommonJS
class Service {
  constructor() {}
}
module.exports = new Service();

// ✅ ES Modules
class Service {
  constructor() {}
}
export default new Service();
```

---

## 📁 File Structure (ESM)

```
src/
├── config/
│   ├── index.js           # export default config
│   ├── prisma.js          # export functions
│   └── app.js             # export createApp
│
├── middlewares/
│   ├── errorHandler.js    # export functions
│   ├── authenticate.js    # export functions
│   └── security.js        # export functions
│
├── controllers/
│   ├── BaseController.js  # export default class
│   └── UserController.js  # export default instance
│
├── services/
│   ├── BaseService.js     # export default class
│   └── UserService.js     # export default instance
│
├── repositories/
│   ├── BaseRepository.js  # export default class
│   └── UserRepository.js  # export default instance
│
├── routes/
│   ├── index.js           # export default router
│   └── user.routes.js     # export default router
│
├── errors/
│   └── index.js           # export classes
│
└── index.js               # Main entry point
```

---

## 🚀 Migration Checklist

### Core Files

- [x] `package.json` - Add `"type": "module"`
- [x] `src/index.js` - Convert to ESM
- [x] `src/config/index.js` - Convert to ESM
- [x] `src/config/prisma.js` - Convert to ESM
- [x] `src/config/app.js` - Convert to ESM
- [x] `src/utils/logger.js` - Convert to ESM
- [x] `src/errors/index.js` - Convert to ESM
- [x] `src/middlewares/*.js` - Convert to ESM
- [x] `src/controllers/*.js` - Convert to ESM
- [x] `src/services/*.js` - Convert to ESM
- [x] `src/repositories/*.js` - Convert to ESM
- [x] `src/routes/*.js` - Convert to ESM

### Scripts

- [x] Generator scripts (CommonJS wrapper)
- [x] Swagger generator
- [x] Prisma model generator

---

## ⚠️ Common Issues & Solutions

### 1. `__dirname is not defined`

**Problem:**
```javascript
// ❌ Error in ESM
const path = require('path');
const currentDir = __dirname;
```

**Solution:**
```javascript
// ✅ ESM way
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

### 2. `require is not defined`

**Problem:**
```javascript
// ❌ Error in ESM
const config = require('./config.js');
```

**Solution:**
```javascript
// ✅ ESM way
import config from './config.js';
```

### 3. JSON Imports

**Problem:**
```javascript
// ❌ Doesn't work in ESM (Node.js < 21)
import config from './config.json';
```

**Solution:**
```javascript
// ✅ ESM way
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const config = JSON.parse(readFileSync('./config.json', 'utf-8'));
```

### 4. Circular Dependencies

**Problem:**
```javascript
// a.js imports b.js
// b.js imports a.js
// ❌ Can cause issues in ESM
```

**Solution:**
- Refactor to avoid circular dependencies
- Use dependency injection
- Move shared code to separate module

### 5. Dynamic Imports

**Problem:**
```javascript
// ❌ Static import might not work for lazy loading
import heavyModule from './heavy.js';
```

**Solution:**
```javascript
// ✅ Dynamic import in ESM
const heavyModule = await import('./heavy.js');
```

---

## 🔍 Testing ESM

### Run Tests

```bash
# Jest with ESM
npm run test

# With experimental VM modules
node --experimental-vm-modules node_modules/jest/bin/jest.js
```

### Jest Configuration

```javascript
// jest.config.js
export default {
  testEnvironment: 'node',
  transform: {}, // No transformation needed for ESM
};
```

---

## 📊 Benefits of ES Modules

| Feature | CommonJS | ES Modules | Benefit |
|---------|----------|------------|---------|
| **Syntax** | `require()` | `import` | Cleaner, more readable |
| **Static Analysis** | ❌ | ✅ | Better tooling support |
| **Tree Shaking** | ❌ | ✅ | Smaller bundles |
| **Async Loading** | ❌ | ✅ | Dynamic imports |
| **Browser Compatible** | ❌ | ✅ | Same syntax everywhere |
| **Type Safety** | Limited | Better | TypeScript friendly |

---

## 🎓 Code Examples

### Complete Controller (ESM)

```javascript
// src/controllers/UserController.js
import { body, param } from 'express-validator';
import BaseController from './BaseController.js';
import UserService from '../services/UserService.js';
import { handleValidationErrors } from '../middlewares/validator.js';
import { authenticate, authorize } from '../middlewares/authenticate.js';

class UserController extends BaseController {
  constructor() {
    super(UserService, 'User');
  }

  getAll = this.handle(async (req, res) => {
    const options = this.extractQueryParams(req);
    const result = await this.service.getAll(options);
    this.sendPaginated(res, result);
  });

  getById = this.handle(async (req, res) => {
    const { id } = req.params;
    const result = await this.service.getById(id);
    this.sendSuccess(res, result);
  });
}

export default new UserController();
```

### Complete Service (ESM)

```javascript
// src/services/UserService.js
import { ConflictError } from '../errors/index.js';
import UserRepository from '../repositories/UserRepository.js';
import BaseService from './BaseService.js';
import { getPrismaClient } from '../config/prisma.js';

class UserService extends BaseService {
  constructor() {
    super(UserRepository);
    this.prisma = getPrismaClient();
  }

  async createUser(userData) {
    const existing = await this.repository.findByEmail(userData.email);
    if (existing) {
      throw new ConflictError('Email exists', 'EMAIL_EXISTS');
    }
    return this.prisma.user.create({ data: userData });
  }
}

export default new UserService();
```

### Complete Route (ESM + Swagger)

```javascript
// src/routes/user.routes.js
import express from 'express';
import UserController from '../controllers/UserController.js';
import { authenticate } from '../middlewares/authenticate.js';

const router = express.Router();
router.use(authenticate);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/', UserController.getAll);

export default router;
```

---

## 🚦 Migration Steps (For Existing Projects)

### Step 1: Update package.json

```json
{
  "type": "module"
}
```

### Step 2: Update Imports (Bottom-Up)

1. Start with utilities (logger, errors)
2. Update config files
3. Update repositories
4. Update services
5. Update controllers
6. Update routes
7. Update main entry point

### Step 3: Test

```bash
# Run linter
npm run lint

# Run tests
npm run test

# Start dev server
npm run dev
```

---

## 📖 Resources

### Documentation
- [Node.js ES Modules](https://nodejs.org/api/esm.html)
- [MDN import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import)
- [MDN export](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export)

### Tools
- [ESM Cheat Sheet](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c)
- [CommonJS to ESM Converter](https://github.com/GoogleChromeLabs/webpack-mermaid)

---

## ✅ Quick Reference

### Import Patterns

```javascript
// Default import
import config from './config.js';

// Named import
import { function1, function2 } from './utils.js';

// Both
import logger, { createChildLogger } from './logger.js';

// All as object
import * as utils from './utils.js';

// Dynamic import
const module = await import('./lazy.js');
```

### Export Patterns

```javascript
// Default export
export default functionName;

// Named export
export function functionName() {}
export const CONSTANT = 'value';

// Both
export default class ClassName {}
export const helper = () => {};
```

---

**Backend Starter Kit v4.0 - Full ES Modules!** ⚡

Clean, modern, and future-proof codebase!
