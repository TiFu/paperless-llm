import { IPromptsRepository } from '../domain/prompt/IPromptsRepository.js';
import { IJobRepository } from '../domain/job/IJobRepository.js';
import { IStepRepository } from '../domain/steps/IStepRepository.js';
import { IAuditLogRepository } from '../domain/audit/IAuditLogRepository.js';
import { IPermissionsRepository } from '../domain/authorization/IPermissionsRepository.js';
import { IUsersRepository } from '../domain/auth/IUsersRepository.js';
import { IEntityDescriptionsRepository } from '../domain/entityDescriptions/IEntityDescriptionsRepository.js';
import { IWorkerExecutionRepository } from '../domain/workerExecution/IWorkerExecutionRepository.js';
import { IAppSettingsRepository } from '../domain/settings/IAppSettingsRepository.js';
import { UoW } from './UoW.js';
import { Pool, PoolClient } from 'pg';

/**
 * Represents a database transaction context.
 * Manages transaction lifecycle and provides access to repositories.
 */
export interface DatabaseTransactionContext {
  start(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  dispose(): Promise<void>;
  getClient(): Pool | PoolClient
  [Symbol.asyncDispose](): Promise<void>
}

export interface RepositoryRegistryFactory {
  create(uow: UoW): RepositoryRegistry
}

export interface RepositoryRegistry {
  getPrompts(): IPromptsRepository;
  getJobs(): IJobRepository;
  getSteps(): IStepRepository;

  getAuditLog(): IAuditLogRepository;
  getPermissions(): IPermissionsRepository;
  getUsers(): IUsersRepository;
  getEntityDescriptions(): IEntityDescriptionsRepository;
  getWorkerExecutions(): IWorkerExecutionRepository;
  getSettings(): IAppSettingsRepository;
}

export type DBContextWithRepositoryFactory = { ctx: DatabaseTransactionContext, repositoryFactory: RepositoryRegistryFactory}
export interface DatabaseTransactionContextFactory {
  createContext(): Promise<DBContextWithRepositoryFactory>;
}

