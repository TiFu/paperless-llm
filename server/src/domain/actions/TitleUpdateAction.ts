import { DocumentAction } from './DocumentAction';
import { DocumentActionType } from '../enums/ActionType';
import { JobType } from '../enums/JobType';
import { WorkItemStatus } from '../enums/WorkItemStatus';
import { IDocumentManagementSystem } from '../interfaces/IDocumentManagementSystem';
import { IDocument } from '../interfaces';

/**
 * Action to update a document's title
 */
export class TitleUpdateAction extends DocumentAction {
  constructor(
    id: string,
    jobId: string | null,
    oldValue: string | null,
    newValue: string,
  ) {
    super(
      id,
      DocumentActionType.UPDATE_TITLE,
      jobId,
      oldValue,
      newValue,
    );
  }

  /**
   * Create a new TitleUpdateAction (not yet persisted to DB)
   */
  static create(
    jobId: string,
    newTitle: string,
    oldTitle: string | null,
  ): TitleUpdateAction {
    return new TitleUpdateAction(
      '', // id - will be assigned by database
      jobId,
      oldTitle,
      newTitle,
    );
  }

  apply(dms: IDocument): void {
    dms.title = this.newValue
  }
}
