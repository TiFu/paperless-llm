-- Migration 011: Add completed_at timestamp and document_actions to jobs
-- Support explicit completion tracking and simplified action storage

-- Add completed_at timestamp to track when jobs finish
ALTER TABLE jobs ADD COLUMN completed_at TIMESTAMP;

-- Add document_actions column to store actions as JSONB array
ALTER TABLE jobs ADD COLUMN document_actions JSONB DEFAULT '[]';

-- Create index for querying completed jobs
CREATE INDEX idx_jobs_completed_at ON jobs(completed_at) WHERE completed_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN jobs.completed_at IS 'Timestamp when the job reached a terminal state (COMPLETED, FAILED, or REJECTED)';
COMMENT ON COLUMN jobs.document_actions IS 'Array of document actions (serialized) associated with this job';
