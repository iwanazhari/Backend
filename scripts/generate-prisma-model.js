#!/usr/bin/env node

/**
 * Generate Prisma Model
 * Adds a new model to the Prisma schema with proper conventions
 * Usage: npm run generate:prisma-model -- ModelName field1:type field2:type
 * 
 * Team Rules:
 * - Selalu run 'npm run prisma:generate' setelah generate model
 * - Selalu run 'npm run prisma:migrate' untuk apply ke database
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function toPascalCase(str) {
  return str
    .replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace('-', '').replace('_', ''))
    .replace(/^./, (char) => char.toUpperCase());
}

function toSnakeCase(str) {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

// Parse arguments
const args = process.argv.slice(2);
const modelName = args[0];
const fields = args.slice(1);

if (!modelName) {
  console.log(`${colors.blue}════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  Prisma Model Generator${colors.reset}`);
  console.log(`${colors.blue}════════════════════════════════════════${colors.reset}\n`);
  
  console.log(`${colors.yellow}Usage:${colors.reset}`);
  console.log(`  npm run generate:prisma-model -- ModelName field1:type field2:type\n`);
  
  console.log(`${colors.yellow}Examples:${colors.reset}`);
  console.log(`  npm run generate:prisma-model -- Product name:string price:decimal:10,2 stock:int:0`);
  console.log(`  npm run generate:prisma-model -- BlogPost title:string content:text published:boolean:false\n`);
  
  console.log(`${colors.yellow}Field Types:${colors.reset}`);
  console.log(`  String, Int, Float, Decimal, Boolean, DateTime, Json, Bytes`);
  console.log(`  Format: fieldName:type:default:dbType\n`);
  
  console.log(`${colors.yellow}After generating:${colors.reset}`);
  console.log(`  1. Run: npm run prisma:generate`);
  console.log(`  2. Run: npm run prisma:migrate`);
  console.log(`  3. Run: npm run generate:all -- ${toSnakeCase(modelName)}\n`);
  
  process.exit(0);
}

const pascalName = toPascalCase(modelName);
const snakeName = toSnakeCase(pascalName);
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

// Read existing schema
let schema = fs.readFileSync(schemaPath, 'utf8');

// Generate model template
let modelTemplate = `\n/// ${pascalName} model\n`;
modelTemplate += `model ${pascalName} {\n`;
modelTemplate += `  id          String   @id @default(uuid()) @db.Uuid\n`;

// Parse fields
const standardFields = [
  { name: 'createdAt', type: 'DateTime', decorator: '@default(now()) @map("created_at")' },
  { name: 'updatedAt', type: 'DateTime', decorator: '@updatedAt @map("updated_at")' },
  { name: 'deletedAt', type: 'DateTime?', decorator: '@map("deleted_at")' },
];

// Add custom fields
if (fields.length > 0) {
  fields.forEach((field) => {
    const parts = field.split(':');
    const fieldName = parts[0];
    const fieldType = parts[1] || 'String';
    const defaultValue = parts[2];
    const dbType = parts[3];
    
    // Convert JS types to Prisma types
    let prismaType = fieldType;
    if (fieldType === 'string') prismaType = 'String';
    if (fieldType === 'int') prismaType = 'Int';
    if (fieldType === 'float') prismaType = 'Float';
    if (fieldType === 'decimal') prismaType = 'Decimal';
    if (fieldType === 'boolean') prismaType = 'Boolean';
    if (fieldType === 'datetime') prismaType = 'DateTime';
    if (fieldType === 'json') prismaType = 'Json';
    if (fieldType === 'text') prismaType = 'String';
    
    // Build field definition
    let fieldDef = `  ${fieldName.padEnd(15)} ${prismaType}`;
    
    // Add database type for Decimal
    if (prismaType === 'Decimal' && dbType) {
      fieldDef += ` @db.Decimal(${dbType})`;
    }
    
    // Add default value
    if (defaultValue !== undefined && defaultValue !== '') {
      if (typeof defaultValue === 'number' || !isNaN(defaultValue)) {
        fieldDef += ` @default(${defaultValue})`;
      } else if (defaultValue === 'now' || defaultValue === 'true' || defaultValue === 'false') {
        fieldDef += ` @default(${defaultValue})`;
      } else {
        fieldDef += ` @default("${defaultValue}")`;
      }
    }
    
    fieldDef += '\n';
    modelTemplate += fieldDef;
  });
}

// Add standard fields
standardFields.forEach((field) => {
  modelTemplate += `  ${field.name.padEnd(15)} ${field.type.padEnd(10)} ${field.decorator}\n`;
});

// Add indexes
modelTemplate += `  \n`;
modelTemplate += `  // Indexes\n`;
modelTemplate += `  @@index([createdAt])\n`;
modelTemplate += `  @@map("${snakeName}s")\n`;
modelTemplate += `}\n`;

// Find position to insert (before the last closing brace or comment)
const insertPosition = schema.lastIndexOf('// ============================================');
if (insertPosition === -1) {
  console.log(`${colors.red}✗ Error: Could not find insertion point in schema.prisma${colors.reset}`);
  process.exit(1);
}

// Insert model
const newSchema = schema.slice(0, insertPosition) + modelTemplate + '\n' + schema.slice(insertPosition);

// Write updated schema
fs.writeFileSync(schemaPath, newSchema, 'utf8');

console.log(`${colors.green}════════════════════════════════════════${colors.reset}`);
console.log(`${colors.green}  Prisma Model Generated!${colors.reset}`);
console.log(`${colors.green}════════════════════════════════════════${colors.reset}\n`);

console.log(`${colors.green}✓${colors.reset} Added model ${pascalName} to schema.prisma`);
console.log(`${colors.green}✓${colors.reset} Table name: ${snakeName}s\n`);

console.log(`${colors.yellow}Next steps:${colors.reset}`);
console.log(`  1. Review and edit: prisma/schema.prisma`);
console.log(`  2. Generate Prisma Client:`);
console.log(`     ${colors.blue}npm run prisma:generate${colors.reset}`);
console.log(`  3. Create migration:`);
console.log(`     ${colors.blue}npm run prisma:migrate${colors.reset}`);
console.log(`  4. Generate repository, service, controller:`);
console.log(`     ${colors.blue}npm run generate:all -- ${toSnakeCase(modelName)}${colors.reset}\n`);
