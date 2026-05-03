import { WorkflowActionType } from '../enums/WorkflowActionType';

/**
 * WorkflowAction entity - represents an immutable fact emitted by a step
 * Actions are stored in an append-only log
 */
export class WorkflowAction {
  constructor(
    public readonly id: string,
    public readonly jobId: string,
    public readonly stepId: string,
    public readonly type: WorkflowActionType,
    public readonly payload: Record<string, unknown>,
    public readonly createdAt: Date,
  ) {}

  public static fromDb(row: Record<string, unknown>): WorkflowAction {
    return new WorkflowAction(
      row.id as string,
      row.job_id as string,
      row.step_id as string,
      row.type as WorkflowActionType,
      (row.payload as Record<string, unknown>) || {},
      new Date(row.created_at as string),
    );
  }

  public static create(
    jobId: string,
    stepId: string,
    type: WorkflowActionType,
    payload: Record<string, unknown> = {},
  ): Omit<WorkflowAction, 'id' | 'createdAt'> {
    return {
      jobId,
      stepId,
      type,
      payload,
    };
  }
}
