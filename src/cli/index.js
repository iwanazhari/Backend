#!/usr/bin/env node
/**
 * LockKit CLI - Access Control, Solved
 * 
 * Command-line interface for LockKit
 * Supports shortcuts for faster development
 * 
 * Usage:
 *   lockkit init              (or: lk i)
 *   lockkit generate:key      (or: lk g:key)
 *   lockkit install:express   (or: lk i:express)
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import readline from 'readline';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Commands with shortcuts
const commands = {
  init: { description: 'Initialize LockKit project', usage: 'init [options]', shortcuts: ['i', 'new'] },
  'generate:key': { description: 'Generate secure key', usage: 'generate:key', shortcuts: ['g:key', 'gen:key'] },
  'generate:all': { description: 'Generate all files (model+controller+service+repo+routes+test)', usage: 'generate:all <name>', shortcuts: ['g:all', 'gen:all'] },
  'generate:model': { description: 'Generate model', usage: 'generate:model <name>', shortcuts: ['g:model', 'gen:m'] },
  'generate:controller': { description: 'Generate controller', usage: 'generate:controller <name>', shortcuts: ['g:controller', 'gen:c'] },
  'generate:service': { description: 'Generate service', usage: 'generate:service <name>', shortcuts: ['g:service', 'gen:s'] },
  'generate:repository': { description: 'Generate repository', usage: 'generate:repository <name>', shortcuts: ['g:repo', 'gen:r'] },
  'generate:routes': { description: 'Generate routes', usage: 'generate:routes <name>', shortcuts: ['g:routes', 'gen:routes'] },
  'generate:test': { description: 'Generate test', usage: 'generate:test <name>', shortcuts: ['g:test', 'gen:t'] },
  'install:express': { description: 'Install Express adapter', usage: 'install:express', shortcuts: ['i:express', 'add:express'] },
  'install:nestjs': { description: 'Install NestJS adapter', usage: 'install:nestjs', shortcuts: ['i:nestjs', 'add:nestjs'] },
  'install:fastify': { description: 'Install Fastify adapter', usage: 'install:fastify', shortcuts: ['i:fastify', 'add:fastify'] },
  help: { description: 'Show help', usage: 'help [command]', shortcuts: ['h', '?'] },
};

// Command aliases
const aliases = {
  'i': 'init',
  'new': 'init',
  'g': 'generate',
  'gen': 'generate',
  'g:key': 'generate:key',
  'gen:key': 'generate:key',
  'g:all': 'generate:all',
  'gen:all': 'generate:all',
  'g:model': 'generate:model',
  'gen:m': 'generate:model',
  'g:controller': 'generate:controller',
  'gen:c': 'generate:controller',
  'g:service': 'generate:service',
  'gen:s': 'generate:service',
  'g:repository': 'generate:repository',
  'gen:r': 'generate:repository',
  'g:routes': 'generate:routes',
  'gen:routes': 'generate:routes',
  'g:test': 'generate:test',
  'gen:t': 'generate:test',
  'i:express': 'install:express',
  'add:express': 'install:express',
  'i:nestjs': 'install:nestjs',
  'add:nestjs': 'install:nestjs',
  'i:fastify': 'install:fastify',
  'add:fastify': 'install:fastify',
  'h': 'help',
  '?': 'help',
};

function printBanner() {
  console.log(`
${colors.cyan}╔═══════════════════════════════════════════════════════╗${colors.reset}
${colors.cyan}║${colors.reset}                                               ${colors.cyan}║${colors.reset}
${colors.cyan}║${colors.reset}  ${colors.magenta}🔒 LockKit${colors.reset} - Secure Access, Zero Setup          ${colors.cyan}║${colors.reset}
${colors.cyan}║${colors.reset}  ${colors.yellow}Access Control, Solved${colors.reset}                           ${colors.cyan}║${colors.reset}
${colors.cyan}║${colors.reset}                                               ${colors.cyan}║${colors.reset}
${colors.cyan}╚═══════════════════════════════════════════════════════╝${colors.reset}
  `);
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, answer => {
    rl.close();
    resolve(answer);
  }));
}

async function initProject(options) {
  console.log(`${colors.blue}Initializing LockKit...${colors.reset}\n`);

  let framework = options.framework;
  if (!framework) {
    console.log(`${colors.yellow}?${colors.reset} Choose your framework:`);
    console.log(`  1) Express.js (Most popular)`);
    console.log(`  2) NestJS (Enterprise-ready)`);
    console.log(`  3) Fastify (High performance)`);
    
    const choice = await askQuestion(`${colors.cyan}Enter choice (1-3):${colors.reset} `);
    framework = choice === '1' ? 'express' : choice === '2' ? 'nestjs' : 'fastify';
  }

  let packageManager = options.packageManager;
  if (!packageManager) {
    console.log(`\n${colors.yellow}?${colors.reset} Choose package manager:`);
    console.log(`  1) npm`);
    console.log(`  2) yarn`);
    console.log(`  3) pnpm`);
    
    const choice = await askQuestion(`${colors.cyan}Enter choice (1-3):${colors.reset} `);
    packageManager = choice === '1' ? 'npm' : choice === '2' ? 'yarn' : 'pnpm';
  }

  console.log(`\n${colors.blue}Configuration:${colors.reset}`);
  console.log(`  Framework: ${colors.green}${framework}${colors.reset}`);
  console.log(`  Package Manager: ${colors.green}${packageManager}${colors.reset}`);

  // Create directories
  const dirs = ['src/config', 'src/controllers', 'src/services', 'src/middlewares', 'src/routes', 'prisma', 'tests'];
  dirs.forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });

  // Generate key
  const key = crypto.randomBytes(32).toString('base64');
  
  // Create .env
  const envContent = `# LockKit Configuration
NODE_ENV=development
APP_PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lockkit?schema=public
LOCK_KEY=${key}
LOCK_KEY_EXPIRE=15m
LOCK_KEY_REFRESH_EXPIRE=7d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
CORS_ORIGIN=http://localhost:3000
`;
  fs.writeFileSync('.env', envContent);

  console.log(`\n${colors.green}✓${colors.reset} Project initialized`);
  console.log(`${colors.green}✓${colors.reset} .env file created`);
  console.log(`${colors.green}✓${colors.reset} Secure key generated`);

  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}Next Steps:${colors.reset}\n`);
  console.log(`${colors.yellow}1.${colors.reset} ${packageManager} install`);
  console.log(`${colors.yellow}2.${colors.reset} ${packageManager} run prisma:generate`);
  console.log(`${colors.yellow}3.${colors.reset} ${packageManager} run prisma:migrate`);
  console.log(`${colors.yellow}4.${colors.reset} ${packageManager} run dev\n`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);
  console.log(`${colors.green}✅ LockKit initialized successfully!${colors.reset}\n`);
}

function generateKey() {
  const key = crypto.randomBytes(32).toString('base64');
  console.log(`${colors.blue}Generating secure key...${colors.reset}\n`);
  console.log(`${colors.green}✓${colors.reset} Key generated:\n`);
  console.log(`${colors.cyan}LOCK_KEY=${key}${colors.reset}\n`);
  console.log(`${colors.yellow}Add this to your .env file${colors.reset}\n`);
}

function generateAll(name) {
  console.log(`${colors.blue}Generating all files for: ${name}${colors.reset}\n`);
  
  console.log(`${colors.yellow}Step 1/6:${colors.reset} Generating model...`);
  generateModel(name);
  
  console.log(`\n${colors.yellow}Step 2/6:${colors.reset} Generating controller...`);
  generateController(name);
  
  console.log(`\n${colors.yellow}Step 3/6:${colors.reset} Generating service...`);
  generateService(name);
  
  console.log(`\n${colors.yellow}Step 4/6:${colors.reset} Generating repository...`);
  generateRepository(name);
  
  console.log(`\n${colors.yellow}Step 5/6:${colors.reset} Generating routes...`);
  generateRoutes(name);
  
  console.log(`\n${colors.yellow}Step 6/6:${colors.reset} Generating test...`);
  generateTest(name);
  
  console.log(`\n${colors.green}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}✅ ALL FILES GENERATED!${colors.reset}`);
  console.log(`${colors.green}═══════════════════════════════════════════════════════${colors.reset}\n`);
  
  console.log(`${colors.yellow}Next Steps:${colors.reset}`);
  console.log(`  1. Add model to prisma/schema.prisma`);
  console.log(`  2. Run: npm run prisma:generate`);
  console.log(`  3. Run: npm run prisma:migrate`);
  console.log(`  4. Register routes in src/routes/index.ts`);
  console.log(`  5. Run tests: npm test\n`);
}

function generateModel(name) {
  console.log(`${colors.blue}Generating model: ${name}${colors.reset}\n`);
  const model = `model ${name} {
  id        String   @id @default(uuid()) @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([createdAt])
  @@map("${name.toLowerCase()}s")
}`;
  console.log(model);
  console.log(`\n${colors.green}✓${colors.reset} Model generated`);
  console.log(`${colors.yellow}Next:${colors.reset} Add to prisma/schema.prisma, then run prisma:generate`);
}

function generateController(name) {
  console.log(`${colors.blue}Generating controller: ${name}${colors.reset}\n`);
  const controller = `import { Request, Response } from 'express';

export class ${name}Controller {
  async getAll(req: Request, res: Response) {
    res.json({ success: true, data: [] });
  }

  async getById(req: Request, res: Response) {
    res.json({ success: true, data: { id: req.params.id } });
  }

  async create(req: Request, res: Response) {
    res.status(201).json({ success: true, data: req.body });
  }

  async update(req: Request, res: Response) {
    res.json({ success: true, data: { id: req.params.id, ...req.body } });
  }

  async delete(req: Request, res: Response) {
    res.json({ success: true, message: 'Deleted' });
  }
}

export default new ${name}Controller();`;
  console.log(controller);
  console.log(`\n${colors.green}✓${colors.reset} Controller generated`);
}

function generateService(name) {
  console.log(`${colors.blue}Generating service: ${name}${colors.reset}\n`);
  const service = `import { getPrismaClient } from '../config/prisma.js';

export class ${name}Service {
  private prisma = getPrismaClient();

  async getAll() {
    return this.prisma.${name.toLowerCase()}.findMany();
  }

  async getById(id: string) {
    return this.prisma.${name.toLowerCase()}.findUnique({ where: { id } });
  }

  async create(data: any) {
    return this.prisma.${name.toLowerCase()}.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.${name.toLowerCase()}.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.${name.toLowerCase()}.delete({ where: { id } });
  }
}`;
  console.log(service);
  console.log(`\n${colors.green}✓${colors.reset} Service generated`);
}

function installFramework(framework) {
  console.log(`${colors.blue}Installing ${framework} adapter...${colors.reset}\n`);
  const adapters = {
    express: { packages: ['express', '@types/express', 'cors', '@types/cors'], message: 'Express.js' },
    nestjs: { packages: ['@nestjs/core', '@nestjs/common', '@nestjs/platform-express', 'reflect-metadata'], message: 'NestJS' },
    fastify: { packages: ['fastify', '@fastify/cors', '@fastify/cookie'], message: 'Fastify' },
  };
  
  const adapter = adapters[framework];
  if (!adapter) {
    console.log(`${colors.red}✗${colors.reset} Invalid framework. Choose: express|nestjs|fastify`);
    return;
  }

  console.log(`${colors.blue}Packages:${colors.reset}`);
  adapter.packages.forEach(pkg => console.log(`  - ${pkg}`));
  console.log(`\n${colors.green}✓${colors.reset} ${adapter.message} adapter ready`);
  console.log(`${colors.yellow}Run:${colors.reset} npm install ${adapter.packages.join(' ')}\n`);
}

function printHelp(commandName) {
  printBanner();
  if (commandName && commands[commandName]) {
    const cmd = commands[commandName];
    console.log(`${colors.blue}Command:${colors.reset} ${commandName}`);
    console.log(`${colors.blue}Description:${colors.reset} ${cmd.description}`);
    console.log(`${colors.blue}Usage:${colors.reset} ${cmd.usage}`);
    if (cmd.shortcuts && cmd.shortcuts.length > 0) {
      console.log(`${colors.blue}Shortcuts:${colors.reset} ${cmd.shortcuts.join(', ')}`);
    }
    console.log();
  } else {
    console.log(`${colors.blue}Available Commands:${colors.reset}\n`);
    Object.entries(commands).forEach(([name, cmd]) => {
      console.log(`  ${colors.green}${name}${colors.reset}`);
      console.log(`    ${cmd.description}`);
      console.log(`    Usage: ${cmd.usage}`);
      if (cmd.shortcuts && cmd.shortcuts.length > 0) {
        console.log(`    Shortcuts: ${colors.cyan}${cmd.shortcuts.join(', ')}${colors.reset}`);
      }
      console.log();
    });
    
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}Quick Start:${colors.reset}\n`);
    console.log(`${colors.yellow}1.${colors.reset} lockkit init          (or: lk i)`);
    console.log(`${colors.yellow}2.${colors.reset} lockkit generate:key  (or: lk g:key)`);
    console.log(`${colors.yellow}3.${colors.reset} lockkit install:express (or: lk i:express)`);
    console.log(`${colors.yellow}4.${colors.reset} npm install && npm run dev\n`);
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);
  }
}

// Resolve command with aliases
function resolveCommand(cmd) {
  return aliases[cmd] || cmd;
}

// Main CLI function
async function main() {
  const args = process.argv.slice(2);
  let command = args[0];
  const options = {};
  const params = [];

  // Resolve aliases
  command = resolveCommand(command);

  // Parse arguments
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const [key, value] = args[i].substring(2).split('=');
      options[key] = value || true;
    } else if (!args[i].startsWith('-')) {
      params.push(args[i]);
    }
  }

  printBanner();

  // Execute command
  switch (command) {
    case 'init': await initProject(options); break;
    case 'generate:key': generateKey(); break;
    case 'generate:model': params[0] ? generateModel(params[0]) : console.log(`${colors.red}✗${colors.reset} Name required`); break;
    case 'generate:controller': params[0] ? generateController(params[0]) : console.log(`${colors.red}✗${colors.reset} Name required`); break;
    case 'generate:service': params[0] ? generateService(params[0]) : console.log(`${colors.red}✗${colors.reset} Name required`); break;
    case 'generate:all': params[0] ? generateAll(params[0]) : console.log(`${colors.red}✗${colors.reset} Name required`); break;
    case 'generate:repository': params[0] ? generateRepository(params[0]) : console.log(`${colors.red}✗${colors.reset} Name required`); break;
    case 'generate:routes': params[0] ? generateRoutes(params[0]) : console.log(`${colors.red}✗${colors.reset} Name required`); break;
    case 'generate:test': params[0] ? generateTest(params[0]) : console.log(`${colors.red}✗${colors.reset} Name required`); break;
    case 'install:express': installFramework('express'); break;
    case 'install:nestjs': installFramework('nestjs'); break;
    case 'install:fastify': installFramework('fastify'); break;
    case 'help': case undefined: printHelp(params[0]); break;
    default: console.log(`${colors.red}✗${colors.reset} Unknown command: ${command}\nRun 'lockkit help' for available commands`);
  }
}

main().catch(error => {
  console.error(`${colors.red}Error:${colors.reset}`, error);
  process.exit(1);
});

// Additional generate functions
function generateRepository(name) {
  console.log(`${colors.blue}Generating repository: ${name}${colors.reset}\n`);
  const repository = `import { BaseRepository } from './BaseRepository.js';

export class ${name}Repository extends BaseRepository {
  async findByUserId(userId) {
    return this.prisma.${name.toLowerCase()}.findMany({ where: { userId } });
  }
}`;
  console.log(repository);
  console.log(`\n${colors.green}✓${colors.reset} Repository generated`);
}

function generateRoutes(name) {
  console.log(`${colors.blue}Generating routes: ${name}${colors.reset}\n`);
  const routes = `import { Router } from 'express';
import ${name}Controller from '../controllers/${name}Controller.js';
import { authenticate } from '../middlewares/authenticate.js';

const router = Router();
router.get('/', authenticate, ${name}Controller.getAll);
router.get('/:id', authenticate, ${name}Controller.getById);
router.post('/', authenticate, ${name}Controller.create);
router.put('/:id', authenticate, ${name}Controller.update);
router.delete('/:id', authenticate, ${name}Controller.delete);

export default router;`;
  console.log(routes);
  console.log(`\n${colors.green}✓${colors.reset} Routes generated`);
}

function generateTest(name) {
  console.log(`${colors.blue}Generating test: ${name}${colors.reset}\n`);
  const test = `import { describe, it, expect } from 'vitest';
import ${name}Service from '../../src/services/${name}Service.js';

describe('${name}Service', () => {
  it('should be defined', () => expect(${name}Service).toBeDefined());
  it('should get all', async () => {
    const result = await ${name}Service.getAll();
    expect(result).toBeDefined();
  });
});`;
  console.log(test);
  console.log(`\n${colors.green}✓${colors.reset} Test generated`);
}
