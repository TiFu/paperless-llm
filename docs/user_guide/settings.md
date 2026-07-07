## Settings

Configuration is split into technical settings (`config.yaml`, restart required — see [Installation > Configuration](../installation/configuration.md)) and non-technical settings, which live in Postgres and can be changed live, without a restart, from the Settings page (or `GET`/`PUT /api/settings`).

### What lives here

| Group | Fields |
|---|---|
| Document filter | `paperless.tags` — the default tag filter used when browsing/listing documents in this app. Independent of automated pickup below. |
| Automated document pickup | `paperless.autoProcessTags` — tags that trigger automatic pickup by the Auto-Queue worker, with per-tag fields/workflow type |
| Worker loops | Each of the four worker loops (Step Execution, Stuck-Step Reset, Entity Sync, Auto-Queue) has its own `enabled` flag plus its own timing fields (batch size/poll interval, stuck timeout/check interval, or poll interval) |
| Retry policy | Max retries, base retry delay, exponential backoff multiplier |
| LLM | Model, temperature, request timeout |

The response also includes two read-only, reference-only sections that aren't editable here: **connected systems** (the Paperless/LLM URLs and database host this deployment is configured against — no credentials) and the list of **prompt variables** available for prompt templates (the same reference shown on the Prompts page — see [Prompt customization](prompts.md)).

### How live-reload works

Each server/worker process holds one `AppConfig` instance that polls the database for the current settings every few seconds. A change made via the Settings page applies to the process that made the change immediately, and to every other running process within one poll interval. Nothing needs to be restarted.

### Pausing a worker loop

Each of the four worker loops (Step Execution, Stuck-Step Reset, Entity Sync, Auto-Queue) can be independently turned off via its `enabled` flag, e.g. to pause document processing for maintenance without stopping the worker process itself. A disabled loop's `WorkerExecutor` keeps ticking on its configured interval but no-ops each cycle rather than doing work — flip `enabled` back on and it resumes on its next tick, no restart needed.

### Who can edit settings

Anyone signed in can view settings (`GET /api/settings`). Editing them (`PUT /api/settings`) requires the `settings` permission, which isn't granted manually — it's synced automatically from Paperless's own `is_superuser` flag every time you log in: if your Paperless account is a superuser, you get edit access; if you're later demoted in Paperless, the next login revokes it. There's no separate local admin concept to manage.

### Customizing settings

Via the API:

```bash
curl -X PUT http://localhost:3000/api/settings \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "paperless": { "tags": "paperless-llm", "autoProcessTags": [{ "tag": "paperless-llm-auto", "fields": ["title"], "workflowType": "approval" }] },
    "workers": {
      "stepExecution": { "enabled": true, "batchSize": 5, "pollIntervalMs": 3000 },
      "stuckStepReset": { "enabled": true, "timeoutMs": 300000, "checkIntervalMs": 30000 },
      "entitySync": { "enabled": true, "pollIntervalMs": 900000 },
      "autoQueue": { "enabled": false, "pollIntervalMs": 60000 }
    },
    "retry": { "maxRetries": 3, "retryDelayInMs": 30000, "retryExponent": 2 },
    "llm": { "model": "qwen3:4b", "temperature": 0.7, "timeoutMs": 30000 }
  }'
```

Or via the frontend's Settings page, which reads and writes through the same endpoint. A `PUT` request must include every field (it fully replaces the row), so start from a `GET /api/settings` response and edit the fields you actually want to change.

### Validation

Invalid values are rejected with a `400` and a list of every problem found (not just the first): batch size/poll intervals/timeouts have minimums, `llm.temperature` must be between 0 and 2, `autoProcessTags` entries need non-empty, unique tag names, and enabling the auto-queue requires at least one auto-process tag. A rejected request never partially updates the row.

### Upgrading from an older version

If you previously set `paperless.tags`/`autoProcessTags`, `llm.model`/`temperature`/`timeoutMs`, any `workers.*` sub-section, or `retry.*` in `config.yaml`, those keys are no longer read — the migration that introduces this table seeds it with the same defaults `AppConfig` used to fall back to, not your previous custom values. Re-enter any customizations via the Settings page after upgrading, then remove the now-unused keys from your `config.yaml`.
