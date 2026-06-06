import { DocumentAction } from './DocumentAction.js';
import { DocumentActionType } from './ActionType.js';
import { IDocument } from '../document/IDocument.js';

/**
 * Action to remove tags from a document
 */
export class TagRemoveAction extends DocumentAction {
  constructor(
    id: string | null,
    jobId: string,
    oldValue: string,
    newValue: string,
  ) {
    super(
      id,
      DocumentActionType.REMOVE_TAGS,
      jobId,
      oldValue,
      newValue,
    );
  }

  get fieldType(): 'tag' { return 'tag'; }
  get isMultiple(): true { return true; }

  /**
   * Create a new TagRemoveAction (not yet persisted to DB)
   * @param jobId The job ID
   * @param tagNames Array of tag names to remove
   */
  static create(
    jobId: string,
    tagNames: string[],
  ): TagRemoveAction {
    return new TagRemoveAction(
      null, // id - will be assigned by database
      jobId,
      '', // oldValue - not used for tag removal
      JSON.stringify(tagNames), // Store tag names as JSON array
    );
  }

  /**
   * Get the tag names to remove
   */
  getTagNames(): string[] {
    return JSON.parse(this.newValue);
  }

  apply(document: IDocument): Partial<IDocument> {
    // Tag removal is handled separately via bulk_edit API
    // This returns an empty partial to satisfy the interface
    return {
      removeTags: this.getTagNames()
    } as Partial<IDocument>;
  }
}
