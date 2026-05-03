-- Migration 010: Workflow System with Jobs, Steps, and Actions
-- Refactor from queue-based to workflow-based architecture

-- 1. Add state and data to jobs table
ALTER TABLE jobs ADD COLUMN state VARCHAR(50) NOT NULL DEFAULT 'pending';
ALTER TABLE jobs ADD COLUMN data JSONB DEFAULT '{}';

-- Create index on job state for workflow queries
CREATE INDEX idx_jobs_state ON jobs(state);

-- 2. Create steps table
CREATE TABLE steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'waiting',
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  CONSTRAINT chk_step_status CHECK (status IN ('waiting', 'in_progress', 'completed', 'failed'))
);

-- Index for efficient step polling
CREATE INDEX idx_steps_status_created ON steps(status, created_at) WHERE status = 'waiting';
CREATE INDEX idx_steps_job_id ON steps(job_id);

-- 3. Create action_log table (append-only event log)
CREATE TABLE action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Idempotency: prevent duplicate actions from same step
-- Use hash of (step_id, type, payload) to detect duplicates
CREATE UNIQUE INDEX idx_action_log_idempotency ON action_log(step_id, type, md5(payload::text));

-- Index for querying actions by job
CREATE INDEX idx_action_log_job_id ON action_log(job_id);
CREATE INDEX idx_action_log_step_id ON action_log(step_id);

-- 4. Update job status enum to include state values
-- Remove the old status column and use state instead
ALTER TABLE jobs DROP COLUMN status;

-- Add comments for documentation
COMMENT ON TABLE steps IS 'Executable units (async tasks) in a workflow. Steps emit actions.';
COMMENT ON TABLE action_log IS 'Append-only log of actions (facts) emitted by steps.';
COMMENT ON COLUMN jobs.state IS 'Current state of the job workflow (e.g., pending, llm_processing, completed)';
COMMENT ON COLUMN jobs.data IS 'Job-specific data as JSON (e.g., proposedTitle, approvalRequired)';
COMMENT ON COLUMN steps.type IS 'Step type (e.g., LLM_GENERATE_TITLE, REQUIRE_APPROVAL, UPDATE_DOCUMENT)';
COMMENT ON COLUMN steps.payload IS 'Step-specific input data as JSON';
COMMENT ON COLUMN action_log.type IS 'Action type (e.g., TITLE_PROPOSED, APPROVAL_REQUIRED, DOCUMENT_UPDATED)';
COMMENT ON COLUMN action_log.payload IS 'Action-specific data as JSON (immutable facts)';
