# Integration tests

These tests run real implementations against real dependencies — no mocking
of `pg` or the Paperless HTTP API.

- **Repositories** (`tests/integration/repositories/`): run against a real
  PostgreSQL database. A Jest `globalSetup` migrates the database once before
  the suite runs; each test then runs in its own transaction that is always
  rolled back afterward (see `tests/integration/helpers/db.ts`), so tests
  don't need to clean up after themselves and can't see each other's data
  (except for rows seeded by migrations themselves, e.g. the default prompts
  from `002_seed-default-prompts.sql` / `017_update_minimal_prompts.sql`,
  which persist for the lifetime of the database).
- **PaperlessService** (`tests/integration/services/`): runs against a real
  paperless-ngx instance. Paperless has no transaction-rollback equivalent to
  fall back on, so each test tracks what it creates and cleans it up itself
  in `afterEach` — safe to run repeatedly against the same instance.

`npm run test:integration` runs both suites together, so both dependencies
need to be up.

## Running locally

`docker/docker-compose.integration-test.yml` brings up both dependencies
with credentials/ports matching the defaults in
`tests/integration/helpers/dbConfig.ts` and `paperlessClient.ts`, so no env
vars are needed against it. From the repo root:

```bash
docker compose -f docker/docker-compose.integration-test.yml up -d --wait
```

Then, from `server/`:

```bash
npm run test:integration
```

Tear down when done:

```bash
docker compose -f docker/docker-compose.integration-test.yml down -v
```

### Using your own Postgres/Paperless instead

If you'd rather point at instances you already have running, set:

```bash
DB_HOST=... DB_PORT=... DB_USER=... DB_PASSWORD=... DB_NAME=... \
PAPERLESS_URL=... PAPERLESS_ADMIN_USER=... PAPERLESS_ADMIN_PASSWORD=... \
  npm run test:integration
```

Both helpers fall back to the same defaults as
`docker-compose.integration-test.yml` when a var is omitted.

## CI

CI (`.github/workflows/ci.yml`'s `server` job) doesn't use this compose file
directly — Postgres/Redis come from GitHub Actions' native `services:` block
(shared with `test:unit`), and Paperless is brought up via
`docker compose -f docker/docker-compose.e2e.yml up -d paperless` (the same
paperless-ngx config, reused from the e2e stack). Both land on the same
`localhost:5432`/`localhost:8000` defaults either way.
