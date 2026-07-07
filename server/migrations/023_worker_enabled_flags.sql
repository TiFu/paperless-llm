-- Migration 023: per-worker enabled flags
-- Adds enabled toggles for step_execution, stuck_step_reset, and entity_sync
-- (auto_queue already had one from migration 022). Default true for these
-- three since they're the app's core loops and have always run
-- unconditionally until now.

ALTER TABLE app_settings
  ADD COLUMN step_execution_enabled  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN stuck_step_reset_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN entity_sync_enabled     BOOLEAN NOT NULL DEFAULT true;
