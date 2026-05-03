import { DocumentActionType } from '../enums/ActionType';
import { WorkItemStatus } from '../enums/WorkItemStatus';
import { JobType } from '../enums/JobType';
import { IDocumentManagementSystem } from '../interfaces/IDocumentManagementSystem';
import { IDocument } from '../interfaces';

/**
 * Abstract base class for all actions
 * Handles common properties and DB serialization
 */
export abstract class DocumentAction {
  constructor(
    public readonly id: string,
    public readonly actionType: DocumentActionType,
    public readonly jobId: string | null,
    public readonly oldValue: string | null,
    public readonly newValue: string,
  ) {}

  /**
   * Execute the action against the document management system
   * @param dms The document management system to update
   */
  abstract apply(dms: IDocument): void;
}
