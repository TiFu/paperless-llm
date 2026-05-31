-- Migration: Update audit_log event_type for decision events
-- Date: 2026-05-31

-- 1. Update CHECK constraint to allow new event types
ALTER TABLE audit_log
  DROP CONSTRAINT IF EXISTS chk_audit_log_event_type;

-- 2. Update COMMENT for event_type
COMMENT ON COLUMN audit_log.event_type IS 'Type of event (JOB_CREATED, STEP_COMPLETED, DECISION_SUBMITTED, etc.)';

-- 3. (Optional) Migrate existing approval events to new decision events
UPDATE audit_log SET event_type = 'DECISION_REQUESTED' WHERE event_type = 'APPROVAL_REQUESTED';
UPDATE audit_log SET event_type = 'DECISION_SUBMITTED' WHERE event_type IN ('APPROVAL_APPROVED', 'APPROVAL_REJECTED');

-- Re-add the constraint
ALTER TABLE audit_log
  ADD CONSTRAINT chk_audit_log_event_type CHECK (
    event_type IN (
      'JOB_CREATED',
      'JOB_COMPLETED',
      'JOB_FAILED',
      'ERROR',
      'STEP_CREATED',
      'STEP_EXECUTED',
      'STEP_COMPLETED',
      'DECISION_REQUESTED',
      'DECISION_SUBMITTED',
      'STEP_MANUALLY_RETRIED',
      'STEP_CANCELLED',
      'STUCK_STEP_RESET'

    )
  );

-- End of migration
