import { Pool, PoolClient } from 'pg';
import { PostgreSQLLLMWorkQueueRepository } from '../repositories/postgresql/PostgreSQLLLMWorkQueueRepository';
import { PostgreSQLDocumentUpdateWorkQueueRepository } from '../repositories/postgresql/PostgreSQLDocumentUpdateWorkQueueRepository';
import { PostgreSQLPromptsRepository } from '../repositories/postgresql/PostgreSQLPromptsRepository';
import { PostgreSQLAuditLogRepository } from '../repositories/postgresql/PostgreSQLAuditLogRepository';
import { PostgreSQLApprovalQueueRepository } from '../repositories/postgresql/PostgreSQLApprovalQueueRepository';
import { PostgreSQLJobRepository } from '../repositories/postgresql/PostgreSQLJobRepository';
import { PostgreSQLStepRepository } from '../repositories/postgresql/PostgreSQLStepRepository';
import { PostgreSQLActionLogRepository } from '../repositories/postgresql/PostgreSQLActionLogRepository';
import { ILLMWorkQueueRepository } from '../domain/llm/ILLMWorkQueueRepository';
import { IDocumentUpdateWorkQueueRepository } from '../domain/steps/queues/IDocumentUpdateWorkQueueRepository';
import { IPromptsRepository } from '../domain/prompt/IPromptsRepository';
import { IAuditLogRepository } from '../domain/audit/IAuditLogRepository';
import { IApprovalQueueRepository } from '../domain/steps/queues/IApprovalQueueRepository';
import { IJobRepository } from '../domain/job/IJobRepository';
import { IStepRepository } from '../domain/steps/IStepRepository';
import { IActionLogRepository } from '../domain/interfaces/IActionLogRepository';

/**
 * Registry of repositories.
 * Accepts either a Pool (for non-transactional access) or PoolClient (for transactional access).
 */
export class RepositoryRegistry {
  private readonly _llmWorkQueue: ILLMWorkQueueRepository;
  private readonly _documentUpdateQueue: IDocumentUpdateWorkQueueRepository;
  private readonly _prompts: IPromptsRepository;
  private readonly _auditLog: IAuditLogRepository;
  private readonly _approvalQueue: IApprovalQueueRepository;
  private readonly _jobs: IJobRepository;
  private readonly _steps: IStepRepository;
  private readonly _actionLog: IActionLogRepository;

  constructor(poolOrClient: Pool | PoolClient) {
    // Create repository instances
    // Pass the pool or client directly - repositories handle both
    this._llmWorkQueue = new PostgreSQLLLMWorkQueueRepository(poolOrClient as Pool);
    this._documentUpdateQueue = new PostgreSQLDocumentUpdateWorkQueueRepository(
      poolOrClient as Pool,
    );
    this._prompts = new PostgreSQLPromptsRepository(poolOrClient as Pool);
    this._auditLog = new PostgreSQLAuditLogRepository(poolOrClient as Pool);
    this._approvalQueue = new PostgreSQLApprovalQueueRepository(poolOrClient as Pool);
    this._jobs = new PostgreSQLJobRepository(poolOrClient as Pool);
    this._steps = new PostgreSQLStepRepository(poolOrClient);
    this._actionLog = new PostgreSQLActionLogRepository(poolOrClient);
  }

  getLLMWorkQueue(): ILLMWorkQueueRepository {
    return this._llmWorkQueue;
  }

  getDocumentUpdateQueue(): IDocumentUpdateWorkQueueRepository {
    return this._documentUpdateQueue;
  }

  getPrompts(): IPromptsRepository {
    return this._prompts;
  }

  getAuditLog(): IAuditLogRepository {
    return this._auditLog;
  }

  getApprovalQueue(): IApprovalQueueRepository {
    return this._approvalQueue;
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
}
