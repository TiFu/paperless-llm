import { DocumentAction } from './DocumentAction.js';
import { DocumentActionType } from './ActionType.js';
import { IDocument } from '../document/IDocument.js';

/**
 * Action to update a document's tags
 */
export class TagUpdateAction extends DocumentAction {
  constructor(
    id: string | null,
    jobId: string,
    oldValue: string,
    newValue: string,
  ) {
    super(
      id,
      DocumentActionType.UPDATE_TAGS,
      jobId,
      oldValue,
      newValue,
    );
  }

  /**
   * Create a new TagUpdateAction (not yet persisted to DB)
   * @param jobId Job ID
   * @param newTags Array of tag IDs to apply
   * @param oldTags Current array of tag IDs (or null)
   */
  static create(
    jobId: string,
    newTags: string[],
    oldTags: string[] | null,
  ): TagUpdateAction {
    return new TagUpdateAction(
      null, // id - will be assigned by database
      jobId,
      JSON.stringify(oldTags || []),
      JSON.stringify(newTags),
    );
  }

  apply(document: IDocument): Partial<IDocument> {
    const tagIds = JSON.parse(this.newValue) as string[];
    return {
      tags: tagIds 
    };
  }
}
