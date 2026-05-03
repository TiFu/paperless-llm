export enum JobStatus {
  PENDING = 'pending',
  LLM_PROCESSING = 'llm_processing',
  PENDING_APPROVAL = 'pending_approval',
  UPDATING_DOCUMENT = 'updating_document',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REJECTED = 'rejected',
}
