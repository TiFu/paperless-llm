#!/bin/bash
set -e

echo "🔧 Initializing PostgreSQL database..."

# NOTE: This script now only creates the database structure.
# Database migrations are automatically executed by the API server (api.ts)
# on startup using node-pg-migrate with advisory locks for safe concurrent execution.

# The PostgreSQL container is configured via POSTGRES_DB, POSTGRES_USER, and
# POSTGRES_PASSWORD environment variables in docker-compose.dev.yml.
# The database is created automatically on first container startup.

# For manual migration management, use:
# - npm run migrate:create <name>  - Create a new migration file
# - npm run migrate:up            - Run pending migrations manually
# - npm run migrate:down          - Rollback the last migration

echo "✅ Database initialization complete!"
echo ""
echo "Migrations will run automatically when the API server starts."
echo "Check the API logs for migration status."
