-- Migration 022: Non-technical settings (live-editable, DB-backed)
-- Moves paperless.tags/autoProcessTags, workers.{stepExecution,stuckStepReset,
-- entitySync,autoQueue}, retry.*, and llm.{model,temperature,timeoutMs} out of
-- config.yaml into a singleton row, polled into memory by AppConfig in both
-- server and worker processes (see server/src/config/AppConfig.ts).
--
-- Defaults below are LITERAL copies of config.example.yaml's previous
-- defaults, not read from any existing config.yaml (migrations can't see the
-- operator's file). Anyone upgrading with custom values for these fields
-- must re-enter them via the new Settings UI/API after this migration runs.

CREATE TABLE app_settings (
  id                                  SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  paperless_tags                      TEXT NULL DEFAULT 'paperless-llm',
  paperless_auto_process_tags         JSONB NOT NULL DEFAULT '[{"tag": "paperless-llm-auto", "fields": ["title"], "workflowType": "approval"}]'::jsonb,
  step_execution_batch_size           INTEGER NOT NULL DEFAULT 5,
  step_execution_poll_interval_ms     INTEGER NOT NULL DEFAULT 30000,
  stuck_step_reset_timeout_ms         INTEGER NOT NULL DEFAULT 300000,
  stuck_step_reset_check_interval_ms  INTEGER NOT NULL DEFAULT 30000,
  entity_sync_poll_interval_ms        INTEGER NOT NULL DEFAULT 900000,
  auto_queue_enabled                  BOOLEAN NOT NULL DEFAULT false,
  auto_queue_poll_interval_ms         INTEGER NOT NULL DEFAULT 60000,
  retry_max_retries                   INTEGER NOT NULL DEFAULT 3,
  retry_delay_in_ms                   INTEGER NOT NULL DEFAULT 30000,
  retry_exponent                      INTEGER NOT NULL DEFAULT 2,
  llm_model                           TEXT NOT NULL DEFAULT 'qwen3:4b',
  llm_temperature                     REAL NOT NULL DEFAULT 0.7,
  llm_timeout_ms                      INTEGER NOT NULL DEFAULT 60000,
  updated_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by                          VARCHAR(255) NULL REFERENCES users(username)
);

COMMENT ON TABLE app_settings IS 'Singleton row (id=1) of non-technical, live-editable settings, polled into memory by AppConfig.';
COMMENT ON COLUMN app_settings.paperless_auto_process_tags IS 'Array of {tag, fields, workflowType} objects - see AutoProcessTagConfig.';

INSERT INTO app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Allow non-job-scoped audit events (settings changes aren't tied to a job).
ALTER TABLE audit_log ALTER COLUMN job_id DROP NOT NULL;

ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS chk_audit_log_event_type;
ALTER TABLE audit_log ADD CONSTRAINT chk_audit_log_event_type CHECK (
  event_type IN (
    'JOB_CREATED','JOB_COMPLETED','JOB_FAILED','ERROR','STEP_CREATED','STEP_EXECUTED','STEP_COMPLETED',
    'DECISION_REQUESTED','DECISION_SUBMITTED','STEP_MANUALLY_RETRIED','STEP_CANCELLED','STUCK_STEP_RESET',
    'SETTINGS_UPDATED'
  )
);
