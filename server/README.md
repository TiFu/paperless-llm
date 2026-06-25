# Database Migrations

This directory contains SQL migration files for the Paperless LLM application, managed by [node-pg-migrate](https://salsita.github.io/node-pg-migrate/).

## 🚀 Automatic Migration Execution

**Migrations run automatically on startup, for both the API server and worker processes.** No manual intervention is required for normal operation.

When `main.ts` starts (in either `--mode=server` or `--mode=worker`), it:
1. Connects to the database
2. Checks for pending migrations
3. Runs all pending migrations in order
4. Uses PostgreSQL advisory locks to prevent conflicts when multiple API instances start simultaneously
5. Logs migration status
6. Proceeds with normal startup

If migrations fail, the API server will exit with an error code.

## 📋 Migration Files

Migrations are SQL files with timestamp-based naming:

- **1589000000000_initial-schema.sql** - Creates all core tables (jobs, steps, document_actions, prompts)
- **1589000001000_seed-default-prompts.sql** - Seeds default LLM prompt templates

### File Format

Each migration file contains:
- **Up Migration** - Applied when running forward
- **Down Migration** - Applied when rolling back (optional)

Example:
```sql
-- Migration: Description

-- Up Migration
CREATE TABLE example (...);

-- Down Migration
DROP TABLE IF EXISTS example;
```

## 🛠️ Manual Migration Management

### Create a New Migration

```bash
npm run migrate:create <name>
```

Example:
```bash
npm run migrate:create add-tags-table
```

This creates a new timestamped migration file: `TIMESTAMP_add-tags-table.sql`

### Run Migrations Manually

```bash
npm run migrate:up
```

Runs all pending migrations. This is useful for:
- Testing migrations before deploying
- Running migrations in a separate process
- Troubleshooting migration issues

### Rollback Last Migration

```bash
npm run migrate:down
```

Rolls back the most recent migration using its Down Migration section.

**Warning:** Only use rollback in development. In production, create a new forward migration to fix issues.

## 🔒 Concurrency Safety

The migration system uses PostgreSQL advisory locks to ensure safe execution when multiple API instances start simultaneously:

- Only one instance will run migrations at a time
- Other instances wait for migrations to complete
- No duplicate execution or race conditions
- Automatic lock release on completion or failure

This makes the system safe for:
- Kubernetes deployments with multiple replicas
- Docker Compose with multiple API containers
- Development environments with hot-reload

## 🐳 Docker Development

The Docker Compose setup no longer runs migrations via init scripts. Instead:

1. PostgreSQL container creates an empty database
2. API server connects and runs migrations automatically
3. Check API logs to verify migration status:

```bash
docker logs -f pllm-app-dev | grep -i migration
```

## 📊 Migration Tracking

Migration history is stored in the `pgmigrations` table:

```sql
SELECT * FROM pgmigrations ORDER BY run_on DESC;
```

This shows:
- Which migrations have been applied
- When they were applied
- Migration order and timestamps

## 🧪 Testing Migrations

### Test on Fresh Database

```bash
# Drop and recreate database
docker exec pllm-postgres-dev psql -U paperless_llm -c "DROP DATABASE IF EXISTS paperless_llm_dev;"
docker exec pllm-postgres-dev psql -U paperless_llm -c "CREATE DATABASE paperless_llm_dev;"

# Restart API - migrations will run automatically
npm run dev:api
```

### Verify Migration Status

```bash
# Check which migrations have run
docker exec pllm-postgres-dev psql -U paperless_llm -d paperless_llm_dev -c "SELECT * FROM pgmigrations;"

# Check table structure
docker exec pllm-postgres-dev psql -U paperless_llm -d paperless_llm_dev -c "\dt"
```

## 📝 Best Practices

1. **Idempotency**: Use `IF NOT EXISTS` and `IF EXISTS` clauses to make migrations safe to retry
2. **Forward-only**: Prefer creating new migrations over modifying existing ones
3. **Test locally**: Always test migrations on a development database first
4. **Small changes**: Keep migrations focused on a single logical change
5. **Transactions**: Each migration runs in its own transaction automatically
6. **Down migrations**: Optional but recommended for development rollbacks

## 🔧 Environment Configuration

Database connection is configured via environment variables in `migrate-config.ts`:

- `DATABASE_URL` - Full connection string (takes precedence)
- `DB_USER` - Database username (default: `paperless_llm`)
- `DB_PASSWORD` - Database password (default: `devpassword`)
- `DB_HOST` - Database host (default: `localhost`)
- `DB_PORT` - Database port (default: `5432`)
- `DB_NAME` - Database name (default: `paperless_llm_dev`)

These should match your `config.yaml` settings.

## ❌ Troubleshooting

### Migrations Don't Run

1. Check API startup logs for migration errors
2. Verify database connection in `config.yaml`
3. Check `pgmigrations` table exists and is accessible
4. Ensure migration files have correct naming format

### Migration Fails

1. Check the error message in API logs
2. Manually connect to database and inspect state
3. Fix the issue (bad SQL, missing dependencies, etc.)
4. Restart API to retry

### Stuck Migration Lock

If a migration is interrupted and leaves a lock:

```bash
# Connect to database
docker exec -it pllm-postgres-dev psql -U paperless_llm -d paperless_llm_dev

# Release advisory locks
SELECT pg_advisory_unlock_all();
```

### Reset Everything

```bash
# Nuclear option - destroys all data
docker-compose down -v
docker-compose up -d pllm-postgres
npm run dev:api  # Fresh migrations will run
```

## 📚 Schema Overview

### jobs
Central workflow job tracking table.
- Links document IDs to job types and workflow states
- Tracks overall job progress (pending, processing, completed, failed, rejected)
- Indexed on state, document_id, created_at, and completed_at

### steps
Workflow orchestration steps (async task execution units).
- Each step represents an executable unit in a workflow
- States: waiting, in_progress, completed, failed
- Indexed on status+created_at for efficient queue polling

### document_actions
Actions to be applied to documents (replaces JSON serialization).
- Stores individual document modification actions (update_title, add_tag, etc.)
- Links to parent job via foreign key
- Tracks old_value and new_value for each action

### prompts
LLM prompt templates with versioning support.
- Each step_type has a unique prompt template
- Version tracking for prompt evolution
- Templates support {{variable}} placeholders
