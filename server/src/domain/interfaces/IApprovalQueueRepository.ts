import { ActionType } from '../enums/ActionType';

export interface ApprovalQueueItem {
  id: string;
  jobId: string;
  documentId: string;
  documentSystem: string;
  actionType: ActionType;
  actionPayload: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
}

export interface IApprovalQueueRepository {
  /**
   * Insert a new item into the approval queue
   */
  insert(
    jobId: string,
    documentId: string,
    documentSystem: string,
    actionType: ActionType,
    actionPayload: Record<string, unknown>,
  ): Promise<void>;

  /**
   * Get all pending approval items
   */
  getPending(): Promise<ApprovalQueueItem[]>;

  /**
   * Get an approval item by ID
   */
  getById(id: string): Promise<ApprovalQueueItem | null>;

  /**
   * Get approval item by job ID (any status)
   */
  getByJobId(jobId: string): Promise<ApprovalQueueItem | null>;

  /**
   * Mark an approval item as approved
   */
  markApproved(id: string, reviewedBy: string): Promise<void>;

  /**
   * Mark an approval item as rejected
   */
  markRejected(id: string, reviewedBy: string, reason: string): Promise<void>;
}
