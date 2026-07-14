import { AuditLogEntry } from '../domain/audit/AuditLogEntry.js';
import { UoWFactory } from '../infrastructure/UoW.js';
import { createChildLogger } from '../utils/logger.js';
import { LogArea } from '../utils/LogArea.js';
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
    this.logger = createChildLogger(LogArea.WORKFLOW, "AuditLogApplicationService");
  }

  async getAuditLogForJobById(jobId: string): Promise<AuditLogEntry[]> {
    try {
      await using context = await this.uowFactory.createSystemUoW();
      await context.start();
      const result = await context.getAuditLog().getByJobId(jobId);
      return result
    } catch (error) {
      this.logger.error({ error}, "Failed to fetch audit log items")
      throw error
    }
  }

  /**
   * Get audit log entries for a specific step
   * @param stepId The step ID to fetch audit logs for
   * @returns Array of audit log entries ordered by event_timestamp DESC
   */
  async getAuditLogForStep(stepId: string): Promise<AuditLogEntry[]> {
    try {
      await using context = await this.uowFactory.createSystemUoW();
      await context.start();
      const result = await context.getAuditLog().getByStepId(stepId);
      return result;
    } catch (error) {
      this.logger.error({ error }, "Failed to fetch audit log items for step");
      throw error;
    }
  }
}
