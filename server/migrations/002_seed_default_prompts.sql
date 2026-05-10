-- Migration 002: Seed default prompts
-- Insert default prompt templates for common job types

-- Title generation prompt
INSERT INTO prompts (job_type, template, version)
VALUES (
    'title',
    'Generate a concise and descriptive title for the following document. The title should be clear, informative, and suitable for document management. Respond with ONLY the title, no explanations or quotes.

Document content:
{{documentContent}}

Title:',
    1
)
ON CONFLICT (job_type) DO NOTHING;

-- Tag generation prompt
INSERT INTO prompts (job_type, template, version)
VALUES (
    'tag',
    'Analyze the following document and suggest relevant tags or labels for categorization. Provide a comma-separated list of 3-7 tags that best describe the document''s content, topic, or type. Respond with ONLY the tags, no explanations.

Document content:
{{documentContent}}

Tags:',
    1
)
ON CONFLICT (job_type) DO NOTHING;

-- Summary generation prompt
INSERT INTO prompts (job_type, template, version)
VALUES (
    'summary',
    'Create a brief summary of the following document. The summary should be 2-4 sentences long and capture the key information and main points. Be concise and informative.

Document content:
{{documentContent}}

Summary:',
    1
)
ON CONFLICT (job_type) DO NOTHING;
