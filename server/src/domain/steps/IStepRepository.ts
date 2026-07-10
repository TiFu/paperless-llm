import { ExecutableStep } from "./automated/ExecutableStep.js";
import { ManualStep } from "./userinteraction/ManualStep.js";
import { IStep, StepStatus, StepType } from "./IStep.js";
import { WorkflowType } from "../workflows/WorkflowType.js";
import { JobState } from "../job/JobState.js";
import { Cursor } from "../common/Cursor.js";

/**
 * Statistics for automated steps aggregated by status
 */
export interface AutomatedStepStatistics {
  total: number;
  waiting: number;
  inProgress: number;
  completed: number;
  failed: number;
  inFallout: number;
}

/**
 * Step with associated job information for queue listings
 */
export interface StepWithJob {
  // Step fields
  stepId: string;
  stepType: StepType;
  stepStatus: StepStatus;
  stepCreatedAt: Date;
  stepStartedAt: Date | null;
  stepCompletedAt: Date | null;
  retryCount: number;
  // Job fields
  jobId: string;
  documentId: number;
  jobType: WorkflowType;
  jobState: JobState;
}

/**
 * Repository interface for steps table
 */
export interface IStepRepository {
  /**
   * Create a new step
   */
  create(step: IStep): Promise<void>;

  /**
   * Create multiple steps at once (for composite steps spawning children)
   * @param steps Array of steps to create
   * @returns Array of created steps with IDs assigned
   */
  createAll(steps: IStep[]): Promise<void>;

  /**
   * Get pending automated steps for execution
   */
  getPendingExecutableSteps(limit: number): Promise<ExecutableStep[]>;

  /**
   * Get pending user interaction steps (awaiting decisions)
   * @param limit Maximum number of steps to return
   * @param cursor Optional cursor for pagination (fetch steps after this cursor)
   */
  getPendingManualSteps(limit: number, cursor?: Cursor): Promise<ManualStep[]>;

  /**
   * Get step by ID
   */
  getById(id: string): Promise<IStep>;
  /**
   * Get steps by job ID
   */
  getByJobId(jobId: string): Promise<IStep[]>;

  update(step: IStep): Promise<void>;
  // Execute update as a single query
  updateAll(step: IStep[]): Promise<void>;

  /**
   * Get aggregated statistics for all automated steps (excluding REQUIRE_APPROVAL).
   * Scoped to the UoW user when a user context is present; returns all for system UoW.
   */
  getAutomatedStepStatistics(): Promise<AutomatedStepStatistics>;

  /**
   * Count pending user interaction steps (REQUIRE_APPROVAL steps in WAITING status).
   * Scoped to the UoW user when a user context is present; returns all for system UoW.
   */
  countPendingUserInteractionSteps(): Promise<number>;

  /**
   * List automated steps with job information for queue display.
   * Scoped to the UoW user when a user context is present; returns all for system UoW.
   * @param limit Maximum number of items to return
   * @param cursor Optional cursor for pagination (step ID)
   * @param stepStatus Optional filter by step status
   * @returns Array of steps with job info and next cursor
   */
  listAutomatedStepsWithJob(
    limit: number,
    cursor?: string,
    stepStatus?: StepStatus
  ): Promise<{ items: StepWithJob[]; nextCursor: string | null }>;

  /**
   * Get steps stuck in IN_PROGRESS state beyond the timeout threshold
   * @param olderThanMs Timeout in milliseconds - steps IN_PROGRESS longer than this are considered stuck
   * @param limit Maximum number of steps to return
   * @returns Array of stuck steps
   */
  getStuckInProgressExecutableSteps(olderThanMs: number, limit?: number): Promise<IStep[]>;

  /**
   * Get steps in RETRYING status that are ready for retry (retry_after <= now)
   * @param now Current time - steps with retry_after <= this are ready for retry
   * @param limit Maximum number of steps to return
   * @returns Array of automated steps ready for retry
   */
  getPendingRetries(now: Date, limit: number): Promise<ExecutableStep[]>;


  /**
   * Get steps by job ID with timestamp information for API display
   * @param jobId Job ID
   * @returns Array of step data with timestamps and retry information
   */
  getStepsByJob(jobId: string): Promise<Array<IStep>>;
}
