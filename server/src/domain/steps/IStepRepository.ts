import { AutomatedStep } from "./automated/AutomatedStep";
import { UserInteractionStep } from "./userinteraction/UserInteractionStep";
import { IStep, StepStatus, StepType } from "./IStep";
import { WorkflowType } from "../workflows/WorkflowType";
import { JobState } from "../job/JobState";
import { Cursor } from "../common/Cursor";

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
}
