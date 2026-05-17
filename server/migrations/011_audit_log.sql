CREATE TABLE temp AS SELECT * FROM audit_log;
DROP TABLE audit_log;


-- Migration 005: Add Audit Log
-- Creates audit_log table to track all job and step lifecycle events (creation, execution, retries, approvals, cancellations)

-- ============================================================================
-- CREATE AUDIT_LOG TABLE
-- ============================================================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL ,
  step_id UUID NULL,
  event_type VARCHAR(100) NOT NULL,
  event_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  processing_start_time TIMESTAMP NULL,
  processing_end_time TIMESTAMP NULL,
  metadata JSONB NULL,
  CONSTRAINT chk_audit_log_event_type CHECK (
    event_type IN (
      'JOB_CREATED',
      'STEP_CREATED',
      'STEP_COMPLETED',
      'STEP_FAILED',
      'STEP_MOVED_TO_RETRYING',
      'STEP_MOVED_TO_FALLOUT',
      'APPROVAL_REQUESTED',
      'APPROVAL_APPROVED',
      'APPROVAL_REJECTED',
      'STEP_MANUALLY_RETRIED',
      'STEP_CANCELLED',
      'STUCK_STEP_RESET'
    )
  )
);


-- ============================================================================
-- ADD COMMENTS
-- ============================================================================
COMMENT ON TABLE audit_log IS 'Audit trail of all job and step lifecycle events';
COMMENT ON COLUMN audit_log.job_id IS 'Reference to the job this event relates to';
COMMENT ON COLUMN audit_log.step_id IS 'Reference to the step this event relates to (NULL for job-level events)';
COMMENT ON COLUMN audit_log.event_type IS 'Type of event (JOB_CREATED, STEP_COMPLETED, APPROVAL_APPROVED, etc.)';
COMMENT ON COLUMN audit_log.event_timestamp IS 'When the event occurred';
COMMENT ON COLUMN audit_log.processing_start_time IS 'When step processing started (for execution events)';
COMMENT ON COLUMN audit_log.processing_end_time IS 'When step processing ended (for execution events)';
COMMENT ON COLUMN audit_log.metadata IS 'Event-specific data (retry_count, error_message, decision, etc.) in JSON format';

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================
-- Primary query pattern: get all events for a job, ordered by timestamp
CREATE INDEX idx_audit_log_job_id ON audit_log(job_id, event_timestamp DESC);

-- Query pattern: get all events for a specific step
CREATE INDEX idx_audit_log_step_id ON audit_log(step_id, event_timestamp DESC) 
WHERE step_id IS NOT NULL;

-- Query pattern: filter by event type
CREATE INDEX idx_audit_log_event_type ON audit_log(event_type);

-- Query pattern: get recent events across all jobs
CREATE INDEX idx_audit_log_timestamp ON audit_log(event_timestamp DESC);


DROP TABLE temp;
    