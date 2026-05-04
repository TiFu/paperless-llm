import { WorkflowType as WorkflowType } from '../workflows/WorkflowType';
import { JobState } from './JobState';
import { DocumentAction } from '../actions/DocumentAction';

/**
 * Job entity - stateful entity representing a workflow instance
 * Contains job-specific data and tracks overall workflow state
 */
export class Job {
  constructor(
    public readonly id: string,
    public readonly documentId: string,
    public readonly jobType: WorkflowType,
    public state: JobState,
    public documentActions: DocumentAction[],
    public readonly errorMessage: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly completedAt: Date | null,
  ) {}

  public static fromDb(row: Record<string, unknown>, actions: DocumentAction[] = []): Job {
    return new Job(
      row.id as string,
      row.document_id as string,
      row.job_type as WorkflowType,
      row.state as JobState,
      actions,
      row.error_message as string | null,
      new Date(row.created_at as string),
      new Date(row.updated_at as string),
      row.completed_at ? new Date(row.completed_at as string) : null,
    );
  }

  public isPending(): boolean {
    return this.state === JobState.PENDING;
  }

  public isCompleted(): boolean {
    return this.state === JobState.COMPLETED;
  }

  public isFailed(): boolean {
    return this.state === JobState.FAILED;
  }

  public isRejected(): boolean {
    return this.state === JobState.REJECTED;
  }

  public isTerminal(): boolean {
    return this.isCompleted() || this.isFailed() || this.isRejected();
  }
}
