-- Create jobs table as source of truth for job lifecycle
CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    document_id TEXT NOT NULL,
    job_type TEXT NOT NULL,
    requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'llm_processing',
            'pending_approval',
            'updating_document',
            'completed',
            'failed',
            'rejected'
        )
    ),
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_document_id ON jobs(document_id);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- Add foreign key from llm_work_queue to jobs
ALTER TABLE llm_work_queue 
ADD COLUMN job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE;

CREATE INDEX idx_llm_work_queue_job_id ON llm_work_queue(job_id);

-- Add foreign key from approval_queue to jobs (replace existing job_id reference)
ALTER TABLE approval_queue 
DROP CONSTRAINT approval_queue_job_id_fkey;

ALTER TABLE approval_queue 
ADD CONSTRAINT approval_queue_job_id_fkey 
FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;

-- Add foreign key from document_update_work_queue to jobs (replace existing job_id reference)
ALTER TABLE document_update_work_queue 
DROP CONSTRAINT IF EXISTS document_update_work_queue_job_id_fkey;

ALTER TABLE document_update_work_queue 
ADD CONSTRAINT document_update_work_queue_job_id_fkey 
FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
