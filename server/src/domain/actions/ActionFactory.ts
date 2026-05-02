import { Action } from './Action';
import { TitleUpdateAction } from './TitleUpdateAction';
import { ActionType } from '../enums/ActionType';
import { WorkItemStatus } from '../enums/WorkItemStatus';

/**
 * Factory for creating Action instances from database rows
 */
export class ActionFactory {
  /**
   * Deserialize an action from a database row
   */
  static fromDb(row: Record<string, unknown>): Action {
    const actionType = row.action_type as ActionType;
    const payload = row.action_payload as Record<string, unknown>;

    const baseArgs = {
      id: row.id as string,
      documentId: row.document_id as string,
      documentSystem: row.document_system as string,
      status: row.status as WorkItemStatus,
      retryCount: row.retry_count as number,
      retryAfter: row.retry_after ? new Date(row.retry_after as string) : null,
      claimedAt: row.claimed_at ? new Date(row.claimed_at as string) : null,
      claimedBy: row.claimed_by as string | null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };

    switch (actionType) {
      case ActionType.UPDATE_TITLE:
        return new TitleUpdateAction(
          baseArgs.id,
          baseArgs.documentId,
          baseArgs.documentSystem,
          baseArgs.status,
          baseArgs.retryCount,
          baseArgs.retryAfter,
          baseArgs.claimedAt,
          baseArgs.claimedBy,
          baseArgs.createdAt,
          baseArgs.updatedAt,
          (payload.oldValue as string) || null,
          payload.value as string,
        );

      case ActionType.ADD_TAG:
      case ActionType.REMOVE_TAG:
      case ActionType.UPDATE_SUMMARY:
        throw new Error(`Action type ${actionType} not implemented yet`);

      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  }
}
