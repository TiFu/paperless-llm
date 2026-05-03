import { WorkItem } from '../../domain/entities/WorkItem';
import { JobType } from '../../domain/enums/JobType';
import { WorkItemStatus } from '../../domain/enums/WorkItemStatus';

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface ILLMWorkQueueRepository {
  /**
   * Claim a batch of work items for processing
   * @param batchSize Number of items to claim
   * @param workerId ID of the worker claiming the items
   * @param timeoutMs Timeout in milliseconds for claiming items
   * @returns Array of claimed work items
   */
  claimBatch(batchSize: number, workerId: string, timeoutMs: number): Promise<WorkItem[]>;

  /**
   * Insert a new work item into the queue
   * @param jobId Job ID for tracking
   * @param documentId Document ID to process
   * @param jobType Type of job to perform
   * @param requiresApproval Whether the job requires manual approval
   * @returns Created work item
   */
  insert(jobId: string, documentId: string, jobType: JobType, requiresApproval?: boolean): Promise<WorkItem>;

  /**
   * Mark a work item as completed
   * @param id Work item ID
   */
  markCompleted(id: string): Promise<void>;

  /**
   * Mark a work item as failed and optionally schedule retry
   * @param id Work item ID
   * @param retryAfter When to retry (null if max retries exceeded)
   */
  markFailed(id: string, retryAfter: Date | null): Promise<void>;

  /**
   * Get a work item by ID
   * @param id Work item ID
   * @returns Work item or null if not found
   */
  getById(id: string): Promise<WorkItem | null>;

  /**
   * Get a work item by job ID
   * @param jobId Job ID
   * @returns Work item or null if not found
   */
  getByJobId(jobId: string): Promise<WorkItem | null>;

  /**
   * List work items with cursor-based pagination
   * @param limit Maximum number of items to return
   * @param cursor Optional cursor (id) to paginate from
   * @param status Optional status filter
   * @returns Array of work items and next cursor
   */
  list(limit: number, cursor?: string, status?: WorkItemStatus): Promise<{ items: WorkItem[]; nextCursor: string | null }>;

  /**
   * Get queue statistics
   * @returns Queue statistics grouped by status
   */
  getQueueStats(): Promise<QueueStats>;
}
