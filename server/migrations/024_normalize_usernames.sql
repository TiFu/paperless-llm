-- Migration 024: Normalize usernames to lowercase
--
-- Paperless authenticates usernames case-insensitively, but this app keyed
-- everything off whatever casing was typed at login. The same real person
-- logging in as e.g. "Tino" and "tino" ended up as two separate `users`
-- rows with disjoint job/entity/prompt permissions -- among other things,
-- this made the auto-queue's per-user "already in progress" check blind to
-- jobs owned by the other casing, so documents got silently marked as
-- skipped with no job visible to the user who queued them.
--
-- This merges every group of case-variant `users` rows into a single
-- canonical lowercase row (keeping the most-recently-logged-in row's
-- Paperless token), repointing permissions/entity_visibility/prompts/
-- app_settings.updated_by along the way. The application is updated
-- separately to always lowercase usernames going forward -- this is a
-- one-time cleanup for data written before that change.

DO $$
DECLARE
  grp RECORD;
  dup RECORD;
BEGIN
  -- Every case-insensitive username group that either has more than one
  -- distinct casing on file, or a single row that isn't lowercase yet.
  FOR grp IN
    SELECT lower(username) AS new_username
    FROM users
    GROUP BY lower(username)
    HAVING count(*) > 1 OR max(username) <> lower(username)
  LOOP
    -- Ensure the canonical lowercase row exists, seeded from whichever
    -- casing in the group logged in most recently (its token is the most
    -- likely to still be valid).
    INSERT INTO users (username, paperless_token, last_login)
    SELECT grp.new_username, u.paperless_token, u.last_login
    FROM users u
    WHERE lower(u.username) = grp.new_username
    ORDER BY u.last_login DESC
    LIMIT 1
    ON CONFLICT (username) DO UPDATE SET
      paperless_token = EXCLUDED.paperless_token,
      last_login = GREATEST(users.last_login, EXCLUDED.last_login);

    -- Merge every other casing in this group into the canonical row, one
    -- at a time (not one bulk UPDATE) so that two duplicates each holding
    -- an equivalent grant/customization can't collide with each other
    -- within the same statement.
    FOR dup IN
      SELECT username AS old_username
      FROM users
      WHERE lower(username) = grp.new_username
        AND username <> grp.new_username
    LOOP
      UPDATE permissions SET username = grp.new_username
      WHERE username = dup.old_username
        AND NOT EXISTS (
          SELECT 1 FROM permissions p2
          WHERE p2.username = grp.new_username
            AND p2.type = permissions.type
            AND p2.referenced_object_id = permissions.referenced_object_id
        );

      UPDATE entity_visibility SET username = grp.new_username
      WHERE username = dup.old_username
        AND NOT EXISTS (
          SELECT 1 FROM entity_visibility ev2
          WHERE ev2.username = grp.new_username
            AND ev2.entity_type = entity_visibility.entity_type
            AND ev2.paperless_id = entity_visibility.paperless_id
        );

      UPDATE prompts SET username = grp.new_username
      WHERE username = dup.old_username
        AND NOT EXISTS (
          SELECT 1 FROM prompts pr2
          WHERE pr2.username = grp.new_username
            AND pr2.step_type = prompts.step_type
        );

      UPDATE app_settings SET updated_by = grp.new_username
      WHERE updated_by = dup.old_username;

      -- Drop the now-redundant row. ON DELETE CASCADE cleans up any
      -- leftover permissions/entity_visibility/prompts rows that couldn't
      -- be repointed above because the canonical user already had an
      -- equivalent one.
      DELETE FROM users WHERE username = dup.old_username;
    END LOOP;
  END LOOP;
END $$;
