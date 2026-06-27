# Development Guide

This guide covers everything you need to set up a local development environment, contribute changes, run and write tests, manage database migrations, and debug common problems in Paperless-LLM.

## Prerequisites

### Required

- **Docker** (20.10+) and **Docker Compose** (2.0+)

  ```bash
  docker --version
  docker compose version
  ```

- Basic familiarity with TypeScript, Node.js, and React.

### Optional but Recommended

- **Ollama** - local LLM runtime, used by the workers to generate document metadata.

  ```bash
  curl -fsSL https://ollama.com/install.sh | sh
  ollama pull llama3
  ```

- **PostgreSQL client tools** - for direct database access.

  ```bash
  # Ubuntu/Debian
  sudo apt install postgresql-client

  # macOS
  brew install postgresql
  ```

- **VS Code** with the ESLint, Prettier, Docker, and PostgreSQL extensions.

## Local Setup

There are two supported ways to run the stack locally: a Docker Compose environment that provisions all infrastructure (Postgres, Redis, Paperless-ngx) plus the app, or running Postgres/Paperless/Ollama as supporting services while the API server, worker, and frontend run directly on your machine via the `dev-*.sh` helper scripts. Both are described below; pick whichever fits your workflow.

### First setup

```
cd frontend && npm install
cd server && npm install
cp config.example.yaml config.yaml 
# Edit config to suit local environment
```

### Docs Site

