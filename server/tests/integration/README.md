# Integration tests

These tests run real repository implementations against a real PostgreSQL
database (no mocking of `pg`). A Jest `globalSetup` migrates the database
once before the suite runs; each test then runs in its own transaction that
is always rolled back afterward (see `tests/integration/helpers/db.ts`), so
tests don't need to clean up after themselves and can't see each other's data
(except for rows seeded by migrations themselves, e.g. the default prompts
from `002_seed-default-prompts.sql` / `017_update_minimal_prompts.sql`, which
persist for the lifetime of the database).

## Running locally

Start a Postgres matching the env vars CI uses (`.github/workflows/ci.yml`'s
`server` job):

```bash
docker run -d --name pllm-test-postgres \
  -e POSTGRES_USER=paperless_llm \
  -e POSTGRES_PASSWORD=testpassword \
  -e POSTGRES_DB=paperless_llm_test \
  -p 5432:5432 \
  postgres:15-alpine
```

Then, from `server/`:

```bash
DB_HOST=localhost DB_PORT=5432 DB_USER=paperless_llm DB_PASSWORD=testpassword DB_NAME=paperless_llm_test \
  npm run test:integration
```

If your local Postgres already matches these defaults, you can omit the env
vars entirely — `tests/integration/helpers/dbConfig.ts` falls back to them.
