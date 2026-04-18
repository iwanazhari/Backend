/**
 * Wrapper for generator scripts
 * Allows CommonJS scripts to work with ES Modules
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import and execute CommonJS script
const generator = require('./generate-all.cjs');
generator.main(process.argv.slice(2));
