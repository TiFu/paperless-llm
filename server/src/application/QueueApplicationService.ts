import { StepStatus } from '../domain/steps/IStep.js';
import { StepWithJob } from '../domain/steps/IStepRepository.js';
import { UoWFactory } from '../infrastructure/UoW.js';
import { getLogger } from '../utils/logger.js';
import { PaperlessService } from '../services/PaperlessService.js';
import { enrichWithDocument, DocumentEnriched, enrichAllWithDocument } from './util/documentEnrichment.js';
import { IDocumentManagementSystem } from '../domain/document/IDocumentManagementSystem.js';

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
  retryAfter: string | null;
  claimedBy: string | null;
  claimedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  // Additional context
  jobState: string;
}

export type QueueItemWithDocument = DocumentEnriched<QueueItem>;

/**
 * QueueApplicationService - provides queue statistics and listings for automated steps.
 * Application service that manages transaction context for queue queries.
 */
export class QueueApplicationService {
  constructor(private readonly uowFactory: UoWFactory, private paperlessService: IDocumentManagementSystem
) {}

  /**
   * Get queue statistics for all automated steps
   * @returns Aggregated statistics by status
   */
  async getQueueStats(): Promise<QueueStats> {
    const logger = getLogger();

    try {
      await using context = await this.uowFactory.createUoW();
      await context.start();

      const stats = await context.getSteps().getAutomatedStepStatistics();

      await context.commit();

      // Map StepStatus counts to WorkItemStatus names expected by frontend
      return {
        total: stats.total,
        pending: stats.waiting, // WAITING -> pending
        processing: stats.inProgress, // IN_PROGRESS -> processing
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
   * @returns Paginated list of queue items
   */
  async getQueueItems(
    limit: number,
    cursor?: string,
    status?: string
  ): Promise<{ items: QueueItemWithDocument[]; nextCursor: string | null }> {
    const logger = getLogger();

    try {
      await using context = await this.uowFactory.createUoW();
      await context.start();

      // Map WorkItemStatus to StepStatus for repository query
      const stepStatus = this.mapWorkItemStatusToStepStatus(status);
      logger.info({ "limit": limit, "cursor": cursor, "stepStatus": stepStatus},"Requesting automated steps for queue")
      const result = await context.getSteps().listAutomatedStepsWithJob(
        limit,
        cursor,
        stepStatus
      );

      await context.commit();

      // Map StepWithJob domain objects to QueueItem DTOs
      const items = result.items.map((step) => this.mapStepToQueueItem(step));

      // Enrich with document metadata if service provided
      let enrichedItems: QueueItemWithDocument[];
      enrichedItems = await enrichAllWithDocument(items, this.paperlessService);

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
    console.log("Mapping " + status)
    if (!status) {
      return undefined;
    }

    const result = Object.values(StepStatus).includes(status as StepStatus) ? status as StepStatus : undefined;
    //const result: StepStatus | undefined = (<any> StepStatus)[status]
    console.log("Mapped " + result)
    return result;
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
      case StepStatus.RETRYING:
        return 'retrying';
      case StepStatus.IN_FALLOUT:
        return 'in_fallout';
    }
  }
}
