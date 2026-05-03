-- Create approval_queue table for jobs requiring manual approval
CREATE TABLE approval_queue (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES llm_work_queue(id) ON DELETE CASCADE,
    document_id INTEGER NOT NULL,
    document_system TEXT NOT NULL,
    action_type TEXT NOT NULL,
    action_payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    reviewed_by TEXT,
    rejection_reason TEXT
);

-- Indexes for efficient querying
CREATE INDEX idx_approval_queue_status ON approval_queue(status);
CREATE INDEX idx_approval_queue_job_id ON approval_queue(job_id);
CREATE INDEX idx_approval_queue_document_id ON approval_queue(document_id);
CREATE INDEX idx_approval_queue_created_at ON approval_queue(created_at DESC);

-- GIN index for JSONB action_payload queries
CREATE INDEX idx_approval_queue_action_payload ON approval_queue USING GIN (action_payload);
