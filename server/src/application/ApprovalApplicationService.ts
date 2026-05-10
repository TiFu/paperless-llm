import { UserInteractionStep } from "../domain/steps/userinteraction/UserInteractionStep";
import { TransactionManager } from "../infrastructure/TransactionManager";
import { IDocumentManagementSystem } from "../domain/document/IDocumentManagementSystem";
import { DocumentAction } from "../domain/actions/DocumentAction";
import { Cursor, encodeCursor } from "../domain/common/Cursor";
import { getLogger } from "../utils/logger";
import { WorkflowOrchestratorService } from "./WorkflowOrchestratorService";

const logger = getLogger();

/**
 * Enriched approval item with full context for UI display
 */
export interface ApprovalItem {
  stepId: string;
  jobId: string;
  documentId: string;
  documentTitle: string;
  documentContent: string;
  jobType: string;
  proposedActions: Array<{
    actionType: string;
    oldValue: string;
    newValue: string;
  }>;
  possibleDecisions: string[];
  createdAt: Date;
}

/**
 * ApprovalApplicationService - handles user approval/rejection of interactive steps.
 * Application service that orchestrates approval processing with transaction management.
 */
export class ApprovalApplicationService {
  constructor(
    private readonly txManager: TransactionManager,
    private readonly workflowOrchestratorService: WorkflowOrchestratorService,
    private readonly dmsService: IDocumentManagementSystem,
  ) {}

  /**
   * List all pending approval items with full context.
   * Fetches steps, jobs, and document details to provide complete information.
   * @param limit Maximum number of items to return
   * @param cursor Optional cursor for pagination
   * @returns Object with approval items and next cursor for pagination
   */
  async listPendingApprovals(
    limit: number = 50, 
    cursor?: Cursor
  ): Promise<{ items: ApprovalItem[]; nextCursor: string | null }> {
    await using context = await this.txManager.createContext();
    
    try {
      await context.start();
      const repos = context.getRepositoryRegistry();

      // Get pending user interaction steps with cursor support
      const steps = await repos.getSteps().getPendingUserInteractionSteps(limit, cursor);

      // Load jobs for all steps
      const jobPromises = steps.map((step) => repos.getJobs().getById(step.getJobId()));
      const jobs = await Promise.all(jobPromises);

      // Fetch document details from DMS for all documents
      const documentPromises = jobs.map((job) => 
        job ? this.dmsService.getDocument(job.documentId) : null
      );
      const documents = await Promise.all(documentPromises);

      await context.commit();

      // Build enriched approval items
      const approvalItems: ApprovalItem[] = [];
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const job = jobs[i];
        const document = documents[i];

        if (!job || !document) {
          logger.warn({ stepId: step.getStepId() }, 'Skipping approval item - missing job or document');
          continue;
        }

        approvalItems.push({
          stepId: step.getStepId() as string,
          jobId: job.id,
          documentId: job.documentId,
          documentTitle: document.title || "",
          documentContent: document.content.substring(0, 500), // Preview only
          jobType: job.jobType,
          proposedActions: job.documentActions.map(action => ({
            actionType: action.actionType,
            oldValue: action.oldValue,
            newValue: action.newValue,
          })),
          possibleDecisions: step.getPossibleDecisions(),
          createdAt: job.createdAt,
        });
      }

      // Calculate next cursor from last item
      const nextCursor = approvalItems.length > 0 
        ? encodeCursor({ stepId: approvalItems[approvalItems.length - 1].stepId })
        : null;

      return { items: approvalItems, nextCursor };

    } catch (error) {
      logger.error({ error }, 'Failed to list pending approvals');
      await context.rollback();
      throw error;
    } finally {
      await context.dispose();
    }
  }

  /**
   * Process user approval/rejection for an interactive step.
   * @param stepId The step ID awaiting approval
   * @param decision User's decision data (e.g., "APPROVED" or "REJECTED")
   */
  async processApprovalDecision(stepId: string, decision: string): Promise<void> {
    const context = await this.txManager.createContext();
    
    try {
      await context.start();
      const repos = context.getRepositoryRegistry();

      // Load step
      const step = await repos.getSteps().getById(stepId);
      if (!step) {
        throw new Error(`Step ${stepId} not found`);
      }

      // Load job
      const job = await repos.getJobs().getById(step.getJobId());
      if (!job) {
        throw new Error(`Job ${step.getJobId()} not found`);
      }

      logger.info(
        {
          stepId,
          stepType: step.getStepType(),
          decision,
        },
        'Processing approval decision',
      );

      // Verify it's a user interaction step
      if (!(step instanceof UserInteractionStep)) {
        throw new Error(
          `Step ${stepId} (${step.getStepType()}) is not a user interaction step`,
        );
      }

      // Process user decision (domain logic)
      const result = await step.processUserDecision(decision);
      job.addDocumentActions(result.actions);

      await this.workflowOrchestratorService.advanceToNextStep(job, result.transition, context);
      // Persist changes
      await repos.getJobs().update(job);
      await repos.getSteps().update(step);

      await context.commit();

      logger.info(
        {
          stepId,
          transition: result.transition,
          actionsCount: result.actions.length,
        },
        'Approval processed',
      );

    } catch (error) {
      logger.error({ error, stepId, decision }, 'Failed to process approval');
      await context.rollback();
      throw error;
    } finally {
      await context.dispose();
    }
  }
}
