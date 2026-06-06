import { DocumentActionType } from './ActionType.js';
import { IDocument } from '../document/IDocument.js';

/**
 * Abstract base class for all actions
 * Handles common properties and DB serialization
 */
export abstract class DocumentAction {
  
  constructor(
    public readonly id: string | null,
    public readonly actionType: DocumentActionType,
    public readonly jobId: string,
    public readonly oldValue: string,
    public readonly newValue: string,
    public readonly createdAt: Date = new Date()
  ) {}

  /**
   * The data type of this action's value field — used by the frontend to render
   * the appropriate editor control (text field, date picker, autocomplete, etc.)
   */
  abstract get fieldType(): 'string' | 'tag' | 'correspondent' | 'document_type' | 'date';

  /**
   * Whether this action's value represents multiple items (e.g. a tag array)
   */
  abstract get isMultiple(): boolean;

  /**
   * Execute the action against the document management system
   * @param dms The document management system to update
   */
  abstract apply(dms: IDocument): Partial<IDocument>;
}
