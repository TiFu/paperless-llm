-- Migration: Enforce required step metadata if step_id is present
-- This constraint ensures that if step_id is not null, metadata must include stepType and stepStatus

ALTER TABLE audit_log
  ADD CONSTRAINT chk_audit_log_step_metadata
  CHECK (
    step_id IS NULL
    OR (
      (metadata ? 'stepType')
      AND (metadata ? 'stepStatus')
    )
  );

-- Optionally, you can add more fields to enforce (e.g., outcome, errorMessage)
-- To remove this constraint, use:
-- ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS chk_audit_log_step_metadata;
