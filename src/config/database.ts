/**
 * Database Configuration
 * Simple database config for reference
 */

export interface DatabaseConfig {
  url: string;
}

const config: { development: DatabaseConfig; test: DatabaseConfig; production: DatabaseConfig } = {
  development: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/starter_kit_dev?schema=public',
  },
  test: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/starter_kit_test?schema=public',
  },
  production: {
    url: process.env.DATABASE_URL || '',
  },
};

export default config;
