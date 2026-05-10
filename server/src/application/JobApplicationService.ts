import { Job } from "../domain/job/Job.js";
import { JobState } from "../domain/job/JobState.js";
import { IStep } from "../domain/steps/IStep.js";
import { WorkflowType } from "../domain/workflows/WorkflowType.js";
import { TransactionManager } from "../infrastructure/TransactionManager.js";
import { getLogger } from "../utils/logger.js";
import { WorkflowOrchestratorService } from "./WorkflowOrchestratorService.js";

/**
 * Statistics for job steps
 */
export interface JobStepStats {
  totalSteps: number;
  waitingSteps: number;
  inProgressSteps: number;
  completedSteps: number;
  failedSteps: number;
}

/**
 * JobApplicationService - handles job creation and retrieval with transaction management.
 * Application service that orchestrates persistence for job operations.
 */
export class JobApplicationService {
  constructor(private readonly txManager: TransactionManager) {}

  /**
   * Create a new job with initial step.
   * @param documentId The document ID this job operates on
   * @param jobType The type of job to create (maps to workflow type)
   * @param data Job-specific data (e.g., requiresApproval flag)
   * @returns The created job
   */
  async create(
    documentId: string,
    jobType: WorkflowType,
  ): Promise<Job> {
    const logger = getLogger();
    const context = await this.txManager.createContext();
    
    try {
      await context.start();
      const repos = context.getRepositoryRegistry();

      logger.info({ documentId, jobType }, 'Creating new job');

      const job = await repos.getJobs().create(documentId, jobType);
      
      // Start job with first transition
      const orchestrator = new WorkflowOrchestratorService()
      orchestrator.startWorkflow(job, context)

      logger.info({ jobId: job.id, state: job.state }, 'Job created');

      await context.commit();
      return job;
    } catch (error) {
      logger.error({ error, documentId, jobType }, 'Failed to create job');
      await context.rollback();
      throw error;
    } finally {
      await context.dispose();
    }
  }

  /**
   * Get a job by ID.
   * @param id Job ID
   * @returns Job or null if not found
   */
  async getById(id: string): Promise<Job | null> {
    const logger = getLogger();
    const context = await this.txManager.createContext();
    
    try {
      await context.start();
      const repos = context.getRepositoryRegistry();

      const job = await repos.getJobs().getById(id);

      await context.commit();
      return job;
    } catch (error) {
      logger.error({ error, id }, 'Failed to get job by ID');
      await context.rollback();
      throw error;
    } finally {
      await context.dispose();
    }
  }

  /**
   * Get jobs for a document.
   * @param documentId Document ID
   * @returns Array of jobs for the document
   */
  async getByDocumentId(documentId: string): Promise<Job[]> {
    const logger = getLogger();
    const context = await this.txManager.createContext();
    
    try {
      await context.start();
      const repos = context.getRepositoryRegistry();

      const jobs = await repos.getJobs().getByDocumentId(documentId);

      await context.commit();
      return jobs;
    } catch (error) {
      logger.error({ error, documentId }, 'Failed to get jobs by document ID');
      await context.rollback();
      throw error;
    } finally {
      await context.dispose();
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
  ): Promise<{ items: Job[]; nextCursor: string | null }> {
    const logger = getLogger();
    const context = await this.txManager.createContext();
    
    try {
      await context.start();
      const repos = context.getRepositoryRegistry();

      const result = await repos.getJobs().list(limit, cursor, state);

      await context.commit();
      returatistics for all job steps (overall step statistics).
   * @returns Object with counts of steps by status
   */
  async getJobStepStats(): Promise<JobStepStats> {
    const logger = getLogger();
    const context = await this.txManager.createContext();
    
    try {
      await context.start();
      const repos = context.getRepositoryRegistry();

      const stats = await repos.getSteps().getOverallStepStatistics();

      await context.commit();
      
      return {
        totalSteps: stats.total,
        waitingSteps: stats.waiting,
        inProgressSteps: stats.inProgress,
        completedSteps: stats.completed,
        failedSteps: stats.failed,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get job step stats');
      await context.rollback();
      throw error;
    } finally {
      await context.dispose();
    }
  }

  /**
   * Get stn result;
    } catch (error) {
      logger.error({ error, limit, cursor, state }, 'Failed to list jobs');
      await context.rollback();
      throw error;
    } finally {
      await context.dispose();
    }
  }

  /**
   * Get steps for a job with timestamp information for API display.
   * @param jobId Job ID
   * @returns Array of step data with timestamps
   */
  async getStepsByJobId(jobId: string): Promise<Array<{
    stepId: string;
    stepType: string;
    stepStatus: string;
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
  }>> {
    const logger = getLogger();
    const context = await this.txManager.createContext();
    
    try {
      await context.start();
      const repos = context.getRepositoryRegistry();

      const steps = await repos.getSteps().getStepsByJobIdWithTimestamps(jobId);

      await context.commit();
      return steps;
    } catch (error) {
      logger.error({ error, jobId }, 'Failed to get steps by job ID');
      await context.rollback();
      throw error;
    } finally {
      await context.dispose();
    }
  }
}
