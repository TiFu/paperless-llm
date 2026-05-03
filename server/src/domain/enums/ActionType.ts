/**
 * Types of document modifications
 * Renamed from ActionType to avoid confusion with workflow ActionType
 */
export enum DocumentActionType {
  UPDATE_TITLE = 'update_title',
  ADD_TAG = 'add_tag',
  REMOVE_TAG = 'remove_tag',
  UPDATE_SUMMARY = 'update_summary',
}

