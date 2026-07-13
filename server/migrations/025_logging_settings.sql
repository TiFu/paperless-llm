-- Migration 025: Per-area, runtime-configurable logging levels.
-- Adds logging.default/logging.levels to the app_settings singleton row
-- (see migration 022), polled into memory by AppConfig the same way as
-- every other live setting. logging_levels defaults to an empty object —
-- areas absent from it fall back to logging_default, so adding a new
-- LogArea later needs no migration/backfill.

ALTER TABLE app_settings
  ADD COLUMN logging_default TEXT NOT NULL DEFAULT 'info',
  ADD COLUMN logging_levels JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN app_settings.logging_default IS 'Fallback log level for any LogArea not present in logging_levels.';
COMMENT ON COLUMN app_settings.logging_levels IS 'Per-LogArea level overrides, e.g. {"http":"info","workflow":"debug"}. See server/src/utils/LogArea.ts.';
