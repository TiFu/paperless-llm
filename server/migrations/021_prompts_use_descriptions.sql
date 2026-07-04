-- Migration 021: Update default prompts to make use of entity descriptions
-- Tags, correspondents, and document types can now have a description
-- (see 018_entity_descriptions.sql). PromptDomainService already renders
-- these as a `description` attribute on each <availableTag>/<availableCorrespondent>/
-- <availableDocumentType> element, but the prompt instructions never told the
-- model that the attribute exists or how to use it. This only updates the
-- global default prompts (username IS NULL); per-user prompt overrides are
-- left untouched.
-- Up Migration

-- LLM_GENERATE_TAGS (use descriptions)
INSERT INTO prompts (step_type, template, version)
VALUES (
    'LLM_GENERATE_TAGS',
    'Analyze the following document and generate relevant tags for categorization and searchability. Some available tags include a description attribute clarifying their intended use - use these descriptions to choose the most accurate tags. Return ONLY a comma-separated list of tags, no explanations.

Document content:
{{documentContent}}
Document title:
{{documentTitle}}
Document tags:
{{documentTags}}
Available tags:
{{availableTags}}

Tags:',
    4
)
ON CONFLICT (step_type) WHERE username IS NULL DO UPDATE SET template=EXCLUDED.template, version=EXCLUDED.version;

-- LLM_GENERATE_CORRESPONDENT (use descriptions)
INSERT INTO prompts (step_type, template, version)
VALUES (
    'LLM_GENERATE_CORRESPONDENT',
    'Identify the correspondent (sender, author, or organization) of the following document. Some available correspondents include a description attribute clarifying who they are - use these descriptions to pick the correct match. Return ONLY the correspondent name, no explanations.

Document content:
{{documentContent}}
Document title:
{{documentTitle}}
Document correspondent:
{{documentCorrespondent}}
Available correspondents:
{{availableCorrespondents}}

Correspondent:',
    4
)
ON CONFLICT (step_type) WHERE username IS NULL DO UPDATE SET template=EXCLUDED.template, version=EXCLUDED.version;

-- LLM_GENERATE_DOCUMENT_TYPE (use descriptions)
INSERT INTO prompts (step_type, template, version)
VALUES (
    'LLM_GENERATE_DOCUMENT_TYPE',
    'Classify the document type (e.g., invoice, receipt, letter, contract, report, statement). Some available document types include a description attribute clarifying when they apply - use these descriptions to choose the most accurate type. Return ONLY the document type, no explanations.

Document content:
{{documentContent}}
Document title:
{{documentTitle}}
Document type:
{{documentType}}
Available document types:
{{availableDocumentTypes}}

Document Type:',
    4
)
ON CONFLICT (step_type) WHERE username IS NULL DO UPDATE SET template=EXCLUDED.template, version=EXCLUDED.version;

-- Down Migration
-- (Optional) You may want to restore previous templates or decrement version if rolling back.
