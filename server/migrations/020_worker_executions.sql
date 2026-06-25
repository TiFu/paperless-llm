-- Migration: Worker Executions
-- Tracks each run of a background worker loop (by worker type), plus the
-- individual items (steps/users/documents) touched during that run.

-- ============================================================================
-- WORKER_EXECUTIONS TABLE
-- One row per background worker loop tick (step_processor, stuck_step_reset,
-- entity_sync, document_auto_queue).
-- ============================================================================
CREATE TABLE worker_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'running',
  result JSONB,
  error_message TEXT,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMP,
  CONSTRAINT chk_worker_execution_status CHECK (status IN ('running', 'succeeded', 'failed'))
);

CREATE INDEX idx_worker_executions_worker_type ON worker_executions(worker_type);
CREATE INDEX idx_worker_executions_started_at ON worker_executions(started_at DESC);

COMMENT ON TABLE worker_executions IS 'Each run of a background worker loop, by worker type';
COMMENT ON COLUMN worker_executions.worker_type IS 'e.g. step_processor, stuck_step_reset, entity_sync, document_auto_queue';
COMMENT ON COLUMN worker_executions.result IS 'Summary counts for the run (e.g. processed/retried/created/skipped)';

-- ============================================================================
-- WORKER_EXECUTION_ITEMS TABLE
-- Individual items touched within a worker execution (e.g. a step processed,
-- a user synced, a document auto-queued).
-- ============================================================================
CREATE TABLE worker_execution_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES worker_executions(id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL,
  item_id VARCHAR(255) NOT NULL,
  outcome VARCHAR(50) NOT NULL,
  error_message TEXT,
  started_at TIMESTAMP NOT NULL,
  finished_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_worker_execution_items_execution_id ON worker_execution_items(execution_id);
CREATE INDEX idx_worker_execution_items_item ON worker_execution_items(item_type, item_id);

COMMENT ON TABLE worker_execution_items IS 'Individual items processed within a worker execution run';
COMMENT ON COLUMN worker_execution_items.item_type IS 'e.g. step, entity_sync_user, document';
COMMENT ON COLUMN worker_execution_items.item_id IS 'ID of the referenced item (step id, username, document id, etc.)';
COMMENT ON COLUMN worker_execution_items.outcome IS 'e.g. success, failed, skipped, retrying, fallout, created';
