/**
 * Job workflow states
 * Represents the current stage in the job's lifecycle
 */
export enum JobState {
  PENDING = 'pending',
  LLM_PROCESSING = 'llm_processing',
  PENDING_APPROVAL = 'pending_approval',
  UPDATING_DOCUMENT = 'updating_document',
  REMOVING_TAGS = 'removing_tags',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REJECTED = 'rejected',
}
