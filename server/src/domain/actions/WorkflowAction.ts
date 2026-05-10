/**
 * WorkflowAction - represents an action logged during workflow execution
 * This is different from DocumentAction - WorkflowAction is an audit log entry
 * while DocumentAction is a planned change to a document.
 */
export class WorkflowAction {
  constructor(
    public readonly id: string,
    public readonly jobId: string,
    public readonly stepId: string,
    public readonly type: string,
    public readonly payload: Record<string, unknown>,
    public readonly createdAt: Date,
  ) {}

  /**
   * Create a WorkflowAction instance from a database row
   */
  static fromDb(row: any): WorkflowAction {
    return new WorkflowAction(
      row.id,
      row.job_id,
      row.step_id,
      row.type,
      typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      row.created_at,
    );
  }
}
