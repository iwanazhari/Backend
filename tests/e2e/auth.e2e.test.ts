/**
 * Auth E2E Tests
 * End-to-End tests with real HTTP server and database
 * 
 * Run: npm test -- tests/e2e/auth.e2e.test.ts
 */

import request from 'supertest';
import express from 'express';
import {
  getTestPrisma,
  closeTestPrisma,
  truncateAllTables,
  seedUser,
  generateUniqueEmail,
  TEST_CREDENTIALS,
} from '../../tests/utils/prisma-test-utils.js';
import authRoutes from '../../src/routes/auth.routes.js';
import { authenticate } from '../../src/middlewares/authenticate.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// Health check endpoint for testing
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

describe('Auth E2E Tests', () => {
  const prisma = getTestPrisma();

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await closeTestPrisma();
  });

  beforeEach(async () => {
    // Clean database before each test
    await truncateAllTables(prisma);
  });

  // ============================================
  // REGISTER E2E TESTS
  // ============================================

  describe('POST /api/auth/register', () => {
    it('should register user successfully (201)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: generateUniqueEmail(),
          password: TEST_CREDENTIALS.VALID_PASSWORD,
          firstName: 'E2E',
          lastName: 'Test',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should reject invalid email (400)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: TEST_CREDENTIALS.VALID_PASSWORD,
          firstName: 'Test',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_EMAIL');
    });

    it('should reject weak password (400)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: generateUniqueEmail(),
          password: 'weak',
          firstName: 'Test',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('WEAK_PASSWORD');
    });

    it('should reject duplicate email (409)', async () => {
      const email = generateUniqueEmail();
      const userData = {
        email,
        password: TEST_CREDENTIALS.VALID_PASSWORD,
        firstName: 'Test',
      };

      // First registration
      await request(app).post('/api/auth/register').send(userData);

      // Second registration - should fail
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_EXISTS');
    });
  });

  // ============================================
  // LOGIN E2E TESTS
  // ============================================

  describe('POST /api/auth/login', () => {
    it('should login successfully (200)', async () => {
      // Create user first
      const user = await seedUser({
        email: generateUniqueEmail(),
        password: TEST_CREDENTIALS.VALID_PASSWORD,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: TEST_CREDENTIALS.VALID_PASSWORD,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.tokens).toBeDefined();
    });

    it('should reject invalid credentials (401)', async () => {
      const email = generateUniqueEmail();
      await seedUser({ email, password: TEST_CREDENTIALS.VALID_PASSWORD });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email,
          password: 'wrong-password',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject missing credentials (400)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          // Missing password
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // REFRESH TOKEN E2E TESTS
  // ============================================

  describe('POST /api/auth/refresh', () => {
    it('should refresh token successfully (200)', async () => {
      // Create user and login
      const user = await seedUser({
        email: generateUniqueEmail(),
        password: TEST_CREDENTIALS.VALID_PASSWORD,
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: TEST_CREDENTIALS.VALID_PASSWORD,
        });

      const refreshToken = loginResponse.body.data.tokens.refreshToken;

      // Refresh token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.data.tokens).toBeDefined();
      expect(refreshResponse.body.data.tokens.accessToken).toBeDefined();
    });

    it('should reject invalid token (401)', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TOKEN_INVALID');
    });

    it('should reject missing token (400)', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // LOGOUT E2E TESTS
  // ============================================

  describe('POST /api/auth/logout', () => {
    it('should logout successfully (200)', async () => {
      // Create user and login
      const user = await seedUser({
        email: generateUniqueEmail(),
        password: TEST_CREDENTIALS.VALID_PASSWORD,
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: TEST_CREDENTIALS.VALID_PASSWORD,
        });

      const accessToken = loginResponse.body.data.tokens.accessToken;

      // Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.success).toBe(true);
    });

    it('should reject logout without token (401)', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // PROFILE E2E TESTS
  // ============================================

  describe('GET /api/auth/profile', () => {
    it('should get profile successfully (200)', async () => {
      // Create user and login
      const user = await seedUser({
        email: generateUniqueEmail(),
        password: TEST_CREDENTIALS.VALID_PASSWORD,
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: TEST_CREDENTIALS.VALID_PASSWORD,
        });

      const accessToken = loginResponse.body.data.tokens.accessToken;

      // Get profile
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.user).toBeDefined();
    });

    it('should reject profile access without token (401)', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // CHANGE PASSWORD E2E TESTS
  // ============================================

  describe('POST /api/auth/change-password', () => {
    it('should change password successfully (200)', async () => {
      // Create user and login
      const user = await seedUser({
        email: generateUniqueEmail(),
        password: TEST_CREDENTIALS.VALID_PASSWORD,
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: TEST_CREDENTIALS.VALID_PASSWORD,
        });

      const accessToken = loginResponse.body.data.tokens.accessToken;

      // Change password
      const changePasswordResponse = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: TEST_CREDENTIALS.VALID_PASSWORD,
          newPassword: 'NewStr0ngP@ss!',
        });

      expect(changePasswordResponse.status).toBe(200);
      expect(changePasswordResponse.body.success).toBe(true);
    });

    it('should reject change password with wrong current password (401)', async () => {
      const user = await seedUser({
        email: generateUniqueEmail(),
        password: TEST_CREDENTIALS.VALID_PASSWORD,
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: TEST_CREDENTIALS.VALID_PASSWORD,
        });

      const accessToken = loginResponse.body.data.tokens.accessToken;

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'wrong-password',
          newPassword: 'NewStr0ngP@ss!',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject change password with weak new password (400)', async () => {
      const user = await seedUser({
        email: generateUniqueEmail(),
        password: TEST_CREDENTIALS.VALID_PASSWORD,
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: TEST_CREDENTIALS.VALID_PASSWORD,
        });

      const accessToken = loginResponse.body.data.tokens.accessToken;

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: TEST_CREDENTIALS.VALID_PASSWORD,
          newPassword: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // RATE LIMITING E2E TESTS
  // ============================================

  describe('Rate Limiting', () => {
    it('should rate limit login attempts (429)', async () => {
      const email = generateUniqueEmail();
      await seedUser({ email, password: TEST_CREDENTIALS.VALID_PASSWORD });

      // Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email,
            password: 'wrong-password',
          });
      }

      // 6th attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email,
          password: 'wrong-password',
        });

      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_RATE_LIMIT_EXCEEDED');
    });
  });

  // ============================================
  // SECURITY HEADERS E2E TESTS
  // ============================================

  describe('Security Headers', () => {
    it('should include security headers in response', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: generateUniqueEmail(),
          password: TEST_CREDENTIALS.VALID_PASSWORD,
          firstName: 'Test',
        });

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });
  });
});
