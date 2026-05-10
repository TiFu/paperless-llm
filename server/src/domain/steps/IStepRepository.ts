import { AutomatedStep } from "./automated/AutomatedStep.js";
import { UserInteractionStep } from "./userinteraction/UserInteractionStep.js";
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
  // Job fields
  jobId: string;
  documentId: string;
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
  create(step: IStep): Promise<IStep>;

  /**
   * Get pending automated steps for execution
   */
  getPendignAutomatedSteps(limit: number): Promise<AutomatedStep[]>;

  /**
   * Get pending user interaction steps (awaiting decisions)
   * @param limit Maximum number of steps to return
   * @param cursor Optional cursor for pagination (fetch steps after this cursor)
   */
  getPendingUserInteractionSteps(limit: number, cursor?: Cursor): Promise<UserInteractionStep[]>;

  /**
   * Get step by ID
   */
  getById(id: string): Promise<IStep | null>;

  update(step: IStep): Promise<void>;
  // Execute update as a single query
  updateAll(step: IStep[]): Promise<void>;
  /**
   * Get steps by job ID
   */
  getByJobId(jobId: string): Promise<IStep[]>;

  /**
   * Get aggregated statistics for all automated steps (excluding REQUIRE_APPROVAL)
   */
  getAutomatedStepStatistics(): Promise<AutomatedStepStatistics>;

  /**
   * Count pending user interaction steps (REQUIRE_APPROVAL steps in WAITING status)
   */
  countPendingUserInteractionSteps(): Promise<number>;

  /**
   * List automated steps with job information for queue display
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
  getStuckInProgressSteps(olderThanMs: number, limit?: number): Promise<IStep[]>;

  /**
   * Get steps in RETRYING status that are ready for retry (retry_after <= now)
   * @param now Current time - steps with retry_after <= this are ready for retry
   * @param limit Maximum number of steps to return
   * @returns Array of automated steps ready for retry
   */
  getPendingRetries(now: Date, limit: number): Promise<AutomatedStep[]>;

  /**
   * Reset a step back to WAITING status for retry
   * Increments retry_count and clears started_at timestamp
   * @param stepId ID of the step to reset
   */
  resetStepToWaiting(stepId: string): Promise<void>;

  /**
   * Mark a step as FAILED with an error message
   * @param stepId ID of the step to mark as failed
   * @param errorMessage Error message describing why the step failed
   */
  markStepAsFailed(stepId: string, errorMessage: string): Promise<void>;

  /**
   * Get steps by job ID with timestamp information for API display
   * @param jobId Job ID
   * @returns Array of step data with timestamps and retry information
   */
  getStepsByJobIdWithTimestamps(jobId: string): Promise<Array<{
    stepId: string;
    stepType: StepType;
    stepStatus: StepStatus;
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
    retryCount: number;
    retryAfter: Date | null;
  }>>;
}
