#!/bin/bash
set -e

echo "🔧 Initializing PostgreSQL databases..."

# Create paperless database and user
echo "📦 Creating paperless database..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create paperless user if it doesn't exist
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'paperless') THEN
            CREATE USER paperless WITH PASSWORD 'paperless';
        END IF;
    END
    \$\$;

    -- Create paperless database if it doesn't exist
    SELECT 'CREATE DATABASE paperless OWNER paperless'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'paperless')\gexec

    -- Grant privileges
    GRANT ALL PRIVILEGES ON DATABASE paperless TO paperless;
EOSQL

echo "✅ Paperless database and user created"

# Run paperless-llm migrations
if [ -d "/migrations" ]; then
    echo "📦 Running paperless-llm migrations..."
    for migration in /migrations/*.sql; do
        if [ -f "$migration" ]; then
            echo "  ▶ Running $(basename $migration)..."
            psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$migration"
        fi
    done
    echo "✅ Paperless-llm migrations completed"
else
    echo "⚠️  No migrations directory found at /migrations"
fi

echo "✅ Database initialization complete!"
