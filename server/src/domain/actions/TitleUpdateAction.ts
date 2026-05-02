import { Action } from './Action';
import { ActionType } from '../enums/ActionType';
import { JobType } from '../enums/JobType';
import { WorkItemStatus } from '../enums/WorkItemStatus';
import { IDocumentManagementSystem } from '../interfaces/IDocumentManagementSystem';

/**
 * Action to update a document's title
 */
export class TitleUpdateAction extends Action {
  constructor(
    id: string,
    documentId: string,
    documentSystem: string,
    status: WorkItemStatus,
    retryCount: number,
    retryAfter: Date | null,
    claimedAt: Date | null,
    claimedBy: string | null,
    createdAt: Date,
    updatedAt: Date,
    oldValue: string | null,
    newValue: string,
  ) {
    super(
      id,
      documentId,
      documentSystem,
      ActionType.UPDATE_TITLE,
      status,
      retryCount,
      retryAfter,
      claimedAt,
      claimedBy,
      createdAt,
      updatedAt,
      oldValue,
      newValue,
    );
  }

  /**
   * Create a new TitleUpdateAction (not yet persisted to DB)
   */
  static create(
    documentId: string,
    documentSystem: string,
    newTitle: string,
    oldTitle: string | null,
  ): TitleUpdateAction {
    return new TitleUpdateAction(
      '', // id - will be assigned by database
      documentId,
      documentSystem,
      WorkItemStatus.PENDING,
      0, // retryCount
      null, // retryAfter
      null, // claimedAt
      null, // claimedBy
      new Date(), // createdAt - placeholder
      new Date(), // updatedAt - placeholder
      oldTitle,
      newTitle,
    );
  }

  async execute(dms: IDocumentManagementSystem): Promise<void> {
    await dms.updateDocument(this.documentId, {
      title: this.newValue,
    });
  }

  serializePayload(): Record<string, unknown> {
    return {
      field: 'title',
      value: this.newValue,
      oldValue: this.oldValue,
    };
  }

  getJobType(): JobType {
    return JobType.TITLE;
  }
}
