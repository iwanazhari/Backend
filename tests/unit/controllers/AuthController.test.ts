/**
 * Auth Controller Tests
 */

import request from 'supertest';
import { createApp } from '../../src/config/app.js';
import { sequelize } from '../../src/models/index.js';
import User from '../../src/models/User.js';

let app: any;

describe('Auth Controller', () => {
  beforeAll(async () => {
    app = createApp();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });

  describe('POST /api/auth/register', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'User',
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.user.email).toBe(validUserData.email);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should fail with invalid email', async () => {
      const invalidData = { ...validUserData, email: 'invalid-email' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with weak password', async () => {
      const invalidData = { ...validUserData, password: 'weak' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with duplicate email', async () => {
      await User.create(validUserData);

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(409);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'User',
    };

    beforeEach(async () => {
      await User.create(validUserData);
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUserData.email,
          password: validUserData.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
    });

    it('should fail with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: validUserData.password,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUserData.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
