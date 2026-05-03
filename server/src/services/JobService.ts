import { Job } from '../domain/entities/Job';
import { JobType } from '../domain/enums/JobType';
import { RepositoryRegistry } from '../infrastructure/RepositoryRegistry';
import { getLogger } from '../utils/logger';

const logger = getLogger();

/**
 * JobService - handles job creation and business logic
 */
export class JobService {
  constructor(private readonly repos: RepositoryRegistry) {}

  /**
   * Create a new job
   * @param documentId The document ID this job operates on
   * @param jobType The type of job to create (maps to workflow type)
   * @param data Job-specific data (e.g., requiresApproval flag)
   * @returns The created job with empty documentActions array
   */
  async create(
    documentId: string,
    jobType: JobType,
    data: Record<string, unknown> = {},
  ): Promise<Job> {
    logger.info({ documentId, jobType, data }, 'Creating new job');

    const job = await this.repos.getJobs().create(documentId, jobType, data);

    logger.info({ jobId: job.id, state: job.state }, 'Job created');

    return job;
  }

  /**
   * Get a job by ID
   * @param id Job ID
   * @returns Job or null if not found
   */
  async getById(id: string): Promise<Job | null> {
    return this.repos.getJobs().getById(id);
  }

  /**
   * Get jobs for a document
   * @param documentId Document ID
   * @returns Array of jobs for the document
   */
  async getByDocumentId(documentId: string): Promise<Job[]> {
    return this.repos.getJobs().getByDocumentId(documentId);
  }
}
