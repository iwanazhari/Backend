#!/usr/bin/env node

/**
 * Generate Controller Only
 * Usage: npm run generate:controller -- ModuleName
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function toPascalCase(str) {
  return str
    .replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace('-', '').replace('_', ''))
    .replace(/^./, (char) => char.toUpperCase());
}

function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toSnakeCase(str) {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

const moduleName = process.argv[2];

if (!moduleName) {
  console.log(`${colors.blue}Usage:${colors.reset} npm run generate:controller -- ModuleName`);
  process.exit(1);
}

const pascalName = toPascalCase(moduleName);
const camelName = toCamelCase(moduleName);
const snakeName = toSnakeCase(pascalName);

const content = `/**
 * ${pascalName} Controller
 * Handles HTTP requests for ${pascalName}
 */

const { body, param, query } = require('express-validator');
const BaseController = require('./BaseController');
const ${pascalName}Service = require('../services/${pascalName}Service');
const { handleValidationErrors } = require('../middlewares/validator');
const { authenticate, authorize } = require('../middlewares/authenticate');

/**
 * ${pascalName} Controller
 */
class ${pascalName}Controller extends BaseController {
  constructor() {
    super(${pascalName}Service, '${pascalName}');
  }

  /**
   * Get all ${snakeName}s
   * GET /api/${snakeName}s
   */
  getAll = this.handle(async (req, res) => {
    this.logRequest(req, 'Get All ${pascalName}s');

    const options = this.extractQueryParams(req);
    const result = await this.service.getAll(options);

    this.sendPaginated(res, result);
  });

  /**
   * Get ${snakeName} by ID
   * GET /api/${snakeName}s/:id
   */
  getById = this.handle(async (req, res) => {
    this.logRequest(req, 'Get ${pascalName} By ID');

    const { id } = req.params;
    const result = await this.service.getById(id);

    this.sendSuccess(res, result);
  });

  /**
   * Create new ${snakeName}
   * POST /api/${snakeName}s
   */
  create = this.handle(async (req, res) => {
    this.logRequest(req, 'Create ${pascalName}');

    const result = await this.service.create(req.body);

    this.sendCreated(res, result, \`/api/${snakeName}s/\${result.id}\`);
  });

  /**
   * Update ${snakeName}
   * PUT /api/${snakeName}s/:id
   */
  update = this.handle(async (req, res) => {
    this.logRequest(req, 'Update ${pascalName}');

    const { id } = req.params;
    const result = await this.service.update(id, req.body);

    this.sendSuccess(res, result);
  });

  /**
   * Delete ${snakeName}
   * DELETE /api/${snakeName}s/:id
   */
  delete = this.handle(async (req, res) => {
    this.logRequest(req, 'Delete ${pascalName}');

    const { id } = req.params;
    await this.service.delete(id);

    this.sendSuccess(res, { message: '${pascalName} deleted successfully' });
  });

  /**
   * Validation rules for ${snakeName}
   */
  static validation = [
    // TODO: Add validation rules
    // body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 255 }),
    handleValidationErrors,
  ];

  /**
   * Validation rules for ID param
   */
  static idParam = [
    param('id').notEmpty().withMessage('ID is required').isUUID().withMessage('Invalid UUID format'),
    handleValidationErrors,
  ];
}

// Export singleton instance
module.exports = new ${pascalName}Controller();
`;

const filePath = path.join(__dirname, '..', 'src', 'controllers', `${pascalName}Controller.js`);

if (fs.existsSync(filePath) && !process.argv.includes('--force')) {
  console.log(`${colors.yellow}⚠️  Controller already exists. Use --force to overwrite.${colors.reset}`);
  process.exit(1);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log(`${colors.green}✓${colors.reset} Created controller: ${filePath}`);
