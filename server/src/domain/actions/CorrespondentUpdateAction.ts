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
    newCorrespondentId: number | null,
    oldCorrespondentId: number | null,
  ): CorrespondentUpdateAction {
    return new CorrespondentUpdateAction(
      null, // id - will be assigned by database
      jobId,
      oldCorrespondentId !== null ? String(oldCorrespondentId) : "",
      newCorrespondentId !== null ? String(newCorrespondentId) : "",
    );
  }

  apply(document: IDocument): Partial<IDocument> {
    const correspondentId = this.newValue ? parseInt(this.newValue, 10) : null;
    return {
      metadata: {
        ...document.metadata,
        correspondent: correspondentId
      }
    };
  }
}
