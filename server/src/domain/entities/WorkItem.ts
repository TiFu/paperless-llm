import { JobType } from '../enums/JobType';
import { WorkItemStatus } from '../enums/WorkItemStatus';

export class WorkItem {
  constructor(
    public readonly id: string,
    public readonly documentId: string,
    public readonly jobType: JobType,
    public readonly status: WorkItemStatus,
    public readonly retryCount: number,
    public readonly retryAfter: Date | null,
    public readonly claimedAt: Date | null,
    public readonly claimedBy: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  public static fromDb(row: Record<string, unknown>): WorkItem {
    return new WorkItem(
      row.id as string,
      row.document_id as string,
      row.job_type as JobType,
      row.status as WorkItemStatus,
      row.retry_count as number,
      row.retry_after ? new Date(row.retry_after as string) : null,
      row.claimed_at ? new Date(row.claimed_at as string) : null,
      row.claimed_by as string | null,
      new Date(row.created_at as string),
      new Date(row.updated_at as string),
    );
  }
}
