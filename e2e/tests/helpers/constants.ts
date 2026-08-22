// Tag name baked into the stub LLM's deterministic response (e2e/stub-llm/server.mjs).
// PaperlessService.updateDocument only resolves *existing* tag names to ids — it never
// creates them — so tests must create this tag in Paperless before a job can apply it.
export const STUB_LLM_TAG = 'e2e-generated-tag';

// Configured in global-setup.ts as the Auto-Queue trigger tag (paperless.autoProcessTags).
// Any document carrying this tag gets an automated job started on it in the background
// within a few seconds — keep this distinct from DEFAULT_TAG_FILTER, or a document
// uploaded for a *manual* Documents-page workflow gets raced and claimed by Auto-Queue
// first, which flips it to in-progress and hides it from the (default-filtered) UI list.
export const AUTO_QUEUE_TAG = 'e2e-process';

// The Documents page lists documents carrying the default tag filter configured via
// PUT /api/settings (see global-setup.ts's paperless.tags). Must stay different from
// AUTO_QUEUE_TAG — see the comment above.
export const DEFAULT_TAG_FILTER = 'e2e-manual';

// Must match the FAILURE_TRIGGER constant in e2e/stub-llm/server.mjs. Putting this
// in a document's title forces every LLM call made while processing that document
// to fail, deterministically — see LLM_GENERATE_TAGS's prompt template, which
// interpolates {{documentTitle}}.
export const LLM_FAILURE_TRIGGER = 'FORCE_LLM_FAILURE';
