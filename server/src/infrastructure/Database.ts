import { Pool, PoolConfig } from 'pg';
import { DatabaseConfig } from '../config/AppConfig.js';
import { createChildLogger } from '../utils/logger.js';

export class Database {
  private pool: Pool;
  private readonly logger = createChildLogger({ name: 'Database' });

  constructor(config: DatabaseConfig) {
    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
      max: 20, // Maximum number of connections in the pool
      idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
      connectionTimeoutMillis: 10000, // Timeout for acquiring a connection
    };

    this.pool = new Pool(poolConfig);

    // Handle pool errors
    this.pool.on('error', (err: Error) => {
      this.logger.error({ err }, 'Unexpected error on idle client');
      process.exit(-1);
    });
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.pool.query('SELECT NOW()');
      return !!result.rows[0];
    } catch (error) {
      this.logger.error({ error }, 'Database health check failed');
      return false;
    }
  }
}
