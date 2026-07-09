import { Job } from "./Job.js";
import { JobState } from "./JobState.js";
import { WorkflowType } from "../workflows/WorkflowType.js";
import { DocumentField } from "../steps/StepFactory.js";

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
    jobType: WorkflowType,
    fields: DocumentField[]
  ): Promise<Job>;

  /**
   * Create multiple jobs in bulk
   * @param jobs Array of {documentId, jobType} objects
   * @returns Array of created jobs with empty documentActions arrays
   */
  createBulk(
    jobs: Array<{ documentId: number; jobType: WorkflowType, fields: DocumentField[] }>
  ): Promise<Job[]>;

  /**
   * Get a job by ID
   * @param id Job ID
   * @returns Job with documentActions loaded, or null if not found
   */
  getById(id: string): Promise<Job>;

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
   * List jobs with pagination. Scoped to the UoW user when a user context is present;
   * returns all jobs for system UoW.
   */
  listForUser(
    limit: number,
    cursor?: string,
    state?: JobState,
  ): Promise<{ items: Job[]; nextCursor: string | null }>;

  /**
   * Get jobs by document ID
   */
  getByDocumentId(documentId: string): Promise<Job[]>;

  /**
   * Get job counts grouped by state. Scoped to the UoW user when a user context is present;
   * returns counts across all jobs for system UoW.
   */
  getJobCountsByState(): Promise<{ [state: string]: number }>;

  /**
   * Filter the given document IDs to return only those with jobs in progress
   * (i.e., jobs that are not in terminal states: completed, failed, rejected).
   * Scoped to the UoW user when a user context is present (a document only
   * counts as "in progress" if that user can see the in-progress job for
   * it); returns matches across all users' jobs for a system UoW.
   * @param documentIds Array of document IDs to check
   * @returns Array of document IDs that have jobs in progress
   */
  filterInProgressDocuments(documentIds: number[]): Promise<number[]>;

  /**
   * Get the currently in-progress (non-terminal-state) jobs for the given
   * document IDs, always system-wide regardless of UoW user — a document is
   * one shared Paperless resource, so there is at most one active job per
   * document across all users. Used to find an existing job to grant a user
   * access to instead of starting a second, concurrently-writing job for a
   * document another user's job is already processing.
   * @param documentIds Array of document IDs to check
   * @returns The active jobs found, at most one per document
   */
  getActiveJobsByDocumentIds(documentIds: number[]): Promise<Job[]>;
}
