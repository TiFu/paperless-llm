import { DocumentAction } from './DocumentAction.js';
import { DocumentActionType } from './ActionType.js';
import { IDocument } from '../document/IDocument.js';

/**
 * Action to update a document's correspondent
 */
export class CorrespondentUpdateAction extends DocumentAction {
  constructor(
    id: string | null,
    jobId: string,
    oldValue: string,
    newValue: string,
  ) {
    super(
      id,
      DocumentActionType.UPDATE_CORRESPONDENT,
      jobId,
      oldValue,
      newValue,
    );
  }

  /**
   * Create a new CorrespondentUpdateAction (not yet persisted to DB)
   * @param jobId Job ID
   * @param newCorrespondentId Correspondent ID to apply (or null)
   * @param oldCorrespondentId Current correspondent ID (or null)
   */
  static create(
    jobId: string,
    newCorrespondentId: string,
    oldCorrespondentId: string,
  ): CorrespondentUpdateAction {
    return new CorrespondentUpdateAction(
      null, // id - will be assigned by database
      jobId,
      oldCorrespondentId,
      newCorrespondentId
    );
  }
 
  apply(document: IDocument): Partial<IDocument> {
    if (this.newValue)
      return {
        correspondent: this.newValue
      };
    else 
        return {}
  }
}
