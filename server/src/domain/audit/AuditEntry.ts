import { DocumentActionType } from '../actions/ActionType';
import { WorkflowType } from '../workflows/WorkflowType';

export enum AuditStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
}

export class AuditEntry {
  constructor(
    public readonly id: string,
    public readonly jobId: WorkflowType,
    public readonly stepId: string,
    public readonly status: AuditStatus,
    public readonly errorMessage: string | null,
    public readonly createdAt: Date,
  ) {}

  public static fromDb(row: Record<string, unknown>): AuditEntry {
    return new AuditEntry(
      row.id as string,
      row.action_type as DocumentActionType,
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
    jobType: WorkflowType,
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
