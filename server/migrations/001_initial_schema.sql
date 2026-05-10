-- Migration 001: Initial Schema
-- Complete database schema for paperless-llm workflow system

-- ============================================================================
-- JOBS TABLE
-- ============================================================================
-- Central table for tracking workflow instances
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id TEXT NOT NULL,
  job_type VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_jobs_state ON jobs(state);
CREATE INDEX idx_jobs_document_id ON jobs(document_id);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX idx_jobs_completed_at ON jobs(completed_at) WHERE completed_at IS NOT NULL;

-- Comments
COMMENT ON TABLE jobs IS 'Central workflow job tracking';
COMMENT ON COLUMN jobs.state IS 'Current state of the job workflow (e.g., pending, processing, completed, failed, rejected)';

-- ============================================================================
-- DOCUMENT ACTIONS TABLE
-- ============================================================================
-- Actions to be applied to documents (replaces JSON serialization)
CREATE TABLE document_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_document_actions_job_id ON document_actions(job_id);

-- Comments
COMMENT ON TABLE document_actions IS 'Document modification actions associated with jobs';
COMMENT ON COLUMN document_actions.action_type IS 'Type of document action (e.g., update_title, add_tag)';
COMMENT ON COLUMN document_actions.old_value IS 'Previous value before the action (nullable for new values)';
COMMENT ON COLUMN document_actions.new_value IS 'New value to apply to the document';

-- ============================================================================
-- STEPS TABLE
-- ============================================================================
-- Workflow orchestration steps (async task execution units)
CREATE TABLE steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  CONSTRAINT chk_step_status CHECK (status IN ('waiting', 'in_progress', 'completed', 'failed'))
);

-- Indexes
CREATE INDEX idx_steps_status_created ON steps(status, created_at) WHERE status = 'waiting';
CREATE INDEX idx_steps_job_id ON steps(job_id);
CREATE INDEX idx_steps_status ON steps(status);

-- Comments
COMMENT ON TABLE steps IS 'Executable units (async tasks) in a workflow';
COMMENT ON COLUMN steps.type IS 'Step type (e.g., LLM_GENERATE_TITLE, REQUIRE_APPROVAL, UPDATE_DOCUMENT)';

-- ============================================================================
-- PROMPTS TABLE
-- ============================================================================
-- LLM prompt templates for different step types
CREATE TABLE prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_type TEXT NOT NULL UNIQUE,
  template TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_prompts_step_type ON prompts(step_type);
CREATE INDEX idx_prompts_version ON prompts(version);

-- Comments
COMMENT ON TABLE prompts IS 'LLM prompt templates for different step types';
COMMENT ON COLUMN prompts.step_type IS 'Step type this prompt is for (e.g., LLM_GENERATE_TITLE)';
COMMENT ON COLUMN prompts.template IS 'Prompt template with {{variable}} placeholders';
COMMENT ON COLUMN prompts.version IS 'Version number for tracking prompt evolution';
