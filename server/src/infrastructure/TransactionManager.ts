import { IPromptsRepository } from '../domain/prompt/IPromptsRepository.js';
import { IJobRepository } from '../domain/job/IJobRepository.js';
import { IStepRepository } from '../domain/steps/IStepRepository.js';
import { IAuditLogRepository } from '../domain/audit/IAuditLogRepository.js';
import { UoW } from './UoW.js';

/**
 * Represents a database transaction context.
 * Manages transaction lifecycle and provides access to repositories.
 */
export interface DatabaseTransactionContext {
  start(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  dispose(): Promise<void>;
  getClient(): any
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
}

export type DBContextWithRepositoryFactory = { ctx: DatabaseTransactionContext, repositoryFactory: RepositoryRegistryFactory}
export interface DatabaseTransactionContextFactory {
  createContext(): Promise<DBContextWithRepositoryFactory>;
}

