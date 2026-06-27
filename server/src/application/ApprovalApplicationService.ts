import { ManualStep } from "../domain/steps/userinteraction/ManualStep.js";

import { Cursor, encodeCursor } from "../domain/common/Cursor.js";
import { createChildLogger } from "../utils/logger.js";
import { AuditLogEntry } from "../domain/audit/AuditLogEntry.js";
import { UoWFactory } from "../infrastructure/UoW.js";
import pino from "pino";
import { IDocument } from '../domain/document/IDocument.js';
import { enrichAllWithDocument } from './util/documentEnrichment.js';
import { DocumentActionFactory } from '../domain/actions/DocumentActionFactory.js';
import { UserContext } from '../domain/auth/UserContext.js';

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

export interface ApprovalStats {
  pendingCount: number;
}

export class ManualStepApplicationService {
  private logger: pino.Logger

  constructor(
    private readonly uowFactory: UoWFactory,
    private readonly paperlessBaseUrl: string,
  ) {
    this.logger = createChildLogger({name: "ManualStepApplicationService"})
  }

  async getApprovalStats(user: UserContext): Promise<ApprovalStats> {
    try {
      await using context = await this.uowFactory.createUoW(user);
      await context.start();
      const pendingCount = await context.getSteps().countPendingUserInteractionSteps();
      await context.commit();
      return { pendingCount };
    } catch (error) {
      this.logger.error({ error }, 'Failed to get approval stats');
      throw error;
    }
  }

  async listPendingApprovals(
    user: UserContext,
    limit: number = 50,
    cursor?: Cursor
  ): Promise<{ items: ApprovalItem[]; nextCursor: string | null }> {
    try {
      await using context = await this.uowFactory.createUoW(user);
      await context.start();
      const steps = await context.getSteps().getPendingManualSteps(limit, cursor);
      const jobs = await Promise.all(steps.map((step) => context.getJobs().getById(step.getJobId())));
      await context.save();
      await context.commit();

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
      const dms = await context.getDMS();
      const approvalItems: ApprovalItem[] = await enrichAllWithDocument(baseApprovalItems, dms);
      const nextCursor = approvalItems.length > 0
        ? encodeCursor({ stepId: approvalItems[approvalItems.length - 1].stepId })
        : null;

      return { items: approvalItems, nextCursor };
    } catch (error) {
      this.logger.error({ error }, 'Failed to list pending approvals');
      throw error;
    }
  }

  async processApprovalDecision(
    stepId: string,
    decision: string,
    user: UserContext,
    actionOverrides?: { id: string; newValue: string | null }[]
  ): Promise<void> {
    let jobId: string | null = null;
    try {
      await using context = await this.uowFactory.createSystemUoW();
      await context.start();
      const stepRepo = context.getSteps();
      const jobsRepo = context.getJobs();
      const step = await stepRepo.getById(stepId);
      if (!step) throw new Error(`Step ${stepId} not found`);

      const job = await jobsRepo.getById(step.getJobId());
      if (!job) throw new Error(`Job ${step.getJobId()} not found`);
      jobId = job.id;

      const canWrite = await context.getPermissions().hasPermission('job', job.id, user.username);
      if (!canWrite) throw new Error(`Forbidden: user ${user.username} cannot act on job ${job.id}`);

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

      this.logger.info({ stepId, stepType: step.getStepType(), decision }, 'Processing decision');

      if (!(step instanceof ManualStep)) {
        throw new Error(`Step ${stepId} (${step.getStepType()}) is not a user interaction step`);
      }

      const nextStepResult = await context.getWorkflowOrchestratorDomainService().processUserDecision(step, decision);
      if (nextStepResult.step) stepRepo.create(nextStepResult.step);

      await context.save();
      await context.commit();

    } catch (error) {
      this.logger.error({ error, stepId, decision }, 'Failed to process approval');
      try {
        await using uow = await this.uowFactory.createSystemUoW();
        await uow.start();
        const entry = AuditLogEntry.createError(jobId ?? '', stepId, { message: "" + error });
        uow.getAuditCollector().record(entry);
        await uow.save();
        await uow.commit();
      } catch (err) {
        this.logger.error({ error: err }, "Failed saving audit entry");
      }
      throw error;
    }
  }
}
