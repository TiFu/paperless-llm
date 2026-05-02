import { ActionType } from '../enums/ActionType';
import { WorkItemStatus } from '../enums/WorkItemStatus';

export class ActionItem {
  constructor(
    public readonly id: string,
    public readonly documentId: string,
    public readonly documentSystem: string,
    public readonly actionType: ActionType,
    public readonly actionPayload: Record<string, unknown>,
    public readonly status: WorkItemStatus,
    public readonly retryCount: number,
    public readonly retryAfter: Date | null,
    public readonly claimedAt: Date | null,
    public readonly claimedBy: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  public static fromDb(row: Record<string, unknown>): ActionItem {
    return new ActionItem(
      row.id as string,
      row.document_id as string,
      row.document_system as string,
      row.action_type as ActionType,
      row.action_payload as Record<string, unknown>,
      row.status as WorkItemStatus,
      row.retry_count as number,
      row.retry_after ? new Date(row.retry_after as string) : null,
      row.claimed_at ? new Date(row.claimed_at as string) : null,
      row.claimed_by as string | null,
      new Date(row.created_at as string),
      new Date(row.updated_at as string),
    );
  }

  public static create(
    documentId: string,
    documentSystem: string,
    actionType: ActionType,
    actionPayload: Record<string, unknown>,
  ): ActionItem {
    return new ActionItem(
      '', // id - placeholder, will be assigned by database
      documentId,
      documentSystem,
      actionType,
      actionPayload,
      WorkItemStatus.PENDING,
      0, // retryCount
      null, // retryAfter
      null, // claimedAt
      null, // claimedBy
      new Date(), // createdAt - placeholder, will be set by database
      new Date(), // updatedAt - placeholder, will be set by database
    );
  }
}
