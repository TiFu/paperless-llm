import { TransactionManager } from '../infrastructure/TransactionManager';
import { StepStatus } from '../domain/steps/IStep';
import { StepWithJob } from '../domain/steps/IStepRepository';
import { getLogger } from '../utils/logger';

const logger = getLogger();

/**
 * Queue statistics response
 */
export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

/**
 * Queue item response with unified schema for all automated steps
 */
export interface QueueItem {
  id: string;
  jobId: string;
  documentId: string;
  stepType: string;
  jobType: string;
  status: string; // WorkItemStatus from frontend enum
  retryCount: number;
  retryAfter: string | null;
  claimedBy: string | null;
  claimedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  // Additional context
  jobState: string;
}

/**
 * QueueApplicationService - provides queue statistics and listings for automated steps.
 * Application service that manages transaction context for queue queries.
 */
export class QueueApplicationService {
  constructor(private readonly txManager: TransactionManager) {}

  /**
   * Get queue statistics for all automated steps
   * @returns Aggregated statistics by status
   */
  async getQueueStats(): Promise<QueueStats> {
    const context = await this.txManager.createContext();

    try {
      await context.start();
      const repos = context.getRepositoryRegistry();

      const stats = await repos.getSteps().getAutomatedStepStatistics();

      await context.commit();

      // Map StepStatus counts to WorkItemStatus names expected by frontend
      return {
        total: stats.total,
        pending: stats.waiting, // WAITING -> pending
        processing: stats.inProgress, // IN_PROGRESS -> processing
        completed: stats.completed,
        failed: stats.failed,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get queue statistics');
      await context.rollback();
      throw error;
    } finally {
      await context.dispose();
    }
  }

  /**
   * List automated steps in queue with pagination
   * @param limit Maximum number of items to return (capped at 100)
   * @param cursor Optional cursor for pagination (step ID)
   * @param status Optional filter by status (WorkItemStatus enum values)
   * @returns Paginated list of queue items
   */
  async getQueueItems(
    limit: number,
    cursor?: string,
    status?: string
  ): Promise<{ items: QueueItem[]; nextCursor: string | null }> {
    const context = await this.txManager.createContext();

    try {
      await context.start();
      const repos = context.getRepositoryRegistry();

      // Map WorkItemStatus to StepStatus for repository query
      const stepStatus = this.mapWorkItemStatusToStepStatus(status);

      const result = await repos.getSteps().listAutomatedStepsWithJob(
        limit,
        cursor,
        stepStatus
      );

      await context.commit();

      // Map StepWithJob domain objects to QueueItem DTOs
      const items = result.items.map((step) => this.mapStepToQueueItem(step));

      return {
        items,
        nextCursor: result.nextCursor,
      };
    } catch (error) {
      logger.error({ error, limit, cursor, status }, 'Failed to list queue items');
      await context.rollback();
      throw error;
    } finally {
      await context.dispose();
    }
  }

  /**
   * Map WorkItemStatus (frontend enum) to StepStatus (domain enum)
   * @param status WorkItemStatus value or undefined
   * @returns StepStatus or undefined
   */
  private mapWorkItemStatusToStepStatus(status?: string): StepStatus | undefined {
    if (!status) {
      return undefined;
    }

    switch (status) {
      case 'pending':
        return StepStatus.WAITING;
      case 'processing':
        return StepStatus.IN_PROGRESS;
      case 'completed':
        return StepStatus.COMPLETED;
      case 'failed':
        return StepStatus.FAILED;
      default:
        return undefined;
    }
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
      retryCount: 0, // Steps don't have retry mechanism yet
      retryAfter: null,
      claimedBy: null,
      claimedAt: null,
      createdAt: step.stepCreatedAt.toISOString(),
      updatedAt: step.stepStartedAt?.toISOString() || step.stepCompletedAt?.toISOString() || null,
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
      default:
        return 'pending';
    }
  }
}
