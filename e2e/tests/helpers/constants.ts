// Tag name baked into the stub LLM's deterministic response (e2e/stub-llm/server.mjs).
// PaperlessService.updateDocument only resolves *existing* tag names to ids — it never
// creates them — so tests must create this tag in Paperless before a job can apply it.
export const STUB_LLM_TAG = 'e2e-generated-tag';

// Must match docker/e2e-config.yaml's workers.autoQueue.tag.
export const AUTO_QUEUE_TAG = 'e2e-process';

// The Documents page lists documents carrying the default tag filter configured via
// PUT /api/settings (see global-setup.ts's paperless.tags). Kept as its own constant
// even though it happens to share AUTO_QUEUE_TAG's value — they're separate settings.
export const DEFAULT_TAG_FILTER = 'e2e-process';

// Must match the FAILURE_TRIGGER constant in e2e/stub-llm/server.mjs. Putting this
// in a document's title forces every LLM call made while processing that document
// to fail, deterministically — see LLM_GENERATE_TAGS's prompt template, which
// interpolates {{documentTitle}}.
export const LLM_FAILURE_TRIGGER = 'FORCE_LLM_FAILURE';
