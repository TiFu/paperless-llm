-- Migration: User Authentication
-- Adds users table, permissions table, entity_visibility table, and per-user prompts

-- ============================================================================
-- USERS TABLE
-- Stores known authenticated users and their Paperless API tokens
-- ============================================================================
CREATE TABLE users (
  username     VARCHAR(255) PRIMARY KEY,
  paperless_token TEXT NOT NULL,
  last_login   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PERMISSIONS TABLE
-- Tracks ownership/access for UUID-keyed resources (jobs, etc.)
-- ============================================================================
CREATE TABLE permissions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                 VARCHAR(64) NOT NULL,
  username             VARCHAR(255) NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  referenced_object_id UUID NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (type, username, referenced_object_id)
);

CREATE INDEX idx_permissions_username_type ON permissions(username, type);
CREATE INDEX idx_permissions_object ON permissions(type, referenced_object_id);

-- ============================================================================
-- ENTITY VISIBILITY TABLE
-- Tracks which Paperless entities (tags/correspondents/doc_types) each user
-- can see based on their Paperless permissions. Updated by entity sync.
-- ============================================================================
CREATE TABLE entity_visibility (
  entity_type  VARCHAR(50) NOT NULL,
  paperless_id INTEGER NOT NULL,
  username     VARCHAR(255) NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  PRIMARY KEY (entity_type, paperless_id, username)
);

CREATE INDEX idx_entity_visibility_user ON entity_visibility(username, entity_type);

-- ============================================================================
-- PROMPTS: add per-user column
-- NULL username = global default; non-NULL = user-specific copy
-- ============================================================================
ALTER TABLE prompts DROP CONSTRAINT IF EXISTS prompts_step_type_key;
DROP INDEX IF EXISTS idx_prompts_step_type;

ALTER TABLE prompts ADD COLUMN username VARCHAR(255) NULL REFERENCES users(username) ON DELETE CASCADE;

-- Unique constraint is now per (step_type, username) pair
-- NULL username means the global default row
CREATE UNIQUE INDEX idx_prompts_step_type_user ON prompts(step_type, username) WHERE username IS NOT NULL;
CREATE UNIQUE INDEX idx_prompts_step_type_global ON prompts(step_type) WHERE username IS NULL;
