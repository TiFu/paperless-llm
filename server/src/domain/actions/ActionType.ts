/**
 * Types of document modifications
 * Renamed from ActionType to avoid confusion with workflow ActionType
 */
export enum DocumentActionType {
  UPDATE_TITLE = 'update_title',
  UPDATE_TAGS = 'update_tags',
  UPDATE_CORRESPONDENT = 'update_correspondent',
  UPDATE_DOCUMENT_TYPE = 'update_document_type',
  UPDATE_CREATED_DATE = 'update_created_date',
  REMOVE_TAGS = 'remove_tags'
}

