import { AuditLogEntry } from '../domain/audit/AuditLogEntry.js';
import { UoWFactory } from '../infrastructure/UoW.js';
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

  constructor(private readonly uowFactory: UoWFactory) {
    this.logger = createChildLogger({ service: "AuditLogApplicationService" })
  }

  async getAuditLogForJobById(jobId: string): Promise<AuditLogEntry[]> {
    try {
      await using context = await this.uowFactory.createUoW();
      await context.start();
      const result = await context.getAuditLog().getByJobId(jobId);
      return result
    } catch (error) {
      this.logger.error({ error}, "Failed to fetch audit log items")
      throw error
    }
  }
}
