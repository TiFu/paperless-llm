import { DocumentAction } from './DocumentAction.js';
import { DocumentActionType } from './ActionType.js';
import { IDocument } from '../document/IDocument.js';

/**
 * Action to update a document's document type
 */
export class DocumentTypeUpdateAction extends DocumentAction {
  constructor(
    id: string | null,
    jobId: string,
    oldValue: string,
    newValue: string,
  ) {
    super(
      id,
      DocumentActionType.UPDATE_DOCUMENT_TYPE,
      jobId,
      oldValue,
      newValue,
    );
  }

  /**
   * Create a new DocumentTypeUpdateAction (not yet persisted to DB)
   * @param jobId Job ID
   * @param newDocumentTypeId Document type ID to apply (or null)
   * @param oldDocumentTypeId Current document type ID (or null)
   */
  static create(
    jobId: string,
    newDocumentTypeId: string,
    oldDocumentTypeId: string,
  ): DocumentTypeUpdateAction {
    return new DocumentTypeUpdateAction(
      null, // id - will be assigned by database
      jobId,
      oldDocumentTypeId,
      newDocumentTypeId
    );
  }

  apply(document: IDocument): Partial<IDocument> {
    const documentTypeId = this.newValue ? parseInt(this.newValue, 10) : null;
    if (this.newValue)
      return {
        documentType: this.newValue
      };
    else 
      return {}
  }
}
