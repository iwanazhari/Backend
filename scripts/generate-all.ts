#!/usr/bin/env node

/**
 * Code Generator CLI (ES Module version)
 * Generates boilerplate code following clean architecture principles
 * With ES Module import/export templates
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const SRC_DIR = path.join(__dirname, '..', 'src');
const TESTS_DIR = path.join(__dirname, '..', 'tests');

interface ModuleNames {
  pascalName: string;
  camelName: string;
  snakeName: string;
  kebabName: string;
}

interface GeneratorOptions {
  force?: boolean;
}

function toPascalCase(str: string): string {
  return str
    .replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace('-', '').replace('_', ''))
    .replace(/^./, (char) => char.toUpperCase());
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

function toKebabCase(str: string): string {
  return toSnakeCase(toPascalCase(str)).replace(/_/g, '-');
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeFile(filePath: string, content: string): string {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Generate Repository file (ES Module)
 */
function generateRepository(moduleName: ModuleNames, options: GeneratorOptions): string | null {
  const { pascalName, camelName, snakeName } = moduleName;

  const content = `/**
 * ${pascalName} Repository (Prisma + ES Module)
 * Implements: Repository Pattern with Prisma ORM
 * Follows: Single Responsibility, Data Abstraction
 */

import BaseRepository from './BaseRepository.js';
import { getPrismaClient } from '../config/prisma.js';

/**
 * ${pascalName} Repository
 */
class ${pascalName}Repository extends BaseRepository {
  constructor() {
    super('${pascalName}');
    this.prisma = getPrismaClient();
  }

  // TODO: Add custom queries here
  // Example:
  // async findByName(name) {
  //   return this.prisma.${snakeName}.findFirst({ where: { name } });
  // }
}

// Export singleton instance
export default new ${pascalName}Repository();
`;

  const filePath = path.join(SRC_DIR, 'repositories', `${pascalName}Repository.ts`);

  if (fileExists(filePath) && !options.force) {
    console.log(`${colors.yellow}⚠️  Repository ${pascalName} already exists. Use --force to overwrite.${colors.reset}`);
    return null;
  }

  writeFile(filePath, content);
  console.log(`${colors.green}✓${colors.reset} Created repository: ${filePath}`);
  return filePath;
}

/**
 * Generate Service file (ES Module)
 */
function generateService(moduleName: ModuleNames, options: GeneratorOptions): string | null {
  const { pascalName, camelName, snakeName } = moduleName;

  const content = `/**
 * ${pascalName} Service (ES Module)
 * Implements: Service Layer Pattern
 * Contains all business logic for ${pascalName}
 */

import { ConflictError, NotFoundError } from '../errors/index.js';
import ${pascalName}Repository from '../repositories/${pascalName}Repository.js';
import BaseService from '../services/BaseService.js';
import { getPrismaClient } from '../config/prisma.js';

/**
 * ${pascalName} Service
 */
class ${pascalName}Service extends BaseService {
  constructor() {
    super(${pascalName}Repository);
    this.prisma = getPrismaClient();
  }

  // TODO: Add business logic here
  // Example:
  // async create${pascalName}(data) {
  //   const existing = await this.repository.findByName(data.name);
  //   if (existing) {
  //     throw new ConflictError('${pascalName} already exists', 'DUPLICATE_${snakeName.toUpperCase()}');
  //   }
  //   return this.prisma.${snakeName}.create({ data });
  // }
}

// Export singleton instance
export default new ${pascalName}Service();
`;

  const filePath = path.join(SRC_DIR, 'services', `${pascalName}Service.ts`);

  if (fileExists(filePath) && !options.force) {
    console.log(`${colors.yellow}⚠️  Service ${pascalName} already exists. Use --force to overwrite.${colors.reset}`);
    return null;
  }

  writeFile(filePath, content);
  console.log(`${colors.green}✓${colors.reset} Created service: ${filePath}`);
  return filePath;
}

/**
 * Generate Controller file (ES Module)
 */
