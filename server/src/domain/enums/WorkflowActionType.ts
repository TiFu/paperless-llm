/**
 * Workflow action types - immutable facts emitted by steps
 * Actions are event-like and stored in an append-only log
 */
export enum WorkflowActionType {
  // LLM Generation actions
  TITLE_PROPOSED = 'TITLE_PROPOSED',
  
  // Approval actions
  APPROVAL_REQUIRED = 'APPROVAL_REQUIRED',
  APPROVAL_GRANTED = 'APPROVAL_GRANTED',
  APPROVAL_REJECTED = 'APPROVAL_REJECTED',
  
  // Document update actions
  DOCUMENT_UPDATED = 'DOCUMENT_UPDATED',
  
  // Error actions
  EXECUTION_FAILED = 'EXECUTION_FAILED',
}
