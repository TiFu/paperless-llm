import { Pool, PoolClient } from 'pg';
import { PostgreSQLLLMWorkQueueRepository } from '../repositories/postgresql/PostgreSQLLLMWorkQueueRepository';
import { PostgreSQLDocumentUpdateWorkQueueRepository } from '../repositories/postgresql/PostgreSQLDocumentUpdateWorkQueueRepository';
import { PostgreSQLPromptsRepository } from '../repositories/postgresql/PostgreSQLPromptsRepository';
import { PostgreSQLAuditLogRepository } from '../repositories/postgresql/PostgreSQLAuditLogRepository';
import { ILLMWorkQueueRepository } from '../domain/interfaces/ILLMWorkQueueRepository';
import { IDocumentUpdateWorkQueueRepository } from '../domain/interfaces/IDocumentUpdateWorkQueueRepository';
import { IPromptsRepository } from '../domain/interfaces/IPromptsRepository';
import { IAuditLogRepository } from '../domain/interfaces/IAuditLogRepository';

/**
 * Registry of repositories.
 * Accepts either a Pool (for non-transactional access) or PoolClient (for transactional access).
 */
export class RepositoryRegistry {
  private readonly _llmWorkQueue: ILLMWorkQueueRepository;
  private readonly _documentUpdateQueue: IDocumentUpdateWorkQueueRepository;
  private readonly _prompts: IPromptsRepository;
  private readonly _auditLog: IAuditLogRepository;

  constructor(poolOrClient: Pool | PoolClient) {
    // Create repository instances
    // Pass the pool or client directly - repositories handle both
    this._llmWorkQueue = new PostgreSQLLLMWorkQueueRepository(poolOrClient as Pool);
    this._documentUpdateQueue = new PostgreSQLDocumentUpdateWorkQueueRepository(
      poolOrClient as Pool,
    );
    this._prompts = new PostgreSQLPromptsRepository(poolOrClient as Pool);
    this._auditLog = new PostgreSQLAuditLogRepository(poolOrClient as Pool);
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
}
