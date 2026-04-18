#!/usr/bin/env node

/**
 * Generate Repository Only
 * Usage: npm run generate:repository -- ModuleName
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
  console.log(`${colors.green}Usage:${colors.reset} npm run generate:repository -- ModuleName`);
  process.exit(1);
}

const pascalName = toPascalCase(moduleName);
const camelName = toCamelCase(moduleName);

const content = `/**
 * ${pascalName} Repository
 * Implements: Repository Pattern
 */

const BaseRepository = require('./BaseRepository');
const ${pascalName} = require('../models/${pascalName}');

/**
 * ${pascalName} Repository
 */
class ${pascalName}Repository extends BaseRepository {
  constructor() {
    super(${pascalName});
  }

  // TODO: Add custom queries here
  // Example:
  // async findByName(name) {
  //   return this.findOne({ name });
  // }
}

// Export singleton instance
module.exports = new ${pascalName}Repository();
`;

const filePath = path.join(__dirname, '..', 'src', 'repositories', `${pascalName}Repository.js`);

if (fs.existsSync(filePath) && !process.argv.includes('--force')) {
  console.log(`${colors.yellow}⚠️  Repository already exists. Use --force to overwrite.${colors.reset}`);
  process.exit(1);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log(`${colors.green}✓${colors.reset} Created repository: ${filePath}`);
