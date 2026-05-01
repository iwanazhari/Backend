/**
 * Order Controller Tests
 */

import request from 'supertest';
import { createApp } from '../../src/config/app.js';
import { sequelize } from '../../src/models/index.js';

let app: any;
let authToken: string;

describe('Order Controller', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    app = createApp();

    // TODO: Setup test authentication token
    // const authResponse = await request(app).post('/api/auth/login').send({
    //   email: 'test@example.com',
    //   password: 'Test123!',
    // });
    // authToken = authResponse.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /api/orders', () => {
    it('should return paginated orders', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta.pagination).toBeDefined();
    });
  });

  describe('POST /api/orders', () => {
    it('should create a new order', async () => {
      const orderData = {
        // TODO: Add test data
        name: 'Test Order',
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should return a order by ID', async () => {
      // TODO: Create test order first
      const testId = 'uuid-here';

      const response = await request(app)
        .get(`/api/orders/${testId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testId);
    });
  });

  describe('PUT /api/orders/:id', () => {
    it('should update a order', async () => {
      const testId = 'uuid-here';
      const updateData = {
        // TODO: Add update data
        name: 'Updated Order',
      };

      const response = await request(app)
        .put(`/api/orders/${testId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/orders/:id', () => {
    it('should delete a order', async () => {
      const testId = 'uuid-here';

      const response = await request(app)
        .delete(`/api/orders/${testId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
