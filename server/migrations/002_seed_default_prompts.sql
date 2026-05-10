-- Migration 002: Seed default prompts
-- Insert default prompt templates for step types

-- LLM_GENERATE_TITLE step prompt
INSERT INTO prompts (step_type, template, version)
VALUES (
    'LLM_GENERATE_TITLE',
    'Generate a concise and descriptive title for the following document. The title should be clear, informative, and suitable for document management. Respond with ONLY the title, no explanations or quotes.

Document content:
{{documentContent}}

Title:',
    1
)
ON CONFLICT (step_type) DO NOTHING;
