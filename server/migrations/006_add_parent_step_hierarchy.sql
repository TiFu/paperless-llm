-- Migration 006: Add Parent-Child Step Hierarchy for Parallel Field Generation
-- Adds support for composite steps that spawn multiple child steps to execute in parallel

-- ============================================================================
-- ADD PARENT-CHILD RELATIONSHIP COLUMNS
-- ============================================================================

-- Add parent_step_id foreign key to create parent-child step relationships
ALTER TABLE steps ADD COLUMN parent_step_id UUID NULL REFERENCES steps(id) ON DELETE CASCADE;

-- Add configuration column for parent steps to store execution config (e.g., which fields to generate)
ALTER TABLE steps ADD COLUMN configuration JSONB NULL;

-- ============================================================================
-- ADD COMMENTS
-- ============================================================================
COMMENT ON COLUMN steps.parent_step_id IS 'Reference to parent step for substeps (NULL for top-level steps)';
COMMENT ON COLUMN steps.configuration IS 'Step-specific configuration in JSON format (e.g., {"fields": ["title", "tags"]} for LLM_GENERATE_FIELDS)';

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

-- Index for querying all child steps of a parent (used in parent completion detection)
CREATE INDEX idx_steps_parent_step_id ON steps(parent_step_id) WHERE parent_step_id IS NOT NULL;

-- Index for checking child step completion status
CREATE INDEX idx_steps_parent_status ON steps(parent_step_id, status) WHERE parent_step_id IS NOT NULL;

-- ============================================================================
-- SEED DEFAULT PROMPTS FOR NEW FIELD TYPES
-- ============================================================================

-- LLM_GENERATE_TAGS step prompt
INSERT INTO prompts (step_type, template, version)
VALUES (
    'LLM_GENERATE_TAGS',
    'Analyze the following document and generate relevant tags for categorization and searchability. Return ONLY a comma-separated list of tags, no explanations.

Document title: {{documentTitle}}

Document content:
{{documentContent}}

Tags:',
    1
)
ON CONFLICT (step_type) DO NOTHING;

-- LLM_GENERATE_CORRESPONDENT step prompt
INSERT INTO prompts (step_type, template, version)
VALUES (
    'LLM_GENERATE_CORRESPONDENT',
    'Identify the correspondent (sender, author, or organization) of the following document. Return ONLY the correspondent name, no explanations.

Document title: {{documentTitle}}

Document content:
{{documentContent}}

Correspondent:',
    1
)
ON CONFLICT (step_type) DO NOTHING;

-- LLM_GENERATE_DOCUMENT_TYPE step prompt
INSERT INTO prompts (step_type, template, version)
VALUES (
    'LLM_GENERATE_DOCUMENT_TYPE',
    'Classify the document type (e.g., invoice, receipt, letter, contract, report, statement). Return ONLY the document type, no explanations.

Document title: {{documentTitle}}

Document content:
{{documentContent}}

Document Type:',
    1
)
ON CONFLICT (step_type) DO NOTHING;

-- LLM_GENERATE_CREATED_DATE step prompt
INSERT INTO prompts (step_type, template, version)
VALUES (
    'LLM_GENERATE_CREATED_DATE',
    'Extract the creation date or document date from the following document. Return ONLY the date in ISO 8601 format (YYYY-MM-DD), or "UNKNOWN" if no date is found.

Document title: {{documentTitle}}

Document content:
{{documentContent}}

Date:',
    1
)
ON CONFLICT (step_type) DO NOTHING;
