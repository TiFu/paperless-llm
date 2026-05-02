-- Migration: Create llm_work_queue table
-- Description: Queue for LLM processing jobs

CREATE TABLE IF NOT EXISTS llm_work_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id TEXT NOT NULL,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    retry_after TIMESTAMP WITH TIME ZONE,
    claimed_at TIMESTAMP WITH TIME ZONE,
    claimed_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on status for queue processing
CREATE INDEX idx_llm_work_queue_status ON llm_work_queue(status);

-- Create composite index for claiming work items
CREATE INDEX idx_llm_work_queue_claim ON llm_work_queue(status, created_at) WHERE status IN ('pending', 'processing');

-- Create index on document_id for lookups
CREATE INDEX idx_llm_work_queue_document_id ON llm_work_queue(document_id);

-- Create index on retry_after for scheduled retries
CREATE INDEX idx_llm_work_queue_retry_after ON llm_work_queue(retry_after) WHERE retry_after IS NOT NULL;
