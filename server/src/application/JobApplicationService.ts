import { Job } from "../domain/job/Job";
import { WorkflowType } from "../domain/workflows/WorkflowType";
import { TransactionManager } from "../infrastructure/TransactionManager";
import { getLogger } from "../utils/logger";
import { WorkflowOrchestratorService } from "./WorkflowOrchestratorService";

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
}
