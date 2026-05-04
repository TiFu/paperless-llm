import { IStep, StepType } from "./IStep";

/**
 * Repository interface for steps table
 */
export interface IStepRepository {
  /**
   * Create a new step
   */
  create(
    step: IStep
  ): Promise<void>;


  getPendingByType(types: StepType[]): Promise<IStep>;

  /**
   * Get step by ID
   */
  getById(id: string): Promise<IStep | null>;

  /**
   * Mark step as in progress (sets started_at timestamp)
   */
  markInProgress(id: string): Promise<void>;

  /**
   * Mark step as completed (sets completed_at timestamp)
   */
  markCompleted(id: string): Promise<void>;

  /**
   * Mark step as failed (sets completed_at timestamp)
   */
  markFailed(id: string): Promise<void>;

  /**
   * Get steps by job ID
   */
  getByJobId(jobId: string): Promise<IStep[]>;
}
