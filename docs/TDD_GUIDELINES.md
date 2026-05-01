# TDD Guidelines - Backend Starter Kit

## 📋 Table of Contents

1. [Philosophy](#philosophy)
2. [Testing Pyramid](#testing-pyramid)
3. [Test File Structure](#test-file-structure)
4. [Writing Tests (Red-Green-Refactor)](#writing-tests-red-green-refactor)
5. [Test Naming Conventions](#test-naming-conventions)
6. [Best Practices](#best-practices)
7. [Examples](#examples)

---

## 🎯 Philosophy

**"Test-Driven Development is not about testing. It's about designing software."**

### Core Principles

1. **Write tests BEFORE code** - Not after
2. **Tests are living documentation** - They describe what code should do
3. **Red-Green-Refactor** - The TDD cycle
4. **Tests protect against regression** - "Jangan menyenggol service lain"

### Why TDD Matters

```
Without TDD:
  Write Code → Test → Bug Found → Fix → New Bug → Fix → ... → 😰

With TDD:
  Write Test → Write Code → Refactor → Test → ✅ → 😊
```

---

## 📐 Testing Pyramid

```
        /\
       /  \
      / E2E \      (10%) - Full system tests
     /________\
    /          \
   /Integration\   (20%) - Service integration tests
  /______________\
 /      Unit      \  (70%) - Individual component tests
/__________________\
```

### 1. Unit Tests (70%)

**What to test:**
- Services
- Controllers
- Middlewares
- Utilities
- Repositories

**Characteristics:**
- Fast (< 100ms per test)
- Isolated (mock dependencies)
- Deterministic (same result every time)

**Example:**
```typescript
describe('AuthService', () => {
  it('should register user with valid email and password', async () => {
    // Test implementation
  });
});
```

### 2. Integration Tests (20%)

**What to test:**
- Service-to-service communication
- Database operations
- External API calls
- Redis caching

**Characteristics:**
- Moderate speed (< 1s per test)
- Real dependencies (DB, Redis)
- Test boundaries between components

**Example:**
```typescript
describe('AuthService - Integration', () => {
  it('should create user and tokens in database', async () => {
    // Uses real database
  });
});
```

### 3. E2E Tests (10%)

**What to test:**
- Complete user flows
- API endpoints end-to-end
- Authentication flows
- Critical business paths

**Characteristics:**
- Slow (1-5s per test)
- Full stack (HTTP → DB → Response)
- Test real scenarios

**Example:**
```typescript
describe('Auth Flow - E2E', () => {
  it('should complete registration → login → profile access', async () => {
    // Full HTTP flow
  });
});
```

---

## 📁 Test File Structure

### File Naming

```
tests/
├── unit/
│   ├── services/
│   │   ├── AuthService.test.ts
│   │   ├── TokenService.test.ts
│   │   └── UserService.test.ts
│   ├── controllers/
│   │   └── AuthController.test.ts
│   └── middlewares/
│       └── authenticate.test.ts
├── integration/
│   └── AuthService.integration.test.ts
└── e2e/
    └── auth.e2e.test.ts
```

### Test File Template

```typescript
/**
 * [Component Name] Unit Tests
 *
 * Tests for:
 * - [Feature 1]
 * - [Feature 2]
 * - [Edge Case 1]
 *
 * TDD Approach:
 * - Test [scenario] before implementation
 * - Test edge cases ([case 1], [case 2])
 * - Test security features ([feature])
 */

import { } from '../path/to/component.js';

describe('[ComponentName] - [Feature]', () => {
  // Test data
  const testData = { /* ... */ };

  beforeEach(() => {
    // Setup before each test
    jest.clearAllMocks();
  });

  describe('[Feature Group]', () => {
    it('should [expected behavior] when [condition]', () => {
      // Arrange
      const input = 'value';

      // Act
      const result = component.method(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should handle edge case: [description]', () => {
      // Test edge case
    });

    it('should throw [ErrorType] when [invalid input]', () => {
      // Test error handling
      expect(() => component.method(invalid)).toThrow(ErrorType);
    });
  });
});
```

---

## 🔄 Writing Tests (Red-Green-Refactor)

### Step 1: RED - Write Failing Test

```typescript
// First, write test for feature that doesn't exist yet
describe('TokenService', () => {
  it('should generate PASETO V2 token', async () => {
    const result = await TokenService.generateTokenPair(
      'user-123',
      'user@example.com',
      'USER'
    );

    expect(result.accessToken).toMatch(/^v2\.local\./);
  });
});
```

**Run test:** `npm test` → ❌ FAILS (expected)

### Step 2: GREEN - Make Test Pass

```typescript
// Write minimal code to make test pass
async generateTokenPair(userId: string, email: string, role: string) {
  const accessToken = paseto.V2.sign(key, { id: userId, email, role });
  return { accessToken, refreshToken: uuidv4() };
}
```

**Run test:** `npm test` → ✅ PASSES

### Step 3: REFACTOR - Improve Code

```typescript
// Refactor while keeping tests green
async generateTokenPair(userId: string, email: string, role: Role) {
  const key = this.keyManager.getKey();
  const payload = this.createPayload(userId, email, role);
  const accessToken = paseto.V2.sign(key, payload);
  await this.saveRefreshToken(userId);
  
  return {
    accessToken,
    refreshToken: uuidv4(),
    expiresIn: 900,
    tokenType: 'Bearer' as const,
  };
}
```

**Run test:** `npm test` → ✅ STILL PASSES

---

## 📝 Test Naming Conventions

### Describe Blocks

```typescript
// GOOD: Clear hierarchy
describe('AuthService', () => {
  describe('register', () => {
    describe('validation', () => {
      it('should reject invalid email', () => {});
      it('should reject weak password', () => {});
    });
  });
});

// BAD: Flat structure
describe('should reject invalid email', () => {});
describe('should reject weak password', () => {});
```

### Test Cases (it blocks)

**Pattern:**
```typescript
it('should [expected behavior] when [condition]', () => {});
it('should throw [Error] when [invalid input]', () => {});
it('should handle [edge case]', () => {});
```

**Examples:**
```typescript
// ✅ GOOD
it('should generate token with 15 minutes expiration', () => {});
it('should throw UnauthorizedError when token is expired', () => {});
it('should handle special characters in email', () => {});

// ❌ BAD
it('test token', () => {});
it('works correctly', () => {});
it('should work', () => {});
```

---

## ✨ Best Practices

### 1. AAA Pattern (Arrange-Act-Assert)

```typescript
it('should authenticate user with valid credentials', () => {
  // Arrange
  const validEmail = 'test@example.com';
  const validPassword = 'SecureP@ss123!';
  mockUserRepository.findByEmail.mockResolvedValue(expectedUser);

  // Act
  const result = await authService.login(validEmail, validPassword);

  // Assert
  expect(result.user).toEqual(expectedUser);
  expect(result.tokens).toBeDefined();
});
```

### 2. Test One Thing Per Test

```typescript
// ✅ GOOD: One assertion per test
it('should accept valid email', () => {
  expect(isValidEmail('test@example.com')).toBe(true);
});

it('should reject email without @', () => {
  expect(isValidEmail('invalid-email')).toBe(false);
});

// ❌ BAD: Multiple assertions
it('should test emails', () => {
  expect(isValidEmail('test@example.com')).toBe(true);
  expect(isValidEmail('invalid')).toBe(false);
  expect(isValidEmail('another@test.com')).toBe(true);
  // ... 10 more assertions
});
```

### 3. Mock External Dependencies

```typescript
// Mock Prisma
jest.mock('../../../src/config/prisma.js', () => ({
  getPrismaClient: jest.fn(),
}));

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

(getPrismaClient as jest.Mock).mockReturnValue(mockPrisma);
```

### 4. Test Edge Cases

```typescript
describe('Email Validation', () => {
  // Happy path
  it('should accept valid email', () => {});
  
  // Edge cases
  it('should handle special characters (+, ., -)', () => {});
  it('should handle unicode characters', () => {});
  it('should handle very long emails', () => {});
  it('should handle subdomains', () => {});
  
  // Invalid cases
  it('should reject email without @', () => {});
  it('should reject email without domain', () => {});
  it('should reject email with spaces', () => {});
});
```

### 5. Test Error Scenarios

```typescript
it('should throw BadRequestError when email is missing', () => {
  expect(authService.register('', 'password'))
    .rejects.toThrow(BadRequestError);
});

it('should throw ConflictError when email already exists', () => {
  mockUserRepository.findByEmail.mockResolvedValue(existingUser);
  
  expect(authService.register('existing@email.com', 'password'))
    .rejects.toThrow(ConflictError);
});
```

### 6. Keep Tests Independent

```typescript
// ✅ GOOD: Each test sets up its own data
it('should create user', () => {
  const userData = createTestUser();
  // ...
});

it('should update user', () => {
  const userData = createTestUser();
  // ...
});

// ❌ BAD: Tests depend on each other
let user;

it('should create user', () => {
  user = createUser(); // User used by next test
});

it('should update user', () => {
  updateUser(user); // Depends on previous test
});
```

### 7. Use Descriptive Test Data

```typescript
// ✅ GOOD: Clear test data
const testUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  role: 'USER' as Role,
};

// ❌ BAD: Unclear test data
const user = { id: 1, email: 'a@b.com', role: 'user' };
```

---

## 📚 Examples

### Example 1: Service Test

```typescript
/**
 * UserService Unit Tests
 */
import UserService from '../../../src/services/UserService.js';
import { ConflictError } from '../../../src/errors/index.js';

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create user with valid data', async () => {
      // Arrange
      const userData = {
        email: 'newuser@example.com',
        password: 'SecureP@ss123!',
        firstName: 'John',
      };
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
        id: 'user-123',
        ...userData,
      });

      // Act
      const result = await UserService.createUser(userData);

      // Assert
      expect(result.user.email).toBe(userData.email);
      expect(result.tokens).toBeDefined();
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: userData.email,
        })
      );
    });

    it('should throw ConflictError when email exists', async () => {
      // Arrange
      const existingUser = { id: 'existing', email: 'test@example.com' };
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(UserService.createUser({
        email: 'test@example.com',
        password: 'password',
        firstName: 'Test',
      })).rejects.toThrow(ConflictError);
    });
  });
});
```

### Example 2: Middleware Test

```typescript
/**
 * Rate Limiter Middleware Tests
 */
describe('authRateLimiter', () => {
  it('should allow requests under limit', () => {
    // Test implementation
  });

  it('should block requests over limit', () => {
    // Test implementation
  });

  it('should reset after window expires', () => {
    // Test implementation
  });
});
```

### Example 3: Integration Test

```typescript
/**
 * AuthService Integration Tests
 * Tests real database interactions
 */
describe('AuthService - Integration', () => {
  beforeAll(async () => {
    await testDb.connect();
  });

  afterAll(async () => {
    await testDb.close();
  });

  it('should create user and tokens in database', async () => {
    const result = await authService.register({
      email: 'test@example.com',
      password: 'SecureP@ss123!',
      firstName: 'Test',
    });

    // Verify in database
    const userInDb = await testDb.user.findUnique({
      where: { email: 'test@example.com' },
    });
    expect(userInDb).toBeDefined();

    const tokensInDb = await testDb.refreshToken.findMany({
      where: { userId: userInDb.id },
    });
    expect(tokensInDb).toHaveLength(1);
  });
});
```

---

## 🚀 Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/unit/services/TokenService.test.ts

# Run tests matching pattern
npm test -- -t "TokenService"

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e
```

---

## 📊 Coverage Requirements

```
File Coverage:    > 80%
Branch Coverage:  > 75%
Function Coverage: > 80%
Line Coverage:    > 80%
```

**Critical files (100% required):**
- TokenService
- authenticate middleware
- Security-related services

---

## ✅ TDD Checklist

Before committing code:

- [ ] Tests written BEFORE implementation
- [ ] All tests passing (green)
- [ ] Code coverage > 80%
- [ ] Edge cases tested
- [ ] Error scenarios tested
- [ ] Tests are independent
- [ ] Test names are descriptive
- [ ] Mocks used for external dependencies
- [ ] No test interdependencies
- [ ] Tests run fast (< 30s total)

---

## 🎓 Learning Resources

- [Test-Driven Development by Kent Beck](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530)
- [Pragmatic Programmer - TDD Section](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing JavaScript Course](https://testingjavascript.com/)

---

**Remember:** Tests are not a burden. They are your safety net that lets you refactor with confidence and sleep peacefully at night. 😴

**Last Updated:** 2026-05-01
**Version:** 1.0.0
