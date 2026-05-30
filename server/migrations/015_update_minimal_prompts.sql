-- Migration 015: Update prompts to minimal variable set for each type
-- Up Migration

-- LLM_GENERATE_TAGS (minimal)
INSERT INTO prompts (step_type, template, version)
VALUES (
    'LLM_GENERATE_TAGS',
    'Analyze the following document and generate relevant tags for categorization and searchability. Return ONLY a comma-separated list of tags, no explanations.\n\nDocument content:\n{{documentContent}}\nDocument title:\n{{documentTitle}}\nDocument tags:\n{{documentTags}}\nAvailable tags:\n{{availableTags}}\n\nTags:',
    3
)
ON CONFLICT (step_type) DO UPDATE SET template=EXCLUDED.template, version=EXCLUDED.version;

-- LLM_GENERATE_CORRESPONDENT (minimal)
INSERT INTO prompts (step_type, template, version)
VALUES (
    'LLM_GENERATE_CORRESPONDENT',
    'Identify the correspondent (sender, author, or organization) of the following document. Return ONLY the correspondent name, no explanations.\n\nDocument content:\n{{documentContent}}\nDocument title:\n{{documentTitle}}\nDocument correspondent:\n{{documentCorrespondent}}\nAvailable correspondents:\n{{availableCorrespondents}}\n\nCorrespondent:',
    3
)
ON CONFLICT (step_type) DO UPDATE SET template=EXCLUDED.template, version=EXCLUDED.version;

-- LLM_GENERATE_DOCUMENT_TYPE (minimal)
INSERT INTO prompts (step_type, template, version)
VALUES (
    'LLM_GENERATE_DOCUMENT_TYPE',
    'Classify the document type (e.g., invoice, receipt, letter, contract, report, statement). Return ONLY the document type, no explanations.\n\nDocument content:\n{{documentContent}}\nDocument title:\n{{documentTitle}}\nDocument type:\n{{documentType}}\nAvailable document types:\n{{availableDocumentTypes}}\n\nDocument Type:',
    3
)
ON CONFLICT (step_type) DO UPDATE SET template=EXCLUDED.template, version=EXCLUDED.version;

-- LLM_GENERATE_CREATED_DATE (minimal)
INSERT INTO prompts (step_type, template, version)
VALUES (
    'LLM_GENERATE_CREATED_DATE',
    'Extract the creation date or document date from the following document. Return ONLY the date in ISO 8601 format (YYYY-MM-DD), or "UNKNOWN" if no date is found.\n\nDocument content:\n{{documentContent}}\nDocument title:\n{{documentTitle}}\n\nDate:',
    3
)
ON CONFLICT (step_type) DO UPDATE SET template=EXCLUDED.template, version=EXCLUDED.version;

-- Down Migration
-- (Optional) You may want to restore previous templates or decrement version if rolling back.
