-- Migration: Create prompts table
-- Description: Stores LLM prompt templates for different job types

CREATE TABLE IF NOT EXISTS prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL UNIQUE,
    template TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index on job_type
CREATE UNIQUE INDEX idx_prompts_job_type ON prompts(job_type);

-- Create index on version for tracking prompt evolution
CREATE INDEX idx_prompts_version ON prompts(version);
