#!/usr/bin/env node

/**
 * Generate Model Only
 * Usage: npm run generate:model -- ModuleName
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

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

const moduleName = process.argv[2];

if (!moduleName) {
  console.log(`${colors.green}Usage:${colors.reset} npm run generate:model -- ModuleName`);
  process.exit(1);
}

const pascalName = toPascalCase(moduleName);
const snakeName = toSnakeCase(pascalName);

const content = `/**
 * ${pascalName} Model
 * Follows: Data modeling best practices from DDIA
 */

import { DataTypes } from 'sequelize';
import { sequelize } from './index.js';

const ${pascalName} = sequelize.define(
  '${pascalName}',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // TODO: Add your fields here
    // name: {
    //   type: DataTypes.STRING,
    //   allowNull: false,
    //   validate: {
    //     len: { max: 255 },
    //   },
    // },
  },
  {
    tableName: '${snakeName}s',
    indexes: [
      // TODO: Add indexes for query performance
      // {
      //   fields: ['name'],
      // },
    ],
  }
);

// TODO: Define associations here
// ${pascalName}.associate = (models) => {
//   ${pascalName}.belongsTo(models.User, { as: 'user', foreignKey: 'userId' });
// };

export default ${pascalName};
`;

const filePath = path.join(__dirname, '..', 'src', 'models', `${pascalName}.ts`);

if (fs.existsSync(filePath) && !process.argv.includes('--force')) {
  console.log(`${colors.yellow}⚠️  Model already exists. Use --force to overwrite.${colors.reset}`);
  process.exit(1);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log(`${colors.green}✓${colors.reset} Created model: ${filePath}`);