The documentation site (what you're reading now) is built with [MkDocs](https://www.mkdocs.org/) and the [Material](https://squidfunk.github.io/mkdocs-material/) theme, configured in `mkdocs.yml` at the repo root.

```bash
pip install -r docs/requirements.txt
mkdocs serve
```

This serves the site locally at `http://localhost:8000` with live reload on changes to `docs/`. Note this conflicts with the Paperless-ngx dev port (also 8000); use `mkdocs serve -a localhost:8001` if you're running both at once.

### Docker Compose Dev Environment

The `docker/docker-compose.dev.yml` file defines the full development stack:

| Service | Container Name | Purpose |
|---|---|---|
| `pllm-postgres` | `pllm-postgres-dev` | Paperless-LLM database (port 5432) |
| `pllm-redis` | `pllm-redis-dev` | Redis for Paperless-LLM |
| `paperless-postgres` | `paperless-postgres-dev` | Paperless-ngx database (port 5433) |
| `redis` | `paperless-redis-dev` | Redis for Paperless-ngx |
| `paperless` | `paperless-ngx-dev` | Paperless-ngx document management (port 8000) |
| `dev` | `pllm-app-dev` | Combined dev container with the repo mounted at `/app` |

All services use `network_mode: host`, so ports are exposed directly on localhost rather than via Docker's bridge networking.

**Start the stack:**

```bash
cd docker
docker compose -f docker-compose.dev.yml up -d
```

The `dev` (`pllm-app-dev`) container does not start the API/worker/frontend automatically — its `command` drops you into a shell with the repository mounted at `/app`, so you can run the same `npm` commands described below from inside the container.

**Set up Paperless-ngx and configure the app:**

1. Wait for `paperless-ngx-dev` to report healthy (`docker compose -f docker-compose.dev.yml logs -f paperless-ngx-dev`), then open `http://localhost:8000` and log in with `admin` / `admin` (or the `PAPERLESS_ADMIN_USER`/`PAPERLESS_ADMIN_PASSWORD` you set).

Here you can also upload some dummy documents to run tests

**Shell into a container:**

```bash
# To execute dev-frontent-start.sh and dev-server-start.sh
docker exec -it pllm-app-dev /bin/bash
# To get a better idea of the DB
docker exec -it pllm-postgres-dev psql -U paperless_llm -d paperless_llm_dev
```

### Accessing the applicationn

* API: http://localhost:3000
* Frontend: http://localhost:5173
* Paperless: http://localhost:8000
* Postgres: localhost, port 5432


## Making Changes

- Backend changes go in `server/src/`.
- Frontend changes go in `frontend/src/`.
- For API updates always start from server/docs/openapi.yaml, update this then run `npm generate:api` in both `server` and `frontend` to generate client & DTOs
- Both dev servers hot-reload: the backend via `nodemon` (restarts on save), the frontend via Vite HMR (instant browser updates, no full reload).

### Writing Tests

All new features and bug fixes should include tests. See [Testing](#testing) for full details on running and structuring tests. At minimum:

- Add or update unit tests under `server/tests/unit/` for new domain/application logic.
- Add integration tests under `server/tests/integration/` for anything that touches the database or crosses multiple layers.
- Don't commit a PR with failing or skipped tests.

### Linting

```bash
# Backend
cd server
npm run lint

# Frontend
cd frontend
npm run lint
```

Both run ESLint against `src`. Neither package currently defines a `lint:fix`, `format`, or `type-check` script — if you want auto-fixing, run `eslint src --ext ts --fix` (backend) or `eslint src --ext ts,tsx --fix` (frontend) directly, and use `npx tsc --noEmit` for a standalone type check.

### Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat(worker): add concurrent step processing"
git commit -m "fix(api): resolve CORS issue with frontend"
git commit -m "docs(readme): update installation instructions"
```

Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`.

CI lints every pull request's commit messages against this convention (the `commitlint` job in `.github/workflows/ci.yml`, using [commitlint](https://commitlint.js.org/)). To catch violations locally before pushing, install a `commit-msg` hook that runs the same check on each commit:

```bash
npm install --no-save @commitlint/cli @commitlint/config-conventional

mkdir -p .git/hooks
cat > .git/hooks/commit-msg <<'EOF'
#!/usr/bin/env sh
npx --no -- commitlint --edit "$1" --extends @commitlint/config-conventional
EOF
chmod +x .git/hooks/commit-msg
```

This rejects non-conventional commit messages immediately instead of waiting for CI to catch them.

### Pull Request Process

Before opening a PR:

```bash
git fetch origin
git rebase origin/main

cd server && npm run lint && npm test
cd ../frontend && npm run lint && npm test
```

Checklist:

- [ ] Code follows the standards below
- [ ] Tests added/updated and passing
- [ ] Linting passes
- [ ] Documentation updated if behavior or configuration changed
- [ ] Commit messages follow Conventional Commits
- [ ] Branch is rebased on current `main`

PR description should cover: what changed and why, the type of change (bug fix / feature / breaking change / docs), the related issue (if any), and what testing was done (unit, integration, manual).

Once opened, automated checks (lint, tests, build) run, then a maintainer reviews for correctness, code quality, test coverage, and documentation. Address review feedback by pushing additional commits to the same branch. PRs are typically squash-merged. After merge, delete your branch and update your local `main`.


## Testing

### Running Tests

```bash
# Backend (from server/)
npm test               # run the full suite
npm run test:unit      # unit tests only (server/tests/unit)
npm run test:integration  # integration tests only (server/tests/integration)
npm run test:coverage  # generate a coverage report
```

Backend tests are configured in `server/jest.config.cjs` with two Jest "projects": `unit` (matching `tests/unit/**/*.test.ts`) and `integration` (matching `tests/integration/**/*.test.ts`, with a longer 60s timeout since these touch the database). `npm test` runs both projects; `test:unit`/`test:integration` run one at a time via `--selectProject`.

## Database Migrations

Migrations live in `server/migrations/` as numbered SQL files (e.g. `001_initial-schema.sql`, `002_seed-default-prompts.sql`, `003_add_step_retry_tracking.sql`, ...) and are managed by [node-pg-migrate](https://salsita.github.io/node-pg-migrate/). The connection details and migrations directory used by node-pg-migrate are derived from the same `config.yaml` the application uses (see `server/src/infrastructure/migrate-config.ts`), not from separate `DB_*` environment variables.

### Automatic Execution on Startup

Migrations run automatically whenever the server starts, in both `--mode=server` and `--mode=worker` (and `--mode=all`). On startup (`server/src/main.ts`), the process:

1. Connects to the database.
2. Acquires a PostgreSQL advisory lock so only one instance runs migrations at a time — other instances starting concurrently wait for the lock to release.
3. Runs all pending migrations in order via `node-pg-migrate` (see `server/src/infrastructure/MigrationRunner.ts`).
4. Logs migration status.
5. Releases the lock and proceeds with normal startup.

If migrations fail, the process exits with an error. This makes it safe to start multiple replicas/containers at once (Docker Compose, Kubernetes, or several `dev-server-start.sh`/`dev-worker-start.sh` instances) without risking duplicate or conflicting migration runs.