function generateController(moduleName: ModuleNames, options: GeneratorOptions): string | null {
  const { pascalName, camelName, snakeName } = moduleName;

  const content = `/**
 * ${pascalName} Controller (ES Module)
 * Handles HTTP requests for ${pascalName}
 */

import { body, param } from 'express-validator';
import BaseController from '../controllers/BaseController.js';
import ${pascalName}Service from '../services/${pascalName}Service.js';
import { handleValidationErrors } from '../middlewares/validator.js';
import { authenticate } from '../middlewares/authenticate.js';

/**
 * ${pascalName} Controller
 */
class ${pascalName}Controller extends BaseController {
  constructor() {
    super(${pascalName}Service, '${pascalName}');
  }

  /**
   * Get all ${snakeName}s
   */
  getAll = this.handle(async (req, res) => {
    const options = this.extractQueryParams(req);
    const result = await this.service.getAll(options);
    this.sendPaginated(res, result);
  });

  /**
   * Get ${snakeName} by ID
   */
  getById = this.handle(async (req, res) => {
    const { id } = req.params;
    const result = await this.service.getById(id);
    this.sendSuccess(res, result);
  });

  /**
   * Create new ${snakeName}
   */
  create = this.handle(async (req, res) => {
    const result = await this.service.create(req.body);
    this.sendCreated(res, result, \`/api/${snakeName}s/\${result.id}\`);
  });

  /**
   * Update ${snakeName}
   */
  update = this.handle(async (req, res) => {
    const { id } = req.params;
    const result = await this.service.update(id, req.body);
    this.sendSuccess(res, result);
  });

  /**
   * Delete ${snakeName}
   */
  delete = this.handle(async (req, res) => {
    const { id } = req.params;
    await this.service.delete(id);
    this.sendSuccess(res, { message: '${pascalName} deleted successfully' });
  });

  /**
   * Validation rules
   */
  static validation = [
    // TODO: Add validation rules
    // body('name').trim().notEmpty().withMessage('Name is required'),
    handleValidationErrors,
  ];

  /**
   * ID param validation
   */
  static idParam = [
    param('id').notEmpty().withMessage('ID is required').isUUID().withMessage('Invalid UUID format'),
    handleValidationErrors,
  ];
}

// Export singleton instance
export default new ${pascalName}Controller();
`;

  const filePath = path.join(SRC_DIR, 'controllers', `${pascalName}Controller.ts`);

  if (fileExists(filePath) && !options.force) {
    console.log(`${colors.yellow}⚠️  Controller ${pascalName} already exists. Use --force to overwrite.${colors.reset}`);
    return null;
  }

  writeFile(filePath, content);
  console.log(`${colors.green}✓${colors.reset} Created controller: ${filePath}`);
  return filePath;
}

/**
 * Generate Routes file (ES Module + Swagger)
 */
function generateRoutes(moduleName: ModuleNames, options: GeneratorOptions): string | null {
  const { pascalName, camelName, snakeName, kebabName } = moduleName;

  const content = `/**
 * ${pascalName} Routes (ES Module + Swagger)
 */

import express from 'express';
import ${pascalName}Controller from '../controllers/${pascalName}Controller.js';
import { authenticate } from '../middlewares/authenticate.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/${kebabName}s:
 *   get:
 *     summary: Get all ${snakeName}s
 *     tags: [${pascalName}s]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of ${snakeName}s
 */
router.get('/', ${pascalName}Controller.getAll);

/**
 * @swagger
 * /api/${kebabName}s/{id}:
 *   get:
 *     summary: Get ${snakeName} by ID
 *     tags: [${pascalName}s]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: ${pascalName} details
 */
router.get('/:id', ${pascalName}Controller.idParam, ${pascalName}Controller.getById);

/**
 * @swagger
 * /api/${kebabName}s:
 *   post:
 *     summary: Create new ${snakeName}
 *     tags: [${pascalName}s]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: ${pascalName} created
 */
router.post('/', ${pascalName}Controller.validation, ${pascalName}Controller.create);

/**
 * @swagger
 * /api/${kebabName}s/{id}:
 *   put:
 *     summary: Update ${snakeName}
 *     tags: [${pascalName}s]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ${pascalName} updated
 */
router.put('/:id', ${pascalName}Controller.idParam, ${pascalName}Controller.validation, ${pascalName}Controller.update);

/**
 * @swagger
 * /api/${kebabName}s/{id}:
 *   delete:
 *     summary: Delete ${snakeName}
 *     tags: [${pascalName}s]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ${pascalName} deleted
 */
router.delete('/:id', ${pascalName}Controller.idParam, ${pascalName}Controller.delete);

export default router;
`;

  const filePath = path.join(SRC_DIR, 'routes', `${snakeName}.routes.ts`);

  if (fileExists(filePath) && !options.force) {
    console.log(`${colors.yellow}⚠️  Routes ${pascalName} already exists. Use --force to overwrite.${colors.reset}`);
    return null;
  }

  writeFile(filePath, content);
  console.log(`${colors.green}✓${colors.reset} Created routes: ${filePath}`);
  return filePath;
}

/**
 * Update routes index
 */
