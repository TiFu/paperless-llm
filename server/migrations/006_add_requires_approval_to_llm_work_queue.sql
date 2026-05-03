-- Add requires_approval flag to llm_work_queue table
ALTER TABLE llm_work_queue 
ADD COLUMN requires_approval BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for filtering jobs that require approval
CREATE INDEX idx_llm_work_queue_requires_approval ON llm_work_queue(requires_approval);
