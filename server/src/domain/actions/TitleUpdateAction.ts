import { DocumentAction } from './DocumentAction.js';
import { DocumentActionType } from './ActionType.js';
import { IDocument } from '../document/IDocument.js';

/**
 * Action to update a document's title
 */
export class TitleUpdateAction extends DocumentAction {
  constructor(
    id: string | null,
    jobId: string,
    oldValue: string,
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
      null, // id - will be assigned by database
      jobId,
      oldTitle || "",
      newTitle,
    );
  }

  apply(dms: IDocument): Partial<IDocument> {
    if (this.newValue) 
      return {
        title: this.newValue
      }
    else
      return {}
  }
}
