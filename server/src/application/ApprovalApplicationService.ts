import { ManualStep } from "../domain/steps/userinteraction/ManualStep.js";
import { TransactionManager } from "../infrastructure/TransactionManager.js";

import { DocumentAction } from "../domain/actions/DocumentAction.js";
import { Cursor, encodeCursor } from "../domain/common/Cursor.js";
import { getLogger } from "../utils/logger.js";
import { WorkflowOrchestratorService } from "./WorkflowOrchestratorService.js";
import { AuditLogApplicationService } from "./AuditLogApplicationService.js";
import { AuditLogEntry } from "../domain/audit/AuditLogEntry.js";

/**
 * Enriched approval item with full context for UI display
 */
export interface ApprovalItem {
  stepId: string;
  jobId: string;
  documentId: string;
  paperlessUrl: string;
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
 * Statistics for pending approvals
 */
export interface ApprovalStats {
  pendingCount: number;
}

/**
 * ApprovalApplicationService - handles user approval/rejection of interactive steps.
 * Application service that orchestrates approval processing with transaction management.
 */
export class ApprovalApplicationService {
  constructor(
    private readonly txManager: TransactionManager,
    private readonly paperlessBaseUrl: string,
    private readonly auditLogService: AuditLogApplicationService
  ) {}

  /**
   * Get statistics for pending approvals.
   * @returns Object with count of pending approvals
   */
  async getApprovalStats(): Promise<ApprovalStats> {
    const logger = getLogger();
    await using context = await this.txManager.createContext();
    
    try {
      await context.start();
      const repos = context.getRepositoryRegistry();
      
      const pendingCount = await repos.getSteps().countPendingUserInteractionSteps();
      
      await context.commit();
      
      return { pendingCount };
    } catch (error) {
      logger.error({ error }, 'Failed to get approval stats');
      await context.rollback();
      throw error;
    } finally {
      await context.dispose();
    }
  }

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
  ): Promise<{ items: ApprovalItem[]; nextCursor: string | null }> {    const logger = getLogger();    await using context = await this.txManager.createContext();
    
    try {
      await context.start();
      const repos = context.getRepositoryRegistry();

      // Get pending user interaction steps with cursor support
      const steps = await repos.getSteps().getPendingUserInteractionSteps(limit, cursor);

      // Load jobs for all steps
      const jobPromises = steps.map((step) => repos.getJobs().getById(step.getJobId()));
      const jobs = await Promise.all(jobPromises);

      await context.commit();

      // Build enriched approval items
      const approvalItems: ApprovalItem[] = [];
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const job = jobs[i];

        if (!job) {
          logger.warn({ stepId: step.getStepId() }, 'Skipping approval item - missing job');
          continue;
        }

        approvalItems.push({
          stepId: step.getStepId() as string,
          jobId: job.id,
          documentId: job.documentId,
          paperlessUrl: `${this.paperlessBaseUrl}/documents/${job.documentId}`,
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
    const logger = getLogger();
    const context = await this.txManager.createContext();
    let jobId = null;
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
      jobId = job.id

      logger.info(
        {
          stepId,
          stepType: step.getStepType(),
          decision,
        },
        'Processing approval decision',
      );

      // Verify it's a user interaction step
      if (!(step instanceof ManualStep)) {
        throw new Error(
          `Step ${stepId} (${step.getStepType()}) is not a user interaction step`,
        );
      }
      // Process user decision (domain logic)
      const result = await step.processUserDecision(decision);
      job.addDocumentActions(result.actions);

      const workflowOrchestratorService = new WorkflowOrchestratorService(this.auditLogService, context)
      await workflowOrchestratorService.advanceToNextStep(
        job, 
        result.transition
      );
      
      // Persist changes
      await repos.getJobs().update(job);
      await repos.getSteps().update(step);

      await context.commit();

      // Now that decision has been processed, we can log the event
      const entry = AuditLogEntry.createDecisionEntry(step, { decision: decision}, new Date())
      this.auditLogService.createEntry(entry)

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
      const entry = AuditLogEntry.createError(jobId as any, stepId, { message: "" + error})
      this.auditLogService.createEntry(entry)
      throw error;
    } finally {
      await context.dispose();
    }
  }
}
