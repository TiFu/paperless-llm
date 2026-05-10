import { WorkflowAction } from './WorkflowAction';

/**
 * Repository interface for action_log table
 * Stores audit trail of actions taken during workflow execution
 */
export interface IActionLogRepository {
  /**
   * Insert multiple actions into the action log
   * Uses ON CONFLICT to ensure idempotency
   * @param actions Array of action data to insert
   * @returns The inserted WorkflowAction records
   */
  insertActions(
    actions: Array<{
      jobId: string;
      stepId: string;
      type: string;
      payload: Record<string, unknown>;
    }>,
  ): Promise<WorkflowAction[]>;

  /**
   * Get all actions for a specific job
   * @param jobId The job ID
   * @returns Array of WorkflowActions ordered by creation time
   */
  getByJobId(jobId: string): Promise<WorkflowAction[]>;

  /**
   * Get all actions for a specific step
   * @param stepId The step ID
   * @returns Array of WorkflowActions ordered by creation time
   */
  getByStepId(stepId: string): Promise<WorkflowAction[]>;
}
