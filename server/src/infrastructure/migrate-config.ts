import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createAppConfig } from '../config/AppConfig.js';
import { RunnerOption } from 'node-pg-migrate';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * node-pg-migrate configuration
 *
 * This configuration is used for:
 * 1. Programmatic migrations via MigrationRunner.ts (on API startup)
 * 2. CLI migrations via npm scripts (migrate:create, migrate:down, etc.)
 *
 * Database connection details are loaded from config.yaml at runtime.
 */

export function getMigrationConfig(): RunnerOption {
  const { database } = createAppConfig();
  const databaseUrl = `postgres://${database.username}:${database.password}@${database.host}:${database.port}/${database.database}`;

  return {
    // Database connection
    databaseUrl,

    // Migrations directory (absolute path)
    // Points to server/migrations folder
    dir: path.resolve(__dirname, '../../migrations'),
    
    // Migration file naming convention
    // Use timestamp-based naming for better merge conflict handling
    // Format: TIMESTAMP_migration-name.sql (e.g., 1620000000000_initial-schema.sql)
    migrationsTable: 'pgmigrations',
    
    // Create migrations table if it doesn't exist
    createMigrationsSchema: true,
    createSchema: false,

    // Use advisory locks to prevent concurrent migrations
    // This is critical for multi-instance deployments
    checkOrder: true,
    
    // Direction for programmatic migrations (always 'up' for auto-migrations)
    direction: 'up',
    
    // Count how many migrations to run (Infinity = all pending migrations)
    count: Infinity,

    // Transaction behavior
    // Each SQL migration file runs in its own transaction by default
    singleTransaction: false,

    // Logging
    verbose: true,
    
    // File type
    // We use SQL files for migrations
    ignorePattern: '\\.d\\.ts$',
    
    // No TypeScript migrations (SQL only)
    decamelize: false,
  };
}