function updateRoutesIndex(snakeName: string): void {
  const routesIndexPath = path.join(SRC_DIR, 'routes', 'index.ts');

  let content = fs.readFileSync(routesIndexPath, 'utf8');

  if (content.includes(`${snakeName}Routes`)) {
    console.log(`${colors.yellow}⚠️  Routes already registered in index.${colors.reset}`);
    return;
  }

  const importLine = `import ${snakeName}Routes from './${snakeName}.routes.js';`;
  content = content.replace(
    '// TODO: Mount your custom routes here',
    `// TODO: Mount your custom routes here\n${importLine}`
  );

  const mountLine = `app.use('/api/${snakeName}s', ${snakeName}Routes);`;
  content = content.replace(
    '// Mount your custom routes here',
    `// Mount your custom routes here\n  ${mountLine}`
  );

  fs.writeFileSync(routesIndexPath, content);
  console.log(`${colors.green}✓${colors.reset} Updated routes index`);
}

/**
 * Main generation function
 */
async function generateAll(moduleName: string, options: GeneratorOptions = {}): Promise<void> {
  console.log(`${colors.bright}${colors.blue}════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}  Generating ${moduleName} module (ESM + Prisma)${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}════════════════════════════════════════${colors.reset}\n`);

  const names: ModuleNames = {
    pascalName: toPascalCase(moduleName),
    camelName: toCamelCase(moduleName),
    snakeName: toSnakeCase(toPascalCase(moduleName)),
    kebabName: toKebabCase(toPascalCase(moduleName)),
  };

  console.log(`${colors.cyan}Module names:${colors.reset}`);
  console.log(`  PascalCase: ${names.pascalName}`);
  console.log(`  camelCase:  ${names.camelName}`);
  console.log(`  snake_case: ${names.snakeName}`);
  console.log(`  kebab-case: ${names.kebabName}\n`);

  ensureDir(path.join(SRC_DIR, 'routes'));
  ensureDir(path.join(TESTS_DIR, 'unit', 'controllers'));

  console.log(`${colors.yellow}ℹ${colors.reset} Note: Create Prisma model first:`);
  console.log(`     ${colors.blue}npm run generate:prisma-model -- ${moduleName} field:type${colors.reset}\n`);

  generateRepository(names, options);
  generateService(names, options);
  generateController(names, options);
  generateRoutes(names, options);
  updateRoutesIndex(names.snakeName);

  console.log(`\n${colors.green}════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}  Generation complete!${colors.reset}`);
  console.log(`${colors.green}════════════════════════════════════════${colors.reset}\n`);

  console.log(`${colors.yellow}Next steps:${colors.reset}`);
  console.log(`  1. Create Prisma model:`);
  console.log(`     ${colors.blue}npm run generate:prisma-model -- ${moduleName} field:type${colors.reset}`);
  console.log(`  2. Generate Prisma Client:`);
  console.log(`     ${colors.blue}npm run prisma:generate${colors.reset}`);
  console.log(`  3. Run migration:`);
  console.log(`     ${colors.blue}npm run prisma:migrate${colors.reset}`);
  console.log(`  4. Edit repository, service, controller`);
  console.log(`  5. Run linter:`);
  console.log(`     ${colors.blue}npm run lint:fix${colors.reset}\n`);
}

/**
 * CLI entry point
 */
function main(args: string[]): void {
  const options = {
    force: args.includes('--force') || args.includes('-f'),
  };

  const moduleName = args.find((arg) => !arg.startsWith('-'));

  if (!moduleName) {
    console.log(`${colors.bright}${colors.blue}════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}  Backend Code Generator (ESM + Prisma)${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}════════════════════════════════════════${colors.reset}\n`);

    console.log(`${colors.yellow}Usage:${colors.reset}`);
    console.log(`  npm run generate:module -- <moduleName> [options]\n`);

    console.log(`${colors.yellow}Options:${colors.reset}`);
    console.log(`  -f, --force    Overwrite existing files\n`);

    console.log(`${colors.yellow}Examples:${colors.reset}`);
    console.log(`  npm run generate:module -- product`);
    console.log(`  npm run generate:module -- blog-post --force\n`);

    console.log(`${colors.yellow}Generates (ES Module format):${colors.reset}`);
    console.log(`  - Repository (src/repositories/)`);
    console.log(`  - Service (src/services/)`);
    console.log(`  - Controller (src/controllers/)`);
    console.log(`  - Routes (src/routes/)`);
    console.log(`  - Updates routes/index.js\n`);

    return;
  }

  try {
    generateAll(moduleName, options);
  } catch (error) {
    console.error(`${colors.red}✗ Error: ${(error as Error).message}${colors.reset}`);
    process.exit(1);
  }
}

export { generateAll, main };

// Run if called directly
if (process.argv[1] && process.argv[1].includes('generate-all')) {
  main(process.argv.slice(2));
}
