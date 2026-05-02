import { ActionType } from '../../domain/enums/ActionType';
import { ActionItem } from '../../domain/entities/ActionItem';
import { WorkItemStatus } from '../../domain/enums/WorkItemStatus';

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface IDocumentUpdateWorkQueueRepository {
  /**
   * Claim a batch of action items for processing
   * @param batchSize Number of items to claim
   * @param workerId ID of the worker claiming the items
   * @param timeoutMs Timeout in milliseconds for claiming items
   * @returns Array of raw database rows
   */
  claimBatch(
    batchSize: number,
    workerId: string,
    timeoutMs: number,
  ): Promise<Record<string, unknown>[]>;

  /**
   * Insert a new action item into the queue
   * @param documentId Document ID to update
   * @param documentSystem Document management system identifier
   * @param actionType Type of action to perform
   * @param actionPayload Payload data for the action
   */
  insert(
    documentId: string,
    documentSystem: string,
    actionType: ActionType,
    actionPayload: Record<string, unknown>,
  ): Promise<void>;

  /**
   * Mark an action item as completed
   * @param id Action item ID
   */
  markCompleted(id: string): Promise<void>;

  /**
   * Mark an action item as failed and optionally schedule retry
   * @param id Action item ID
   * @param retryAfter When to retry (null if max retries exceeded)
   */
  markFailed(id: string, retryAfter: Date | null): Promise<void>;

  /**
   * Get an action item by ID
   * @param id Action item ID
   * @returns Action item or null if not found
   */
  getById(id: string): Promise<ActionItem | null>;

  /**
   * List action items with cursor-based pagination
   * @param limit Maximum number of items to return
   * @param cursor Optional cursor (id) to paginate from
   * @param status Optional status filter
   * @returns Array of action items and next cursor
   */
  list(limit: number, cursor?: string, status?: WorkItemStatus): Promise<{ items: ActionItem[]; nextCursor: string | null }>;

  /**
   * Get queue statistics
   * @returns Queue statistics grouped by status
   */
  getQueueStats(): Promise<QueueStats>;
}
