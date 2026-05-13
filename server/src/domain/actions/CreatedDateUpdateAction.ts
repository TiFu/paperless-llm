import { DocumentAction } from './DocumentAction.js';
import { DocumentActionType } from './ActionType.js';
import { IDocument } from '../document/IDocument.js';

/**
 * Action to update a document's created date
 */
export class CreatedDateUpdateAction extends DocumentAction {
  constructor(
    id: string | null,
    jobId: string,
    oldValue: string,
    newValue: string,
  ) {
    super(
      id,
      DocumentActionType.UPDATE_CREATED_DATE,
      jobId,
      oldValue,
      newValue,
    );
  }

  /**
   * Create a new CreatedDateUpdateAction (not yet persisted to DB)
   * @param jobId Job ID
   * @param newCreatedDate New created date (ISO string format or null)
   * @param oldCreatedDate Current created date (ISO string format or null)
   */
  static create(
    jobId: string,
    newCreatedDate: string | null,
    oldCreatedDate: string | null,
  ): CreatedDateUpdateAction {
    return new CreatedDateUpdateAction(
      null, // id - will be assigned by database
      jobId,
      oldCreatedDate || "",
      newCreatedDate || "",
    );
  }

  apply(document: IDocument): Partial<IDocument> {
    const dateValue = this.newValue || null;
    return {
      createdDate: dateValue ? new Date(dateValue) : null
    };
  }
}
