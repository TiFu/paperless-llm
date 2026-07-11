import { AuditLogEntry } from './AuditLogEntry.js';

export interface IAuditCollector {
  record(entry: AuditLogEntry): void;
  recordAll(entry: AuditLogEntry[]): void;

  getEvents(): AuditLogEntry[];
  clear(): void;
}

/**
 * Repository interface for audit log persistence
 */
export interface IAuditLogRepository {
  /**
   * Create a new audit log entry
   * @param entry The audit log entry to persist
   * @returns The created audit log entry
   */
  create(entry: AuditLogEntry): Promise<void>;

  createAll(entry: AuditLogEntry[]): Promise<void>;
  
  /**
   * Get all audit log entries for a specific job
   * @param jobId The job ID to fetch audit logs for
   * @returns Array of audit log entries ordered by event_timestamp DESC
   */
  getByJobId(jobId: string): Promise<AuditLogEntry[]>;

  /**
   * Get all audit log entries for a specific step
   * @param stepId The step ID to fetch audit logs for
   * @returns Array of audit log entries ordered by event_timestamp DESC
   */
  getByStepId(stepId: string): Promise<AuditLogEntry[]>;

  /**
   * Get all audit log entries for a set of steps in a single query
   * @param stepIds The step IDs to fetch audit logs for
   * @returns Array of audit log entries ordered by event_timestamp DESC
   */
  getByStepIds(stepIds: string[]): Promise<AuditLogEntry[]>;

  /**
   * Delete all audit log entries for a job
   * Typically called when a job is deleted (though CASCADE should handle this)
   * @param jobId The job ID to delete audit logs for
   */
  deleteByJobId(jobId: string): Promise<void>;
}
