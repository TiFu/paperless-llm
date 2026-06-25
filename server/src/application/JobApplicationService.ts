import { Job } from "../domain/job/Job.js";
import { JobState } from "../domain/job/JobState.js";
import { IStep } from "../domain/steps/IStep.js";
import { WorkflowType } from "../domain/workflows/WorkflowType.js";
import { getLogger } from "../utils/logger.js";
import { DocumentField } from "../domain/steps/StepFactory.js";
import { AuditLogEntry } from "../domain/audit/AuditLogEntry.js";
import { UoWFactory } from "../infrastructure/UoW.js";
import { UserContext } from "../domain/auth/UserContext.js";
import { DocumentEnriched, enrichAllWithDocument, enrichWithDocument } from "./util/documentEnrichment.js";
import { ApiError } from "../api/middleware/errorHandler.js";

export interface JobStats {
  pending: number;
  llmProcessing: number;
  pendingApproval: number;
  updatingDocument: number;
  removingTags: number;
  completed: number;
  failed: number;
  rejected: number;
}

export class JobApplicationService {
  constructor(
    private readonly uowFactory: UoWFactory,
  ) {}

  async getJobStats(user: UserContext): Promise<JobStats> {
    const logger = getLogger();
    try {
      await using context = await this.uowFactory.createUoW(user);
      await context.start();
      const countsByState = await context.getJobs().getJobCountsByState();
      await context.commit();
      return {
        pending: countsByState[JobState.PENDING] || 0,
        llmProcessing: countsByState[JobState.LLM_PROCESSING] || 0,
        pendingApproval: countsByState[JobState.PENDING_APPROVAL] || 0,
        updatingDocument: countsByState[JobState.UPDATING_DOCUMENT] || 0,
        removingTags: countsByState[JobState.REMOVING_TAGS] || 0,
        completed: countsByState[JobState.COMPLETED] || 0,
        failed: countsByState[JobState.FAILED] || 0,
        rejected: countsByState[JobState.REJECTED] || 0,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get job stats');
      throw error;
    }
  }

  async create(
    documentId: number,
    fields: DocumentField[],
    jobType: WorkflowType,
    user: UserContext,
  ): Promise<DocumentEnriched<Job>> {
    const jobs = await this.createBulk([{ documentId, fields, jobType }], user);
    return jobs[0];
  }

  async createBulk(
    jobs: Array<{ documentId: number; jobType: WorkflowType; fields: DocumentField[] }>,
    user: UserContext,
  ): Promise<DocumentEnriched<Job>[]> {
    if (jobs.length === 0) return [];

    const logger = getLogger();
    try {
      await using context = await this.uowFactory.createUoW(user);
      await context.start();
      const jobRepo = context.getJobs();

      const createdJobs = await jobRepo.createBulk(jobs);
      const entries = createdJobs.map(j => AuditLogEntry.createJobCreated(j));
      context.getAuditCollector().recordAll(entries);

      const workflowOrchestrator = context.getWorkflowOrchestratorDomainService();
      await Promise.all(
        createdJobs.map(j => workflowOrchestrator.startJob(j)).map(r => {
          if (r.step) return context.getSteps().create(r.step);
          return Promise.resolve();
        }),
      );

      for (const job of createdJobs) {
        await context.getPermissions().grant('job', job.id, user.username);
      }

      await context.save();
      await context.commit();

      const dms = await context.getDMS();
      return enrichAllWithDocument(createdJobs, dms);
    } catch (error) {
      logger.error({ error, count: jobs.length }, 'Failed to create jobs in bulk');
      throw error;
    }
  }

  async getById(id: string, user: UserContext): Promise<DocumentEnriched<Job> | null> {
    const logger = getLogger();
    try {
      await using context = await this.uowFactory.createUoW(user);
      await context.start();

      const canRead = await context.getPermissions().hasPermission('job', id, user.username);
      if (!canRead) throw new ApiError(403, 'Forbidden');

      const job = await context.getJobs().getById(id);
      const dms = await context.getDMS();
      await context.commit();

      return enrichWithDocument(job, dms);
    } catch (error) {
      logger.error({ error, id }, 'Failed to get job by ID');
      throw error;
    }
  }

  async getByDocumentId(documentId: string, user: UserContext): Promise<DocumentEnriched<Job>[]> {
    const logger = getLogger();
    try {
      await using context = await this.uowFactory.createUoW(user);
      await context.start();
      const jobs = await context.getJobs().getByDocumentId(documentId);
      const allowedIds = await context.getPermissions().listObjectIdsForUser('job', user.username);
      const dms = await context.getDMS();
      await context.commit();

      const visible = jobs.filter(j => allowedIds.includes(j.id));
      return enrichAllWithDocument(visible, dms);
    } catch (error) {
      logger.error({ error, documentId }, 'Failed to get jobs by document ID');
      throw error;
    }
  }

  async list(
    limit: number,
    user: UserContext,
    cursor?: string,
    state?: JobState,
  ): Promise<{ items: DocumentEnriched<Job>[]; nextCursor: string | null }> {
    const logger = getLogger();
    try {
      const start = Date.now();

      await using context = await this.uowFactory.createUoW(user);
      await context.start();
      const result = await context.getJobs().listForUser(limit, cursor, state);
      const dms = await context.getDMS();
      await context.commit();

      const end2 = Date.now();
      const output = await enrichAllWithDocument(result.items, dms);
      const end3 = Date.now();
      logger.info({
        joblistMs: end2 - start,
        documentMs: end3 - end2,
        totalMs: end3 - start,
      }, 'Time measurement for job list');
      return { items: output, nextCursor: result.nextCursor };
    } catch (error) {
      logger.error({ error, limit, cursor, state }, 'Failed to list jobs');
      throw error;
    }
  }

  async getStepsByJobId(jobId: string, user: UserContext): Promise<Array<IStep>> {
    const logger = getLogger();
    try {
      await using context = await this.uowFactory.createUoW(user);
      await context.start();

      const canRead = await context.getPermissions().hasPermission('job', jobId, user.username);
      if (!canRead) throw new ApiError(403, 'Forbidden');

      const steps = await context.getSteps().getStepsByJob(jobId);
      await context.commit();
      return steps;
    } catch (error) {
      logger.error({ error, jobId }, 'Failed to get steps by job ID');
      throw error;
    }
  }
}
