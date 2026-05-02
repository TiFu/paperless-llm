-- Migration: Create document_update_work_queue table
-- Description: Queue for document update actions

CREATE TABLE IF NOT EXISTS document_update_work_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id TEXT NOT NULL,
    document_system TEXT NOT NULL,
    action_type TEXT NOT NULL,
    action_payload JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    retry_after TIMESTAMP WITH TIME ZONE,
    claimed_at TIMESTAMP WITH TIME ZONE,
    claimed_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on status for queue processing
CREATE INDEX idx_document_update_work_queue_status ON document_update_work_queue(status);

-- Create composite index for claiming work items
CREATE INDEX idx_document_update_work_queue_claim ON document_update_work_queue(status, created_at) WHERE status IN ('pending', 'processing');

-- Create index on document_id for lookups
CREATE INDEX idx_document_update_work_queue_document_id ON document_update_work_queue(document_id);

-- Create index on retry_after for scheduled retries
CREATE INDEX idx_document_update_work_queue_retry_after ON document_update_work_queue(retry_after) WHERE retry_after IS NOT NULL;

-- Create index on action_payload for JSONB queries (optional, add specific paths as needed)
CREATE INDEX idx_document_update_work_queue_action_payload ON document_update_work_queue USING GIN (action_payload);
