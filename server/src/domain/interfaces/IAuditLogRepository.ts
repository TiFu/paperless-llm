import { AuditEntry, AuditStatus } from '../../domain/entities/AuditEntry';
import { JobType } from '../../domain/enums/JobType';
import { ActionType } from '../../domain/enums/ActionType';

export interface IAuditLogRepository {
  /**
   * Insert a new audit log entry
   * @param documentId Document ID
   * @param documentSystem Document management system identifier
   * @param jobType Type of job
   * @param actionType Type of action
   * @param beforeValue Value before the action
   * @param afterValue Value after the action
   * @param status Status of the action
   * @param errorMessage Error message if failed
   * @returns Created audit entry
   */
  insert(
    documentId: string,
    documentSystem: string,
    jobType: JobType,
    actionType: ActionType,
    beforeValue: string | null,
    afterValue: string,
    status: AuditStatus,
    errorMessage?: string | null,
  ): Promise<AuditEntry>;

  /**
   * Get audit entries for a document
   * @param documentId Document ID
   * @returns Array of audit entries for the document
   */
  getByDocumentId(documentId: string): Promise<AuditEntry[]>;

  /**
   * Get all audit entries
   * @param limit Maximum number of entries to return
   * @param offset Offset for pagination
   * @returns Array of audit entries
   */
  getAll(limit: number, offset: number): Promise<AuditEntry[]>;
}
