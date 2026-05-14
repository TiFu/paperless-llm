import { AuditLogEntry } from '../domain/audit/AuditLogEntry.js';
import { TransactionManager } from '../infrastructure/TransactionManager.js';
import { createChildLogger } from '../utils/logger.js';
import pino from 'pino';

export interface JobTransition {
  jobId: string;
  oldState: string;
  newState: string;
  isTerminal: boolean;
}

/**
 * AuditLogApplicationService - centralized service for logging all job and step lifecycle events
 * 
 * This service provides helper methods for each event type and handles:
 * - Creating AuditLogEntry entities with appropriate metadata
 * - Persisting entries via the repository within transactions
 * - Error handling to ensure audit failures don't crash workflows
 */
export class AuditLogApplicationService {
  private readonly logger: pino.Logger;

  constructor(private readonly txManager: TransactionManager) {
    this.logger = createChildLogger({ service: "AuditLogApplicationService" })
  }

  async getAuditLogForJobById(jobId: string): Promise<AuditLogEntry[]> {
    try {
      const context = await this.txManager.createContext();
      await context.start();
      const result = await context.getRepositoryRegistry().getAuditLog().getByJobId(jobId);
      return result
    } catch (error) {
      this.logger.error({ error}, "Failed to fetch audit log items")
      throw error
    }
  }

  async createEntry(entry: AuditLogEntry): Promise<void> {
    return this.createAllEntries([entry])
  }

  async createAllEntries(entries: AuditLogEntry[]): Promise<void> {
    const context = await this.txManager.createContext();
    try {
      context.start();

      const auditLog = context.getRepositoryRegistry().getAuditLog();
      await auditLog.createAll(entries)

      context.commit();
    } catch (error) {
      this.logger.error({ error: error, auditEntries: entries }, "Failed to create audit logs")
      return;
    }
  }

}
