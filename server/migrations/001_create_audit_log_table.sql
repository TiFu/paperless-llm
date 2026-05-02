-- Migration: Create audit_log table
-- Description: Stores audit trail of all document modifications

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id TEXT NOT NULL,
    document_system TEXT NOT NULL,
    job_type TEXT NOT NULL,
    action_type TEXT NOT NULL,
    before_value TEXT,
    after_value TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on document_id for faster lookups
CREATE INDEX idx_audit_log_document_id ON audit_log(document_id);

-- Create index on created_at for time-based queries
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- Create index on status for filtering
CREATE INDEX idx_audit_log_status ON audit_log(status);
