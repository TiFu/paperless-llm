import { Pool } from 'pg';
import { PostgreSQLConnection, StartedPostgreSQLContainer } from '@testcontainers/postgresql';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export class TestDatabase {
  private container?: StartedPostgreSQLContainer;
  private pool?: Pool;

  async start(): Promise<Pool> {
    // Start PostgreSQL container
    this.container = await new PostgreSQLConnection()
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .start();

    // Create connection pool
    this.pool = new Pool({
      host: this.container.getHost(),
      port: this.container.getPort(),
      database: this.container.getDatabase(),
      user: this.container.getUsername(),
      password: this.container.getPassword(),
    });

    // Run migrations
    await this.runMigrations();

    return this.pool;
  }

  async runMigrations(): Promise<void> {
    if (!this.container || !this.pool) {
      throw new Error('Database not started');
    }

    const databaseUrl = `postgresql://${this.container.getUsername()}:${this.container.getPassword()}@${this.container.getHost()}:${this.container.getPort()}/${this.container.getDatabase()}`;

    const migrationsDir = path.join(__dirname, '..', '..', 'migrations');

    // Run node-pg-migrate
    await execAsync(
      `DATABASE_URL="${databaseUrl}" node-pg-migrate up --migrations-dir "${migrationsDir}"`,
    );
  }

  async stop(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
    if (this.container) {
      await this.container.stop();
    }
  }

  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database not started');
    }
    return this.pool;
  }
}
