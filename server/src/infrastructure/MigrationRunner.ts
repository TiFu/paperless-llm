import { Database } from './Database.js';
import { getMigrationConfig } from './migrate-config.js';
import { Logger } from 'pino';
import { ClientBase } from 'pg';
import {runner} from 'node-pg-migrate';
/**
 * MigrationRunner - Automated database migration execution
 * 
 * This module wraps node-pg-migrate to run database migrations automatically
 * during API server startup. It uses PostgreSQL advisory locks to prevent
 * race conditions when multiple API instances start simultaneously.
 * 
 * Features:
 * - Automatic migration execution on startup
 * - Advisory locks prevent concurrent execution
 * - Idempotent (safe to run multiple times)
 * - Tracks migration history in pgmigrations table
 */

export class MigrationRunner {
  private database: Database;
  private logger: Logger;

  constructor(database: Database, logger: Logger) {
    this.database = database;
    this.logger = logger;
  }

  /**
   * Run all pending migrations
   * 
   * This method:
   * 1. Acquires a PostgreSQL advisory lock to prevent concurrent migrations
   * 2. Checks for pending migrations
   * 3. Runs all pending migrations in order
   * 4. Logs the results
   * 5. Releases the lock
   * 
   * @throws Error if migrations fail
   */
  async runMigrations(): Promise<void> {
    const config = getMigrationConfig();
    const pool = this.database.getPool();

    this.logger.info('Starting database migration check...');

    try {
      
      // Run migrations using node-pg-migrate
      // It will use the database connection from config
      await runner({
        ...config,
        // Override database connection to use our existing pool
        // node-pg-migrate's types only declare ClientBase, but it duck-types
        // against Pool's query()/connect() at runtime, which is the documented usage.
        dbClient: pool as unknown as ClientBase,
        // Direction is always 'up' for automatic migrations
        direction: 'up',
        // Run all pending migrations
        count: Infinity,
        // Verbose logging
        log: (message: string) => {
          this.logger.debug({ migration: true }, message);
        },
      });

      this.logger.info("Successfully completed all migrations");
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        'Failed to run database migrations',
      );
      throw new Error(
        `Database migration failed: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }
}

/**
 * Helper function for standalone migration execution
 * Can be used in CLI scripts or tests
 * 
 * @param database Database instance
 * @param logger Logger instance
 */
export async function runMigrations(
  database: Database,
  logger: Logger,
): Promise<void> {
  const migrationRunner = new MigrationRunner(database, logger);
  await migrationRunner.runMigrations();
}
