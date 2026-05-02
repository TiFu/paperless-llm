import { JobType } from '../enums/JobType';
import { ActionType } from '../enums/ActionType';

export enum AuditStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
}

export class AuditEntry {
  constructor(
    public readonly id: string,
    public readonly documentId: string,
    public readonly documentSystem: string,
    public readonly jobType: JobType,
    public readonly actionType: ActionType,
    public readonly beforeValue: string | null,
    public readonly afterValue: string,
    public readonly status: AuditStatus,
    public readonly errorMessage: string | null,
    public readonly createdAt: Date,
  ) {}

  public static fromDb(row: Record<string, unknown>): AuditEntry {
    return new AuditEntry(
      row.id as string,
      row.document_id as string,
      row.document_system as string,
      row.job_type as JobType,
      row.action_type as ActionType,
      row.before_value as string | null,
      row.after_value as string,
      row.status as AuditStatus,
      row.error_message as string | null,
      new Date(row.created_at as string),
    );
  }

  public static create(
    documentId: string,
    documentSystem: string,
    jobType: JobType,
    actionType: ActionType,
    beforeValue: string | null,
    afterValue: string,
    status: AuditStatus,
    errorMessage: string | null = null,
  ): Omit<AuditEntry, 'id' | 'createdAt'> {
    return {
      documentId,
      documentSystem,
      jobType,
      actionType,
      beforeValue,
      afterValue,
      status,
      errorMessage,
    };
  }
}
