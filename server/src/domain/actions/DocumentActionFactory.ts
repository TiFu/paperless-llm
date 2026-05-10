import { DocumentAction } from './DocumentAction.js';
import { TitleUpdateAction } from './TitleUpdateAction.js';
import { DocumentActionType } from './ActionType.js';

/**
 * Factory for creating Action instances from database rows
 */
export class DocumentActionFactory {
  /**
   * Deserialize an action from a database row
   */
  static fromDb(row: Record<string, unknown>): DocumentAction {
    const actionType = row.action_type as DocumentActionType;
    const oldValue = row.old_value as string;
    const newValue = row.new_value as string;

    const baseArgs = {
      id: row.id as string,
      jobId: row.job_id as string,
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
