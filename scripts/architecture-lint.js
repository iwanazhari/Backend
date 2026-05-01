#!/usr/bin/env node

/**
 * Architecture Linter - Zero Trust for Code Quality
 * 
 * Purpose: Prevent architecture violations BEFORE they reach production
 * Enforces: Separation of concerns, DRY principle, layer boundaries
 * 
 * Usage: node scripts/architecture-lint.js
 */

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SRC_DIR = join(__dirname, '..', 'src');

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

let errors = 0;
let warnings = 0;

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ERROR: ${message}`, 'red');
  errors++;
}

function warn(message) {
  log(`⚠️  WARNING: ${message}`, 'yellow');
  warnings++;
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

// ============================================
// RULE 1: No Duplicate Functions Across Files
// ============================================

function checkDuplicateFunctions() {
  info('Checking for duplicate function definitions...');
  
  const functionDefinitions = new Map();
  const files = getAllTypeScriptFiles(SRC_DIR);
  
  const functionRegex = /^(?:private|public|protected)?\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{/gm;
  
  files.forEach(file => {
    const content = readFileSync(file, 'utf-8');
    const relativePath = file.replace(SRC_DIR + '/', '');
    
    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1];
      
      // Skip common names that are OK to duplicate
      if (['constructor', 'toString', 'valueOf'].includes(functionName)) {
        continue;
      }
      
      // Skip private methods (starting with underscore or #)
      if (functionName.startsWith('_') || functionName.startsWith('#')) {
        continue;
      }
      
      // Only check helper/utility functions
      const helperFunctions = [
        'isValidEmail',
        'isStrongPassword', 
        'isValidUUID',
        'getClientIp',
        'hashPassword',
        'comparePassword',
        'generateToken',
        'verifyToken'
      ];
      
      if (helperFunctions.includes(functionName)) {
        if (!functionDefinitions.has(functionName)) {
          functionDefinitions.set(functionName, []);
        }
        functionDefinitions.get(functionName).push(relativePath);
      }
    }
  });
  
  // Report duplicates
  functionDefinitions.forEach((files, functionName) => {
    if (files.length > 1) {
      error(`Duplicate function "${functionName}" found in:`);
      files.forEach(file => log(`   - ${file}`, 'yellow'));
      log(`   → Move to src/utils/validators.ts or src/utils/helpers.ts`, 'blue');
    }
  });
}

// ============================================
// RULE 2: Controller Should Not Import Prisma
// ============================================

function checkControllerImports() {
  info('Checking controller layer violations...');
  
  const controllerDir = join(SRC_DIR, 'controllers');
  if (!existsSync(controllerDir)) return;
  
  const files = getAllTypeScriptFiles(controllerDir);
  
  files.forEach(file => {
    const content = readFileSync(file, 'utf-8');
    const relativePath = file.replace(SRC_DIR + '/', '');
    
    if (content.includes('@prisma/client')) {
      error(`${relativePath}: Controllers should NOT import Prisma directly`);
      log(`   → Use repositories or services for database operations`, 'blue');
    }
    
    if (content.includes('getPrismaClient')) {
      error(`${relativePath}: Controllers should NOT access Prisma client`);
      log(`   → Delegate database operations to service layer`, 'blue');
    }
  });
}

// ============================================
// RULE 3: Service Should Not Import Express
// ============================================

function checkServiceImports() {
  info('Checking service layer violations...');
  
  const serviceDir = join(SRC_DIR, 'services');
  if (!existsSync(serviceDir)) return;
  
  const files = getAllTypeScriptFiles(serviceDir);
  
  files.forEach(file => {
    const content = readFileSync(file, 'utf-8');
    const relativePath = file.replace(SRC_DIR + '/', '');
    
    if (content.includes('express') && !content.includes('express-validator')) {
      warn(`${relativePath}: Services should NOT import Express types`);
      log(`   → Keep HTTP framework concerns in controllers`, 'blue');
    }
    
    if (content.includes('Request, Response') || content.includes('req: Request')) {
      error(`${relativePath}: Services should NOT handle HTTP objects`);
      log(`   → Pass plain objects/data, not Request/Response`, 'blue');
    }
  });
}

// ============================================
// RULE 4: Repository Should Only Import Prisma
// ============================================

function checkRepositoryImports() {
  info('Checking repository layer violations...');
  
  const repoDir = join(SRC_DIR, 'repositories');
  if (!existsSync(repoDir)) return;
  
  const files = getAllTypeScriptFiles(repoDir);
  
  files.forEach(file => {
    const content = readFileSync(file, 'utf-8');
    const relativePath = file.replace(SRC_DIR + '/', '');
    
    const forbiddenImports = [
      '../services/',
      '../controllers/',
      'express',
      'jsonwebtoken',
      'paseto'
    ];
    
    forbiddenImports.forEach(forbidden => {
      if (content.includes(forbidden)) {
        error(`${relativePath}: Repository importing ${forbidden}`);
        log(`   → Repositories should ONLY import Prisma and errors`, 'blue');
      }
    });
  });
}

// ============================================
// RULE 5: Utils Should Be Pure Functions Only
// ============================================

function checkUtilsPurity() {
  info('Checking utils layer purity...');
  
  const utilsDir = join(SRC_DIR, 'utils');
  if (!existsSync(utilsDir)) return;
  
  const files = getAllTypeScriptFiles(utilsDir);
  
  files.forEach(file => {
    const content = readFileSync(file, 'utf-8');
    const relativePath = file.replace(SRC_DIR + '/', '');
    
    // Check for database operations
    if (content.includes('prisma') || content.includes('Prisma')) {
      error(`${relativePath}: Utils should NOT access database`);
      log(`   → Utils must be pure functions with no side effects`, 'blue');
    }
    
    // Check for file system operations
    if (content.includes('fs.') || content.includes('readFileSync')) {
      error(`${relativePath}: Utils should NOT perform I/O operations`);
      log(`   → Utils should only transform/validate data`, 'blue');
    }
  });
}

// ============================================
// RULE 6: Check for Proper Layer Dependencies
// ============================================

function checkLayerDependencies() {
  info('Checking layer dependency graph...');
  
  // Allowed imports per layer
  const allowedImports = {
    'controllers': ['../services/', '../middlewares/', '../utils/', '../errors/', '../config/'],
    'services': ['../repositories/', '../utils/', '../errors/', '../config/'],
    'repositories': ['../utils/', '../errors/', '../config/prisma'],
    'middlewares': ['../services/', '../utils/', '../errors/', '../config/'],
    'utils': [] // Utils should import nothing from app
  };
  
  Object.entries(allowedImports).forEach(([layer, allowed]) => {
    const layerDir = join(SRC_DIR, layer);
    if (!existsSync(layerDir)) return;
    
    const files = getAllTypeScriptFiles(layerDir);
    
    files.forEach(file => {
      const content = readFileSync(file, 'utf-8');
      const relativePath = file.replace(SRC_DIR + '/', '');
      
      // Check for forbidden layer imports
      const allLayers = ['controllers', 'services', 'repositories', 'middlewares'];
      allLayers.forEach(otherLayer => {
        if (otherLayer === layer) return; // Skip same layer
        
        if (content.includes(`../${otherLayer}/`)) {
          // Check if it's in allowed list
          const isAllowed = allowed.some(a => a.includes(otherLayer));
          if (!isAllowed) {
            warn(`${relativePath}: Imports from ${otherLayer} (check if necessary)`);
          }
        }
      });
    });
  });
}

// ============================================
// RULE 7: Check for Security Audit Coverage
// ============================================

function checkSecurityAuditCoverage() {
  info('Checking security audit implementation...');
  
  const authServiceFile = join(SRC_DIR, 'services/AuthService.ts');
  if (!existsSync(authServiceFile)) return;
  
  const content = readFileSync(authServiceFile, 'utf-8');
  
  const requiredAudits = [
    'REGISTER_SUCCESS',
    'REGISTER_FAILED',
    'LOGIN_SUCCESS',
    'LOGIN_FAILED',
    'LOGOUT',
    'TOKEN_REFRESHED',
    'REFRESH_FAILED'
  ];
  
  requiredAudits.forEach(event => {
    if (!content.includes(event)) {
      warn(`AuthService: Missing audit for "${event}" event`);
      log(`   → Add SecurityAuditService.audit({ eventType: '${event}', ... })`, 'blue');
    }
  });
}

// ============================================
// Helper Functions
// ============================================

function getAllTypeScriptFiles(dir) {
  const files = [];
  
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...getAllTypeScriptFiles(fullPath));
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.cts'))) {
        files.push(fullPath);
      }
    }
  } catch (err) {
    // Ignore errors
  }
  
  return files;
}

// ============================================
// Main Execution
// ============================================

function main() {
  log('\n🔍 Architecture Linter - Zero Trust Code Quality\n', 'cyan');
  log('Running architecture validation checks...', 'blue');
  log('─'.repeat(60), 'cyan');
  
  checkDuplicateFunctions();
  checkControllerImports();
  checkServiceImports();
  checkRepositoryImports();
  checkUtilsPurity();
  checkLayerDependencies();
  checkSecurityAuditCoverage();
  
  log('─'.repeat(60), 'cyan');
  
  if (errors > 0) {
    log(`\n❌ FAILED: ${errors} error(s), ${warnings} warning(s) found`, 'red');
    log('\nFix all errors before committing code.', 'red');
    process.exit(1);
  } else if (warnings > 0) {
    log(`\n⚠️  PASSED with warnings: ${warnings} warning(s)`, 'yellow');
    log('Consider fixing warnings for better code quality.', 'yellow');
    process.exit(0);
  } else {
    log(`\n✅ PASSED: No errors or warnings found!`, 'green');
    log('Architecture is clean and follows best practices.', 'green');
    process.exit(0);
  }
}

// Run the linter
main();
