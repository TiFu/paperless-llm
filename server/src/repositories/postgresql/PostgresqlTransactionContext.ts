import { Pool, PoolClient } from "pg";
import { UoW } from "../../infrastructure/UoW.js";
import { createChildLogger } from "../../utils/logger.js";
import { LogArea } from "../../utils/LogArea.js";
import { DatabaseTransactionContext, DatabaseTransactionContextFactory, RepositoryRegistryFactory as RepositoryRegistryFactory, RepositoryRegistry, DBContextWithRepositoryFactory } from "../../infrastructure/TransactionManager.js";
import { IPromptsRepository } from "../../domain/prompt/IPromptsRepository.js";
import { IJobRepository } from "../../domain/job/IJobRepository.js";
import { IStepRepository } from "../../domain/steps/IStepRepository.js";
import { IAuditLogRepository } from "../../domain/audit/IAuditLogRepository.js";
import { PostgreSQLPromptsRepository } from "./PostgreSQLPromptsRepository.js";
import { PostgreSQLJobRepository } from "./PostgreSQLJobRepository.js";
import { PostgreSQLStepRepository } from "./PostgreSQLStepRepository.js";
import { PostgreSQLAuditLogRepository } from "./PostgreSQLAuditLogRepository.js";
import { IPermissionsRepository } from "../../domain/authorization/IPermissionsRepository.js";
import { PostgreSQLPermissionsRepository } from "./PostgreSQLPermissionsRepository.js";
import { IUsersRepository } from "../../domain/auth/IUsersRepository.js";
import { PostgreSQLUsersRepository } from "./PostgreSQLUsersRepository.js";
import { IEntityDescriptionsRepository } from "../../domain/entityDescriptions/IEntityDescriptionsRepository.js";
import { PostgreSQLEntityDescriptionsRepository } from "./PostgreSQLEntityDescriptionsRepository.js";
import { IWorkerExecutionRepository } from "../../domain/workerExecution/IWorkerExecutionRepository.js";
import { PostgreSQLWorkerExecutionRepository } from "./PostgreSQLWorkerExecutionRepository.js";
import { IAppSettingsRepository } from "../../domain/settings/IAppSettingsRepository.js";
import { PostgreSQLAppSettingsRepository } from "./PostgreSQLAppSettingsRepository.js";

export class PostgresqlDatabaseTransactionContext implements DatabaseTransactionContext {
  static contextNo: number = 0;
  private readonly client: PoolClient;
  private isActive: boolean = false;
  private isDisposed: boolean = false;
  private readonly logger;
  private readonly name: string;

  constructor(client: PoolClient) {
    this.client = client;
    PostgresqlDatabaseTransactionContext.contextNo++;
    this.name = "TransactionContext " + PostgresqlDatabaseTransactionContext.contextNo;
    this.logger = createChildLogger(LogArea.DATABASE, this.name);
  }
  
  getClient(): PoolClient {
    return this.client;
  }

  /**
   * Begin a new transaction.
   */
  public async start(): Promise<void> {
    this.logger.debug({ name: this.name }, "Started")
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
    this.logger.debug({ name: this.name }, "Commit")
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
    this.logger.debug({ name: this.name }, "Rollback")
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
   * Dispose of the transaction context and release the database connection.
   * If a transaction is active, it will be rolled back.
   */
  public async dispose(): Promise<void> {
    this.logger.debug({ name: this.name }, "Disposed")
    if (this.isDisposed) {
      return;
    }

    try {
      if (this.isActive) {
        await this.client.query('ROLLBACK');
        this.isActive = false;
      }
    } catch (error) {
      this.logger.error({ error }, 'Error during transaction context disposal');
    } finally {
      this.client.release();
      this.isDisposed = true;
    }
  }

  /**
   * Support for future async using statements (TC39 proposal)
   */
  async [Symbol.asyncDispose](): Promise<void> {
    this.logger.debug({ name: this.name }, "Automatic dispose called")
    await this.dispose();
  }
}

export class PostgresRepositoryRegistryFactory implements RepositoryRegistryFactory {
    constructor(private readonly context: PostgresqlDatabaseTransactionContext) {

    }
    create(uow: UoW): RepositoryRegistry {
        return new PostgresqlRepositoryRegistry(this.context, uow)
    }
}

export class PostgresqlRepositoryRegistry implements RepositoryRegistry {
    private promptRepo: IPromptsRepository
    private jobRepo: IJobRepository
    private stepRepo: IStepRepository
    private auditRepo: IAuditLogRepository
    private permissionsRepo: IPermissionsRepository
    private usersRepo: IUsersRepository
    private entityDescriptionsRepo: IEntityDescriptionsRepository
    private workerExecutionsRepo: IWorkerExecutionRepository
    private settingsRepo: IAppSettingsRepository

    constructor(context: PostgresqlDatabaseTransactionContext, uow: UoW) {
        const client = context.getClient();
        this.promptRepo = new PostgreSQLPromptsRepository(client, uow)
        this.jobRepo = new PostgreSQLJobRepository(client, uow)
        this.stepRepo = new PostgreSQLStepRepository(client, uow)
        this.auditRepo = new PostgreSQLAuditLogRepository(client)
        this.permissionsRepo = new PostgreSQLPermissionsRepository(client)
        this.usersRepo = new PostgreSQLUsersRepository(client)
        this.entityDescriptionsRepo = new PostgreSQLEntityDescriptionsRepository(client)
        this.workerExecutionsRepo = new PostgreSQLWorkerExecutionRepository(client)
        this.settingsRepo = new PostgreSQLAppSettingsRepository(client)
    }
    getPrompts(): IPromptsRepository {
        return this.promptRepo
    }
    getJobs(): IJobRepository {
        return this.jobRepo
    }
    getSteps(): IStepRepository {
        return this.stepRepo
    }
    getAuditLog(): IAuditLogRepository {
        return this.auditRepo
    }
    getPermissions(): IPermissionsRepository {
        return this.permissionsRepo
    }
    getUsers(): IUsersRepository {
        return this.usersRepo
    }
    getEntityDescriptions(): IEntityDescriptionsRepository {
        return this.entityDescriptionsRepo
    }
    getWorkerExecutions(): IWorkerExecutionRepository {
        return this.workerExecutionsRepo
    }
    getSettings(): IAppSettingsRepository {
        return this.settingsRepo
    }

}

export class PostgresqlTransactionManager implements DatabaseTransactionContextFactory {

  constructor(private readonly pool: Pool) {
  }

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
  public async createContext(): Promise<DBContextWithRepositoryFactory> {
    const client = await this.pool.connect();
    const ctx = new PostgresqlDatabaseTransactionContext(client);
    return {
        ctx: ctx,
        repositoryFactory: new PostgresRepositoryRegistryFactory(ctx)
    }
  }

}
