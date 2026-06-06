import { ManualStep } from "../domain/steps/userinteraction/ManualStep.js";

import { Cursor, encodeCursor } from "../domain/common/Cursor.js";
import { createChildLogger } from "../utils/logger.js";
import { AuditLogEntry } from "../domain/audit/AuditLogEntry.js";
import { UoWFactory } from "../infrastructure/UoW.js";
import pino from "pino";
import { IDocument } from '../domain/document/IDocument.js';
import { IDocumentManagementSystem } from '../domain/document/IDocumentManagementSystem.js';
import { enrichAllWithDocument, DocumentEnriched } from './util/documentEnrichment.js';
import { DocumentActionFactory } from '../domain/actions/DocumentActionFactory.js';

/**
 * Enriched approval item with full context for UI display
 */
export interface ApprovalItem {
  stepId: string;
  jobId: string;
  documentId: number;
  paperlessUrl: string;
  jobType: string;
  proposedActions: Array<{
    id: string;
    actionType: string;
    fieldType: 'string' | 'tag' | 'correspondent' | 'document_type' | 'date';
    isMultiple: boolean;
    oldValue: string;
    newValue: string;
  }>;
  possibleDecisions: string[];
  createdAt: Date;
  document: IDocument | null;
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
export class ManualStepApplicationService {
  private logger: pino.Logger    

  constructor(
    private readonly uowFactory: UoWFactory,
    private readonly paperlessBaseUrl: string,
    private readonly dmsService: IDocumentManagementSystem,
  ) {
    this.logger = createChildLogger({name: "ManualStepApplicationService"})
  }

  /**
   * Get statistics for pending approvals.
   * @returns Object with count of pending approvals
   */
  async getApprovalStats(): Promise<ApprovalStats> {
    
    try {
      await using context = await this.uowFactory.createUoW();
      await context.start();
      
      const pendingCount = await context.getSteps().countPendingUserInteractionSteps();
      
      await context.commit();
      
      return { pendingCount };
    } catch (error) {
      this.logger.error({ error }, 'Failed to get approval stats');
      throw error;
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
  ): Promise<{ items: ApprovalItem[]; nextCursor: string | null }> {  
    try {
      await using context = await this.uowFactory.createUoW();
      await context.start();

      // Get pending user interaction steps with cursor support
      const steps = await context.getSteps().getPendingManualSteps(limit, cursor);

      // Load jobs for all steps
      const jobPromises = steps.map((step) => context.getJobs().getById(step.getJobId()));
      const jobs = await Promise.all(jobPromises);
      await context.save();
      await context.commit();

      // Build base approval items
      const baseApprovalItems = [];
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const job = jobs[i];
        if (!job) {
          this.logger.warn({ stepId: step.getStepId() }, 'Skipping approval item - missing job');
          continue;
        }
        baseApprovalItems.push({
          stepId: step.getStepId() as string,
          jobId: job.id,
          documentId: job.documentId,
          paperlessUrl: `${this.paperlessBaseUrl}/documents/${job.documentId}`,
          jobType: job.jobType,
          proposedActions: job.documentActions.map(action => ({
            id: action.id as string,
            actionType: action.actionType,
            fieldType: action.fieldType,
            isMultiple: action.isMultiple,
            oldValue: action.oldValue,
            newValue: action.newValue,
          })),
          possibleDecisions: step.getPossibleDecisions(),
          createdAt: job.createdAt,
        });
      }

      // Enrich with document info
      const approvalItems: ApprovalItem[] = await enrichAllWithDocument(baseApprovalItems, this.dmsService);

      // Calculate next cursor from last item
      const nextCursor = approvalItems.length > 0 
        ? encodeCursor({ stepId: approvalItems[approvalItems.length - 1].stepId })
        : null;

      return { items: approvalItems, nextCursor };
    } catch (error) {
      this.logger.error({ error }, 'Failed to list pending approvals');
      throw error;
    }
  }

  /**
   * Process user approval/rejection for an interactive step.
   * @param stepId The step ID awaiting approval
   * @param decision User's decision data (e.g., "APPROVED" or "REJECTED")
   */
  async processApprovalDecision(
    stepId: string,
    decision: string,
    actionOverrides?: { id: string; newValue: string | null }[]
  ): Promise<void> {
    let jobId = null;
    try {
      await using context = await this.uowFactory.createUoW();
      await context.start();
      const stepRepo = context.getSteps();
      const jobsRepo = context.getJobs();
      // Load step
      const step = await stepRepo.getById(stepId);
      if (!step) {
        throw new Error(`Step ${stepId} not found`);
      }

      // Load job
      const job = await jobsRepo.getById(step.getJobId());
      if (!job) {
        throw new Error(`Job ${step.getJobId()} not found`);
      }
      jobId = job.id

      // Apply user-supplied action overrides before processing the decision.
      // Only relevant for approve decisions; overrides filter the action list
      // and allow editing individual newValues before Paperless-NGX is updated.
      if (actionOverrides) {
        const overrideMap = new Map(actionOverrides.map(o => [o.id, o.newValue]));
        job.documentActions = job.documentActions
          .filter(a => a.id != null && overrideMap.has(a.id as string))
          .map(a => {
            const overrideValue = overrideMap.get(a.id as string);
            if (overrideValue != null && overrideValue !== a.newValue) {
              return DocumentActionFactory.cloneWithNewValue(a, overrideValue);
            }
            return a;
          });
        await jobsRepo.update(job);
      }

      this.logger.info(
        {
          stepId,
          stepType: step.getStepType(),
          decision,
        },
        'Processing decision',
      );

      // Verify it's a user interaction step
      if (!(step instanceof ManualStep)) {
        throw new Error(
          `Step ${stepId} (${step.getStepType()}) is not a user interaction step`,
        );
      }

      const nextStepResult = await context.getWorkflowOrchestratorDomainService().processUserDecision(step, decision)

      if (nextStepResult.step) {
        stepRepo.create(nextStepResult.step)
      }

      await context.save();
      await context.commit();

    } catch (error) {
      this.logger.error({ error, stepId, decision }, 'Failed to process approval');
      try {
        const uow = await this.uowFactory.createUoW();
        await uow.start();
        const entry = AuditLogEntry.createError(jobId as any, stepId, { message: "" + error})
        uow.getAuditCollector().record(entry)
        await uow.save();
        await uow.commit();
      } catch (err) {
        this,this.logger.error({ error: err}, "Failed saving audit entry")
      }
      throw error;
    }
  }
}
