import { Step } from '../entities/Step';
import { StepType } from '../enums/StepType';
import { StepStatus } from '../enums/StepStatus';

/**
 * Repository interface for steps table
 */
export interface IStepRepository {
  /**
   * Create a new step
   */
  create(
    jobId: string,
    type: StepType,
    payload: Record<string, unknown>,
  ): Promise<Step>;

  /**
   * Get step by ID
   */
  getById(id: string): Promise<Step | null>;

  /**
   * Get waiting steps for polling
   */
  getPending(limit: number): Promise<Step[]>;

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
  getByJobId(jobId: string): Promise<Step[]>;
}
