import { WorkflowAction } from '../entities/WorkflowAction';

/**
 * Repository interface for action_log table (append-only)
 */
export interface IActionLogRepository {
  /**
   * Insert actions (idempotent - uses ON CONFLICT DO NOTHING)
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
   * Get actions by job ID
   */
  getByJobId(jobId: string): Promise<WorkflowAction[]>;

  /**
   * Get actions by step ID
   */
  getByStepId(stepId: string): Promise<WorkflowAction[]>;
}
