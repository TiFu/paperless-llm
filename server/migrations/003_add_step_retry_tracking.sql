-- Migration 003: Add Step Retry Tracking
-- Adds retry_count column to steps table and index for stuck step detection

-- ============================================================================
-- ADD RETRY_COUNT COLUMN
-- ============================================================================
-- Track how many times a step has been reset/retried after timing out
ALTER TABLE steps 
ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;

-- Comment
COMMENT ON COLUMN steps.retry_count IS 'Number of times this step has been reset after timing out (0 = first attempt)';

-- ============================================================================
-- ADD INDEX FOR STUCK STEP DETECTION
-- ============================================================================
-- Efficient query for steps stuck in IN_PROGRESS state beyond timeout threshold
-- Filters only in_progress steps and orders by started_at for timeout detection
CREATE INDEX idx_steps_stuck_detection ON steps(status, started_at) 
WHERE status = 'in_progress' AND started_at IS NOT NULL;

-- Comment
COMMENT ON INDEX idx_steps_stuck_detection IS 'Optimizes queries for detecting stuck in_progress steps based on timeout';

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this migration:
-- DROP INDEX IF EXISTS idx_steps_stuck_detection;
-- ALTER TABLE steps DROP COLUMN IF EXISTS retry_count;
