import { PoolClient } from 'pg';
import { PostgreSQLPromptsRepository } from './PostgreSQLPromptsRepository.js';
import { PostgreSQLJobRepository } from './PostgreSQLJobRepository.js';
import { PostgreSQLStepRepository } from './PostgreSQLStepRepository.js';
import { PostgreSQLAuditLogRepository } from './PostgreSQLAuditLogRepository.js';
import { IPromptsRepository } from '../../domain/prompt/IPromptsRepository.js';
import { IJobRepository } from '../../domain/job/IJobRepository.js';
import { IStepRepository } from '../../domain/steps/IStepRepository.js';
import { IAuditLogRepository } from '../../domain/audit/IAuditLogRepository.js';
import { UoW } from '../../infrastructure/UoW.js';


/**
 * Registry of repositories.
 * Accepts either a Pool (for non-transactional access) or PoolClient (for transactional access).
 */
export class PostgresqlRepositoryRegistry {
  private readonly _prompts: IPromptsRepository;
  private readonly _jobs: IJobRepository;
  private readonly _steps: IStepRepository;
  private readonly _auditLog: IAuditLogRepository;

  constructor(poolOrClient: PoolClient, uow: UoW) {
    // Create repository instances
    // Pass the pool or client directly - repositories handle both
    this._prompts = new PostgreSQLPromptsRepository(poolOrClient, uow);
    this._jobs = new PostgreSQLJobRepository(poolOrClient, uow);
    this._steps = new PostgreSQLStepRepository(poolOrClient, uow);
    this._auditLog = new PostgreSQLAuditLogRepository(poolOrClient);
  }

  getPrompts(): IPromptsRepository {
    return this._prompts;
  }

  getJobs(): IJobRepository {
    return this._jobs;
  }

  getSteps(): IStepRepository {
    return this._steps;
  }

  getAuditLog(): IAuditLogRepository {
    return this._auditLog;
  }
}
