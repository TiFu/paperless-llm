import { PoolClient } from 'pg';
import { PostgreSQLPromptsRepository } from '../repositories/postgresql/PostgreSQLPromptsRepository.js';
import { PostgreSQLJobRepository } from '../repositories/postgresql/PostgreSQLJobRepository.js';
import { PostgreSQLStepRepository } from '../repositories/postgresql/PostgreSQLStepRepository.js';
import { PostgreSQLActionLogRepository } from '../repositories/postgresql/PostgreSQLActionLogRepository.js';
import { PostgreSQLAuditLogRepository } from '../repositories/postgresql/PostgreSQLAuditLogRepository.js';
import { IPromptsRepository } from '../domain/prompt/IPromptsRepository.js';
import { IJobRepository } from '../domain/job/IJobRepository.js';
import { IStepRepository } from '../domain/steps/IStepRepository.js';
import { IActionLogRepository } from '../domain/actions/IActionLogRepository.js';
import { IAuditLogRepository } from '../domain/audit/IAuditLogRepository.js';

/**
 * Registry of repositories.
 * Accepts either a Pool (for non-transactional access) or PoolClient (for transactional access).
 */
export class RepositoryRegistry {
  private readonly _prompts: IPromptsRepository;
  private readonly _jobs: IJobRepository;
  private readonly _steps: IStepRepository;
  private readonly _actionLog: IActionLogRepository;
  private readonly _auditLog: IAuditLogRepository;

  constructor(poolOrClient: PoolClient) {
    // Create repository instances
    // Pass the pool or client directly - repositories handle both
    this._prompts = new PostgreSQLPromptsRepository(poolOrClient);
    this._jobs = new PostgreSQLJobRepository(poolOrClient);
    this._steps = new PostgreSQLStepRepository(poolOrClient);
    this._actionLog = new PostgreSQLActionLogRepository(poolOrClient);
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

  getActionLog(): IActionLogRepository {
    return this._actionLog;
  }

  getAuditLog(): IAuditLogRepository {
    return this._auditLog;
  }
}
