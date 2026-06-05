import { Job } from "../domain/job/Job.js";
import { JobState } from "../domain/job/JobState.js";
import { IStep } from "../domain/steps/IStep.js";
import { WorkflowType } from "../domain/workflows/WorkflowType.js";
import { getLogger } from "../utils/logger.js";
import { DocumentField } from "../domain/steps/StepFactory.js";
import { AuditLogEntry } from "../domain/audit/AuditLogEntry.js";
import { UoWFactory } from "../infrastructure/UoW.js";

/**
 * Statistics for jobs grouped by state
 */
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

/**
 * JobApplicationService - handles job creation and retrieval with transaction management.
 * Application service that orchestrates persistence for job operations.
 */
import { IDocumentManagementSystem } from "../domain/document/IDocumentManagementSystem.js";
import { DocumentEnriched, enrichAllWithDocument, enrichWithDocument } from "./util/documentEnrichment.js";

export class JobApplicationService {
  constructor(
    private readonly uowFactory: UoWFactory,
    private readonly dmsService: IDocumentManagementSystem
  ) {}

  /**
   * Get statistics for jobs grouped by state.
   * @returns Object with counts for each job state
   */
  async getJobStats(): Promise<JobStats> {
    const logger = getLogger();
    
    try {
      await using context = await this.uowFactory.createUoW();
      await context.start();
      const jobs = context.getJobs();

      const countsByState = await jobs.getJobCountsByState();
      await context.save();
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

  /**
   * Create a new job with initial step.
   * @param documentId The document ID this job operates on
   * @param jobType The type of job to create (maps to workflow type)
   * @param data Job-specific data (e.g., requiresApproval flag)
   * @returns The created job
   */
  async create(
    documentId: number,
    fields: DocumentField[],
    jobType: WorkflowType,
  ): Promise<DocumentEnriched<Job>> {
    const job = await this.createBulk([{ documentId, fields, jobType}]).then((v) => v[0])
    return enrichWithDocument(job, this.dmsService);
  }

  /**
   * Create multiple jobs in bulk with initial steps.
   * More efficient than calling create() multiple times.
   * @param jobs Array of {documentId, jobType} objects
   * @returns Array of created jobs
   */
  async createBulk(
    jobs: Array<{ documentId: number; jobType: WorkflowType, fields: DocumentField[] }>
  ): Promise<DocumentEnriched<Job>[]> {
    if (jobs.length === 0) {
      return [];
    }

    const logger = getLogger();
    
    try {
      await using context = await this.uowFactory.createUoW();
      await context.start();
      const jobRepo = context.getJobs();

      logger.info({ count: jobs.length }, 'Creating jobs in bulk');

      // TODO: this may need some optimization, i.e. a JobDomainService that handles creation & start of a job
      // Create all jobs in a single database operation
      const createdJobs = await jobRepo.createBulk(jobs);
      const entries = createdJobs.map(j => {
        return AuditLogEntry.createJobCreated(j);
      })
      context.getAuditCollector().recordAll(entries)

      // Start all jobs
      const workflowOrchestrator = context.getWorkflowOrchestratorDomainService();
      await Promise.all(createdJobs.map((j) => workflowOrchestrator.startJob(j)).map((r) => {
        if (r.step)
          return context.getSteps().create(r.step)
        else
          return Promise.resolve()
      }))

      await context.save();
      await context.commit();
      const output = enrichAllWithDocument(createdJobs, this.dmsService)
      return output;
    } catch (error) {
      logger.error({ error, count: jobs.length }, 'Failed to create jobs in bulk');
      throw error;
    }
  }

  /**
   * Get a job by ID.
   * @param id Job ID
   * @returns Job or null if not found
   */
  async getById(id: string): Promise<DocumentEnriched<Job> | null> {
    const logger = getLogger();
    
    try {
      await using context = await this.uowFactory.createUoW();
      await context.start();

      const job = await context.getJobs().getById(id);      
      await context.save();
      await context.commit();

      const output = await enrichWithDocument(job, this.dmsService)
      return output;
    } catch (error) {
      logger.error({ error, id }, 'Failed to get job by ID');
      throw error;
    }
  }

  /**
   * Get jobs for a document.
   * @param documentId Document ID
   * @returns Array of jobs for the document
   */
  async getByDocumentId(documentId: string): Promise<DocumentEnriched<Job>[]> {
    const logger = getLogger();
    
    try {
      await using context = await this.uowFactory.createUoW();
      await context.start();

      const jobs = await context.getJobs().getByDocumentId(documentId);
      await context.save();
      await context.commit();
      const output = enrichAllWithDocument(jobs, this.dmsService)
      return output;
    } catch (error) {
      logger.error({ error, documentId }, 'Failed to get jobs by document ID');
      throw error;
    }
  }

  /**
   * List jobs with pagination and optional state filter.
   * @param limit Maximum number of jobs to return
   * @param cursor Optional cursor for pagination
   * @param state Optional job state filter
   * @returns Jobs and next cursor
   */
  async list(
    limit: number,
    cursor?: string,
    state?: JobState,
  ): Promise<{ items: DocumentEnriched<Job>[]; nextCursor: string | null }> {
    const logger = getLogger();
    
    try {
      const start = Date.now();
      await using context = await this.uowFactory.createUoW();
      await context.start();

      const result = await context.getJobs().list(limit, cursor, state);

      await context.commit();
      const end2 = Date.now();
      const output = await enrichAllWithDocument(result.items, this.dmsService)
      const end3 = Date.now();
      logger.info({ 
        joblistMs: end2 - start,
        documentMs: end3 - end2,
        totalMs: end3 - start
      }, "Time measurement for job list")
      return { items: output, nextCursor: result.nextCursor};
    } catch (error) {
      logger.error({ error, limit, cursor, state }, 'Failed to list jobs');
      throw error;
    }
  }

  /**
   * Get steps for a job with timestamp information for API display.
   * @param jobId Job ID
   * @returns Array of step data with timestamps and retry information
   */
  async getStepsByJobId(jobId: string): Promise<Array<IStep>> {
    const logger = getLogger();
    
    try {
      await using context = await this.uowFactory.createUoW();
      await context.start();

      const steps = await context.getSteps().getStepsByJob(jobId);
      await context.save();
      await context.commit();
      return steps;
    } catch (error) {
      logger.error({ error, jobId }, 'Failed to get steps by job ID');
      throw error;
    }
  }
}
