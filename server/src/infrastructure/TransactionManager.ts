import { Pool, PoolClient } from 'pg';
import { RepositoryRegistry } from './RepositoryRegistry';

export class TransactionManager {
  constructor(private readonly pool: Pool) {}

  /**
   * Execute a function within a database transaction.
   * Automatically handles BEGIN, COMMIT, ROLLBACK, and connection cleanup.
   *
   * @param fn Callback function that receives repository registry bound to the transaction
   * @returns Result of the callback function
   * @throws Error if transaction fails
   */
  public async execute<T>(
    fn: (repos: RepositoryRegistry) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Create repositories bound to this transaction client
      const repos = new RepositoryRegistry(client);

      // Execute the callback with transactional repositories
      const result = await fn(repos);

      await client.query('COMMIT');
      return result;
    } catch (error) {
      console.log(error)
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
