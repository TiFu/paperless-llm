-- Migration 004: Add Step Retry Timer
-- Adds retry_after column to steps table and updates status constraint to include new retry states

-- ============================================================================
-- ADD RETRY_AFTER COLUMN
-- ============================================================================
-- Track when a step in RETRYING status should be retried next
ALTER TABLE steps 
ADD COLUMN retry_after TIMESTAMP NULL;

-- Comment
COMMENT ON COLUMN steps.retry_after IS 'Timestamp when step should be retried (for RETRYING status). NULL for non-retrying steps.';

-- ============================================================================
-- UPDATE STATUS CHECK CONSTRAINT
-- ============================================================================
-- Add new retry-related statuses: RETRYING (automatic retry scheduled), IN_FALLOUT (needs manual intervention)
ALTER TABLE steps 
DROP CONSTRAINT IF EXISTS chk_step_status;

ALTER TABLE steps 
ADD CONSTRAINT chk_step_status CHECK (status IN ('waiting', 'in_progress', 'completed', 'failed', 'retrying', 'in_fallout'));

-- ============================================================================
-- ADD INDEX FOR RETRY QUEUE QUERIES
-- ============================================================================
-- Efficient query for steps ready for retry: status=RETRYING and retry_after <= NOW()
CREATE INDEX idx_steps_retry_queue ON steps(status, retry_after) 
WHERE status = 'retrying' AND retry_after IS NOT NULL;

-- Comment
COMMENT ON INDEX idx_steps_retry_queue IS 'Optimizes queries for fetching steps ready for automatic retry';

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this migration:
-- DROP INDEX IF EXISTS idx_steps_retry_queue;
-- ALTER TABLE steps DROP CONSTRAINT IF EXISTS chk_step_status;
-- ALTER TABLE steps ADD CONSTRAINT chk_step_status CHECK (status IN ('waiting', 'in_progress', 'completed', 'failed'));
-- ALTER TABLE steps DROP COLUMN IF EXISTS retry_after;
