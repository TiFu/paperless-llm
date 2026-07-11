
import { StepStatus } from '../domain/steps/IStep.js';
import { StepWithJob } from '../domain/steps/IStepRepository.js';
import { UoWFactory } from '../infrastructure/UoW.js';
import { getLogger } from '../utils/logger.js';
import { DocumentEnriched, enrichAllWithDocument } from './util/documentEnrichment.js';
import { UserContext } from '../domain/auth/UserContext.js';
import { AuditLogEntry } from '../domain/audit/AuditLogEntry.js';

/**
 * Queue statistics response
 */
export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  inFallout: number;
}

/**
 * Queue item response with unified schema for all automated steps
 */
export interface QueueItem {
  id: string;
  jobId: string;
  documentId: number;
  stepType: string;
  jobType: string;
  status: string; // WorkItemStatus from frontend enum
  retryCount: number;
  retryAfter: Date | null;
  claimedBy: string | null;
  claimedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
  // Additional context
  jobState: string;
  // Present only when requested via includeAuditLog
  auditLog?: AuditLogEntry[];
}

export type QueueItemWithDocument = DocumentEnriched<QueueItem>;

/**
 * QueueApplicationService - provides queue statistics and listings for automated steps.
 * Application service that manages transaction context for queue queries.
 */

export class QueueApplicationService {
  constructor(
    private readonly uowFactory: UoWFactory,
  ) {}

  async getQueueStats(user: UserContext): Promise<QueueStats> {
    const logger = getLogger();

    try {
      await using context = await this.uowFactory.createUoW(user);
      await context.start();
      const stats = await context.getSteps().getAutomatedStepStatistics();
      await context.commit();

      return {
        total: stats.total,
        pending: stats.waiting,
        processing: stats.inProgress,
        completed: stats.completed,
        failed: stats.failed,
        inFallout: stats.inFallout,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get queue statistics');
      throw error;
    }
  }

  /**
   * List automated steps in queue with pagination
   * @param limit Maximum number of items to return (capped at 100)
   * @param cursor Optional cursor for pagination (step ID)
   * @param status Optional filter by status (WorkItemStatus enum values)
   * @param includeAuditLog When true, embed each item's audit log entries (opt-in; not needed by most callers)
   * @returns Paginated list of queue items
   */
  async getQueueItems(
    user: UserContext,
    limit: number,
    cursor?: string,
    status?: string,
    includeAuditLog: boolean = false
  ): Promise<{ items: QueueItemWithDocument[]; nextCursor: string | null }> {
    const logger = getLogger();

    try {
      await using context = await this.uowFactory.createUoW(user);
      await context.start();

      const stepStatus = this.mapWorkItemStatusToStepStatus(status);
      logger.info({ limit, cursor, stepStatus }, 'Requesting automated steps for queue');
      const result = await context.getSteps().listAutomatedStepsWithJob(limit, cursor, stepStatus);
      const dms = await context.getDMS()

      const items = result.items.map((step) => this.mapStepToQueueItem(step));

      if (includeAuditLog) {
        const auditLogEntries = await context.getAuditLog().getByStepIds(items.map((item) => item.id));
        const auditLogByStepId = new Map<string, AuditLogEntry[]>();
        for (const entry of auditLogEntries) {
          if (!entry.stepId) continue;
          const existing = auditLogByStepId.get(entry.stepId);
          if (existing) {
            existing.push(entry);
          } else {
            auditLogByStepId.set(entry.stepId, [entry]);
          }
        }
        for (const item of items) {
          item.auditLog = auditLogByStepId.get(item.id) ?? [];
        }
      }

      await context.commit();

      const enrichedItems = await enrichAllWithDocument(items, dms);

      return {
        items: enrichedItems,
        nextCursor: result.nextCursor,
      };
    } catch (error) {
      logger.error({ error, limit, cursor, status }, 'Failed to list queue items');
      throw error;
    }
  }

  /**
   * Map WorkItemStatus (frontend enum) to StepStatus (domain enum)
   * @param status WorkItemStatus value or undefined
   * @returns StepStatus or undefined
   */
  private mapWorkItemStatusToStepStatus(status?: string): StepStatus | undefined {
    const map: Record<string, StepStatus> = {
      pending:    StepStatus.WAITING,
      processing: StepStatus.IN_PROGRESS,
      completed:  StepStatus.COMPLETED,
      failed:     StepStatus.FAILED,
      retrying:   StepStatus.RETRYING,
      in_fallout: StepStatus.IN_FALLOUT,
    };
    return status ? map[status] : undefined;
  }

  /**
   * Map StepWithJob domain object to QueueItem DTO
   * @param step Step with job information
   * @returns QueueItem for API response
   */
  private mapStepToQueueItem(step: StepWithJob): QueueItem {
    return {
      id: step.stepId,
      jobId: step.jobId,
      documentId: step.documentId,
      stepType: step.stepType,
      jobType: step.jobType,
      status: this.mapStepStatusToWorkItemStatus(step.stepStatus),
      retryCount: step.retryCount,
      retryAfter: null,
      claimedBy: null,
      claimedAt: null,
      createdAt: step.stepCreatedAt,
      updatedAt: step.stepStartedAt || step.stepCompletedAt || null,
      jobState: step.jobState,
    };
  }

  /**
   * Map StepStatus (domain enum) to WorkItemStatus (frontend enum)
   * @param status StepStatus value
   * @returns WorkItemStatus string
   */
  private mapStepStatusToWorkItemStatus(status: StepStatus): string {
    switch (status) {
      case StepStatus.WAITING:
        return 'pending';
      case StepStatus.IN_PROGRESS:
        return 'processing';
      case StepStatus.COMPLETED:
        return 'completed';
      case StepStatus.FAILED:
        return 'failed';
      case StepStatus.RETRYING:
        return 'retrying';
      case StepStatus.IN_FALLOUT:
        return 'in_fallout';
    }
  }
}
