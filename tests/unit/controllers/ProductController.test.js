/**
 * Product Controller Tests
 */

const request = require('supertest');
const { createApp } = require('../../src/config/app');
const { sequelize } = require('../../src/models');

let app;
let authToken;

describe('Product Controller', () => {
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

  describe('GET /api/products', () => {
    it('should return paginated products', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta.pagination).toBeDefined();
    });
  });

  describe('POST /api/products', () => {
    it('should create a new product', async () => {
      const productData = {
        // TODO: Add test data
        name: 'Test Product',
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/products/:id', () => {
    it('should return a product by ID', async () => {
      // TODO: Create test product first
      const testId = 'uuid-here';

      const response = await request(app)
        .get(`/api/products/${testId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testId);
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update a product', async () => {
      const testId = 'uuid-here';
      const updateData = {
        // TODO: Add update data
        name: 'Updated Product',
      };

      const response = await request(app)
        .put(`/api/products/${testId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete a product', async () => {
      const testId = 'uuid-here';

      const response = await request(app)
        .delete(`/api/products/${testId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
