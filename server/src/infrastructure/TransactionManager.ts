import { Pool, PoolClient } from 'pg';
import { RepositoryRegistry } from './RepositoryRegistry';

/**
 * Represents a database transaction context.
 * Manages transaction lifecycle and provides access to repositories.
 */
export class TransactionContext {
  private readonly client: PoolClient;
  private readonly repositoryRegistry: RepositoryRegistry;
  private isActive: boolean = false;
  private isDisposed: boolean = false;

  constructor(client: PoolClient) {
    this.client = client;
    this.repositoryRegistry = new RepositoryRegistry(client);
  }

  /**
   * Begin a new transaction.
   */
  public async start(): Promise<void> {
    if (this.isDisposed) {
      throw new Error('Cannot start transaction: context has been disposed');
    }
    // Nothing to do given that it is already active
    if (this.isActive) {
      return; 
    }
    await this.client.query('BEGIN');
    this.isActive = true;
  }

  /**
   * Commit the current transaction.
   */
  public async commit(): Promise<void> {
    if (this.isDisposed) {
      throw new Error('Cannot commit transaction: context has been disposed');
    }
    if (!this.isActive) {
      throw new Error('No active transaction to commit');
    }
    await this.client.query('COMMIT');
    this.isActive = false;
  }

  /**
   * Rollback the current transaction.
   */
  public async rollback(): Promise<void> {
    if (this.isDisposed) {
      throw new Error('Cannot rollback transaction: context has been disposed');
    }
    if (!this.isActive) {
      throw new Error('No active transaction to rollback');
    }
    await this.client.query('ROLLBACK');
    this.isActive = false;
  }

  /**
   * Get the repository registry for this transaction context.
   */
  public getRepositoryRegistry(): RepositoryRegistry {
    if (this.isDisposed || !this.isActive) {
      throw new Error('Cannot access repositories: context has been disposed or is not active!');
    }
    return this.repositoryRegistry;
  }

  /**
   * Dispose of the transaction context and release the database connection.
   * If a transaction is active, it will be rolled back.
   */
  public async dispose(): Promise<void> {
    if (this.isDisposed) {
      return;
    }

    try {
      if (this.isActive) {
        await this.client.query('ROLLBACK');
        this.isActive = false;
      }
    } catch (error) {
      console.error('Error during transaction context disposal:', error);
    } finally {
      this.client.release();
      this.isDisposed = true;
    }
  }

  /**
   * Support for future async using statements (TC39 proposal)
   */
  async [Symbol.asyncDispose](): Promise<void> {
    await this.dispose();
  }
}

export class TransactionManager {
  constructor(private readonly pool: Pool) {}

  /**
   * Create a new transaction context.
   * The caller is responsible for disposing the context to release the connection.
   *
   * @returns A new TransactionContext
   *
   * @example
   * const context = await transactionManager.createContext();
   * try {
   *   await context.start();
   *   const repos = context.getRepositoryRegistry();
   *   // ... perform operations ...
   *   await context.commit();
   * } catch (error) {
   *   await context.rollback();
   *   throw error;
   * } finally {
   *   await context.dispose();
   * }
   */
  public async createContext(): Promise<TransactionContext> {
    const client = await this.pool.connect();
    return new TransactionContext(client);
  }

}
