#!/usr/bin/env node

/**
 * Generate Service Only
 * Usage: npm run generate:service -- ModuleName
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
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

const moduleName = process.argv[2];

if (!moduleName) {
  console.log(`${colors.green}Usage:${colors.reset} npm run generate:service -- ModuleName`);
  process.exit(1);
}

const pascalName = toPascalCase(moduleName);
const camelName = toCamelCase(moduleName);

const content = `/**
 * ${pascalName} Service
 * Implements: Service Layer Pattern
 * Contains all business logic for ${pascalName}
 */

const { ConflictError, NotFoundError } = require('../errors');
const ${pascalName}Repository = require('../repositories/${pascalName}Repository');
const BaseService = require('./BaseService');

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
module.exports = new ${pascalName}Service();
`;

const filePath = path.join(__dirname, '..', 'src', 'services', `${pascalName}Service.js`);

if (fs.existsSync(filePath) && !process.argv.includes('--force')) {
  console.log(`${colors.yellow}⚠️  Service already exists. Use --force to overwrite.${colors.reset}`);
  process.exit(1);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log(`${colors.green}✓${colors.reset} Created service: ${filePath}`);
