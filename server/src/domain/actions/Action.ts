import { ActionType } from '../enums/ActionType';
import { WorkItemStatus } from '../enums/WorkItemStatus';
import { JobType } from '../enums/JobType';
import { IDocumentManagementSystem } from '../interfaces/IDocumentManagementSystem';

/**
 * Abstract base class for all actions
 * Handles common properties and DB serialization
 */
export abstract class Action {
  constructor(
    public readonly id: string,
    public readonly documentId: string,
    public readonly documentSystem: string,
    public readonly actionType: ActionType,
    public readonly status: WorkItemStatus,
    public readonly retryCount: number,
    public readonly retryAfter: Date | null,
    public readonly claimedAt: Date | null,
    public readonly claimedBy: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly oldValue: string | null,
    public readonly newValue: string,
  ) {}

  /**
   * Execute the action against the document management system
   * @param dms The document management system to update
   */
  abstract execute(dms: IDocumentManagementSystem): Promise<void>;

  /**
   * Serialize the action-specific data to a payload for database storage
   */
  abstract serializePayload(): Record<string, unknown>;

  /**
   * Get the job type associated with this action for audit logging
   */
  abstract getJobType(): JobType;
}
