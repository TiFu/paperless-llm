import { Job } from "./Job.js";
import { JobState } from "./JobState.js";
import { WorkflowType } from "../workflows/WorkflowType.js";

export interface IJobRepository {
  /**
   * Create a new job
   * @param documentId The document ID this job operates on
   * @param jobType The type of job to create
   * @param data Job-specific data
   * @returns The created job with empty documentActions array
   */
  create(
    documentId: string,
    jobType: WorkflowType
  ): Promise<Job>;

  /**
   * Get a job by ID
   * @param id Job ID
   * @returns Job with documentActions loaded, or null if not found
   */
  getById(id: string): Promise<Job | null>;

  /**
   * Update job (state, data, and documentActions)
   * @param job The job to update with its current state, includign document actions
   */
  update(job: Job): Promise<void>;

  /**
   * Update job state only (convenience method)
   * @param id Job ID
   * @param state New state
   * @param errorMessage Optional error message
   * @param completedAt Optional completion timestamp for terminal states
   */
  updateState(
    job: Job,
  ): Promise<void>;

  /**
   * List jobs with pagination
   */
  list(
    limit: number,
    cursor?: string,
    state?: JobState,
  ): Promise<{ items: Job[]; nextCursor: string | null }>;

  /**
   * Get jobs by document ID
   */
  getByDocumentId(documentId: string): Promise<Job[]>;

  /**
   * Get job counts grouped by state
   */
  getJobCountsByState(): Promise<{ [state: string]: number }>;
}
