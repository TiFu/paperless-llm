# Database Migrations

This directory contains SQL migration files for the Paperless LLM application.

## Migration Files

1. **001_create_audit_log_table.sql** - Creates the audit log table to track all document modifications
2. **002_create_llm_work_queue_table.sql** - Creates the LLM work queue for processing jobs
3. **003_create_document_update_work_queue_table.sql** - Creates the document update work queue
4. **004_create_prompts_table.sql** - Creates the prompts table for LLM templates
5. **005_seed_default_prompts.sql** - Seeds default prompt templates for title, tag, and summary generation

## Running Migrations

### Using psql

To run all migrations in order:

```bash
# Connect to your database and run each migration
psql -h localhost -U your_username -d your_database -f server/migrations/001_create_audit_log_table.sql
psql -h localhost -U your_username -d your_database -f server/migrations/002_create_llm_work_queue_table.sql
psql -h localhost -U your_username -d your_database -f server/migrations/003_create_document_update_work_queue_table.sql
psql -h localhost -U your_username -d your_database -f server/migrations/004_create_prompts_table.sql
```

Or run all at once:

```bash
cat server/migrations/*.sql | psql -h localhost -U your_username -d your_database
```

### Using Docker Compose

If you're using the Docker setup, you can copy the migration files into the container:

```bash
# Copy migrations to the PostgreSQL container
docker cp server/migrations/. paperless-llm-db:/migrations/

# Execute migrations
docker exec -i paperless-llm-db psql -U postgres -d paperless_llm < /migrations/001_create_audit_log_table.sql
docker exec -i paperless-llm-db psql -U postgres -d paperless_llm < /migrations/002_create_llm_work_queue_table.sql
docker exec -i paperless-llm-db psql -U postgres -d paperless_llm < /migrations/003_create_document_update_work_queue_table.sql
docker exec -i paperless-llm-db psql -U postgres -d paperless_llm < /migrations/004_create_prompts_table.sql
```

### Docker Init Script

For automatic migrations on container startup, you can mount the migrations directory in your docker-compose.yml:

```yaml
services:
  db:
    image: postgres:15
    volumes:
      - ./server/migrations:/docker-entrypoint-initdb.d
```

The PostgreSQL Docker image will automatically execute all `.sql` files in `/docker-entrypoint-initdb.d` on first startup, in alphabetical order.

## Schema Overview

### audit_log
Stores a complete audit trail of all document modifications.
- Indexed on document_id, created_at, and status for efficient queries
- Tracks before/after values and success/failure status

### llm_work_queue
Queue for LLM processing jobs that need to be executed.
- Supports job claiming with timeout handling
- Includes retry logic with exponential backoff
- Optimized indexes for queue processing

### document_update_work_queue
Queue for document update actions that need to be executed against the document management system.
- Supports job claiming with timeout handling
- Stores action payload as JSONB for flexibility
- Includes retry logic with exponential backoff

### prompts
Stores LLM prompt templates with versioning support.
- Each job_type has a unique prompt template
- Version tracking for prompt evolution
- Supports upsert operations with automatic version incrementing
