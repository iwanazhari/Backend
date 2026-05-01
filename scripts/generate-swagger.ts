/**
 * Swagger Auto-Generator
 * Automatically generates OpenAPI documentation from routes
 * Updates on every code change
 *
 * Usage:
 *   npm run swagger:generate    # Generate once
 *   npm run swagger:watch       # Auto-generate on changes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerJsdoc from 'swagger-jsdoc';
import YAML from 'yamljs';

import config from '../src/config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Swagger configuration
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: `${config.app.name} API`,
      version: '3.0.0',
      description: `
Auto-generated API documentation.

## Features
- 🚀 Real-time updates when code changes
- 📝 JSDoc comments in routes
- 🔐 JWT Authentication support
- 📡 WebSocket endpoints

## Authentication
Include JWT token in header:
\`\`\`
Authorization: Bearer <your-token>
\`\`\`

## Base URL
\`\`\`
Development: http://localhost:${config.app.port}/api
Production: ${config.app.url}/api
\`\`\`
      `,
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `/api`,
        description: 'Current environment',
      },
      {
        url: 'http://localhost:3000/api',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      schemas: {
        // Common schemas
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  example: 'BadRequestError',
                },
                message: {
                  type: 'string',
                  example: 'Email is required',
                },
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR',
                },
                at: {
                  type: 'object',
                  properties: {
                    method: { type: 'string', example: 'POST' },
                    path: { type: 'string', example: '/api/auth/register' },
                    file: { type: 'string', example: 'src/middlewares/validator.js' },
                    line: { type: 'integer', example: 15 },
                  },
                },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 100 },
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 10 },
            totalPages: { type: 'integer', example: 10 },
            hasNext: { type: 'boolean', example: true },
            hasPrev: { type: 'boolean', example: false },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['USER', 'ADMIN', 'MODERATOR'] },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number', format: 'decimal' },
            stock: { type: 'integer' },
            status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Unauthorized access',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        BadRequestError: {
          description: 'Bad request',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Users', description: 'User management endpoints' },
      { name: 'Products', description: 'Product management endpoints' },
      { name: 'WebSocket', description: 'WebSocket/Socket.IO endpoints' },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/routes/*.js',
    './src/controllers/*.ts',
    './src/controllers/*.js',
    './docs/swagger-custom.yaml',
  ],
};

// Generate swagger spec
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Save as JSON
const swaggerPath = path.join(__dirname, '..', 'src', 'docs', 'swagger.json');
const swaggerYamlPath = path.join(__dirname, '..', 'src', 'docs', 'swagger.yaml');

// Ensure docs directory exists
const docsDir = path.dirname(swaggerPath);
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

// Write JSON
fs.writeFileSync(swaggerPath, JSON.stringify(swaggerSpec, null, 2));

// Write YAML
const yamlContent = YAML.stringify(swaggerSpec, 10);
fs.writeFileSync(swaggerYamlPath, yamlContent);

console.log('✅ Swagger documentation generated successfully!');
console.log(`   JSON: ${swaggerPath}`);
console.log(`   YAML: ${swaggerYamlPath}`);
console.log(`   View at: http://localhost:${config.app.port}/api/docs`);

export default swaggerSpec;
