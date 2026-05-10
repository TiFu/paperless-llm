import { DocumentAction } from './DocumentAction';
import { DocumentActionType } from './ActionType';
import { IDocument } from '../document/IDocument';

/**
 * Action to update a document's title
 */
export class TitleUpdateAction extends DocumentAction {
  constructor(
    id: string,
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
      '', // id - will be assigned by database
      jobId,
      oldTitle || "",
      newTitle,
    );
  }

  apply(dms: IDocument): Partial<IDocument> {
    return {
      title: this.newValue
    }
  }
}
