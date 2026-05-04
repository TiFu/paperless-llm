import { DocumentAction } from './DocumentAction';
import { TitleUpdateAction } from './TitleUpdateAction';
import { DocumentActionType } from './ActionType';
import { WorkItemStatus } from '../enums/WorkItemStatus';

/**
 * Factory for creating Action instances from database rows
 */
export class DocumentActionFactory {
  /**
   * Deserialize an action from a database row
   */
  static fromDb(row: Record<string, unknown>): DocumentAction {
    const actionType = row.action_type as DocumentActionType;
    const oldValue = row.oldValue as string
    const newValue = row.newValue as string

    const baseArgs = {
      id: row.id as string,
      jobId: row.job_id as string | null,
    };

    switch (actionType) {
      case DocumentActionType.UPDATE_TITLE:
        return new TitleUpdateAction(
          baseArgs.id,
          baseArgs.jobId,
          oldValue,
          newValue
        );
      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  }
}
