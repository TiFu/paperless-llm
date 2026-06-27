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

  get fieldType(): 'date' { return 'date'; }
  get isMultiple(): false { return false; }

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

  apply(_document: IDocument): Partial<IDocument> {
    const dateValue = this.newValue || null;
    if (dateValue) {
      return {
        createdDate: new Date(dateValue)
      }
    } else {
      return {}
    }
  }
}
