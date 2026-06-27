## Prompt customization

LLM steps (title, tags, correspondent, document type, created date generation) each render a prompt template before calling the LLM. Templates are stored in Postgres, not `config.yaml`, and can be edited live without a restart.

### Available variables

Templates use `{{variableName}}` placeholders, substituted by [`PromptDomainService.renderPrompt()`](server.md) before the prompt is sent to the LLM:

| Variable | Description |
|---|---|
| `{{documentContent}}` | Full text content of the document, wrapped in `<content>...</content>`. |
| `{{documentTitle}}` | Current document title, or `(No title)` if unset. |
| `{{documentTags}}` | Tags currently assigned to the document. |
| `{{documentType}}` | Current document type, or `(No document type)` if unset. |
| `{{documentCorrespondent}}` | Current correspondent, or `(No correspondent)` if unset. |
| `{{availableTags}}` | All tags known to Paperless, with descriptions where set (see [entity descriptions](architecture/backend.md)). |
| `{{availableCorrespondents}}` | All correspondents known to Paperless, with descriptions where set. |
| `{{availableDocumentTypes}}` | All document types known to Paperless, with descriptions where set. |

If a placeholder has no matching variable, it's left in the rendered prompt as literal text (`{{typoedVariable}}`) — no error is raised, so check the LLM's actual input if output looks wrong.

### How prompts work

Prompts live in the `prompts` table (`step_type` unique, `template`, `version`), seeded with minimal defaults by the migrations. When a step that `needsPrompt()` runs, it fetches its prompt by step type, renders it via `Prompt.render()`, and sends the result to the LLM. Updating a prompt via the API automatically increments its version — there's no built-in rollback, so keep a copy of a working template before experimenting.

Step types that currently use a prompt: `LLM_GENERATE_TITLE`, `LLM_GENERATE_TAGS`, `LLM_GENERATE_CORRESPONDENT`, `LLM_GENERATE_DOCUMENT_TYPE`, `LLM_GENERATE_CREATED_DATE`. `REQUIRE_APPROVAL`, `UPDATE_DOCUMENT`, and `REMOVE_TAGS` are non-LLM steps and don't use prompts.

### Customizing prompts

Via the API:

```bash
curl -X PUT http://localhost:3000/api/prompts/LLM_GENERATE_TITLE \
  -H "Content-Type: application/json" \
  -d '{
    "template": "Create a short title for this document:\n\n{{documentContent}}\n\nTitle:"
  }'
```

Or via the frontend's Prompts page, which lists and edits templates through the same endpoint.

### Best practices

- **Be specific.** `Generate a concise, descriptive title. Respond with ONLY the title, no explanations or quotes.` produces more usable output than a bare `{{documentContent}}`.
- **Constrain the output format explicitly**, especially for tags/structured fields (e.g. `Respond with a JSON array of strings`).
- **Give the LLM context** about what the output is for (a document management system, end users searching later, etc.).
- **Handle edge cases** — short, blank, or unusual documents — with a fallback instruction so the LLM doesn't produce garbage when it has little to work with.
- **Iterate with real documents** and keep the template version history in mind; there's no automatic rollback.

### Troubleshooting

**Variables not replaced** — the prompt sent to the LLM still contains `{{documentContent}}` literally: double check spelling/casing against the table above; unknown variables are silently left as-is.

**Prompt too long / LLM token-limit errors** — there's no automatic document-content truncation in the current rendering path; trim the prompt instructions themselves, or use a model/context window that fits your typical document length.

**Inconsistent output** — add explicit format constraints, lower `llm.temperature`, or try a different model.
