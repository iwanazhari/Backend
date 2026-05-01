#!/usr/bin/env node

/**
 * Generate Service Only
 * Usage: npm run generate:service -- ModuleName
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
};

function toPascalCase(str: string): string {
  return str
    .replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace('-', '').replace('_', ''))
    .replace(/^./, (char) => char.toUpperCase());
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

const moduleName = process.argv[2];

if (!moduleName) {
  console.log(`${colors.green}Usage:${colors.reset} npm run generate:service -- ModuleName`);
  process.exit(1);
}

const pascalName = toPascalCase(moduleName);
const camelName = toCamelCase(moduleName);

const content = `/**
 * ${pascalName} Service (ES Module)
 * Implements: Service Layer Pattern
 * Contains all business logic for ${pascalName}
 */

import { ConflictError, NotFoundError } from '../errors/index.js';
import ${pascalName}Repository from '../repositories/${pascalName}Repository.js';
import BaseService from './BaseService.js';

/**
 * ${pascalName} Service
 */
class ${pascalName}Service extends BaseService {
  constructor() {
    super(${pascalName}Repository);
  }

  // TODO: Add business logic here
  // Example:
  // async create${pascalName}(data) {
  //   // Check for duplicates
  //   const existing = await this.repository.findByName(data.name);
  //   if (existing) {
  //     throw new ConflictError('${pascalName} already exists', 'DUPLICATE_ENTRY');
  //   }
  //   return this.repository.create(data);
  // }
}

// Export singleton instance
export default new ${pascalName}Service();
`;

const filePath = path.join(__dirname, '..', 'src', 'services', `${pascalName}Service.ts`);

if (fs.existsSync(filePath) && !process.argv.includes('--force')) {
  console.log(`${colors.yellow}⚠️  Service already exists. Use --force to overwrite.${colors.reset}`);
  process.exit(1);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log(`${colors.green}✓${colors.reset} Created service: ${filePath}`);
