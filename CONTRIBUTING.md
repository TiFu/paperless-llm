# Contributing

Thanks for contributing to Paperless-LLM! This is a quick-start guide; the full guide (local setup, architecture, database migrations, debugging) lives at [docs/development.md](docs/development.md) or the built docs site.

## Getting Set Up

```bash
cd frontend && npm install
cd ../server && npm install
cp config.example.yaml config.yaml   # edit to suit your local environment
```

Then either run `./dev-server-start.sh` / `./dev-frontend-start.sh` directly, or use the Docker Compose dev environment — see [docs/development.md](docs/development.md#local-setup) for both options.

## Commit Messages

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

```bash
git commit -m "feat(worker): add concurrent step processing"
git commit -m "fix(api): resolve CORS issue with frontend"
git commit -m "docs(readme): update installation instructions"
```

Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`. CI (`commitlint` job in `.github/workflows/pr.yml`) rejects PRs whose commits don't follow this format, and `feat`/`fix` commits drive the auto-generated [changelog](docs/changelog.md) on each tagged release.

Catch violations locally before pushing by installing a `commit-msg` hook:

```bash
npm install --no-save @commitlint/cli
mkdir -p .git/hooks
cat > .git/hooks/commit-msg <<'EOF'
#!/usr/bin/env sh
npx --no -- commitlint --edit "$1"
EOF
chmod +x .git/hooks/commit-msg
```

## Tests

There are three layers: backend **unit** tests, backend **integration** tests (real Postgres + Paperless-ngx), and **e2e** tests (full stack, driven through a browser with Playwright). Full details, including how each layer is configured and how to point it at your own instances, are in [docs/development.md#testing](docs/development.md#testing).

Run everything at once from the repo root:

```bash
./test-all.sh                                # backend lint/unit, frontend lint/build, integration, e2e, docs refresh
./test-all.sh --skip-e2e                     # skip the slowest layer
./test-all.sh --skip-integration --skip-e2e  # fast inner loop: lint + unit tests + docs only
```

It brings up and tears down the Docker Compose stacks it needs automatically and mirrors the checks CI runs, so a clean local run is a strong signal a PR will pass CI.

Or run each layer by hand:

```bash
# Backend unit tests
cd server && npm run test:unit

# Backend integration tests (needs Postgres + Paperless-ngx)
docker compose -f docker/docker-compose.integration-test.yml up -d --wait
cd server && npm run test:integration
docker compose -f docker/docker-compose.integration-test.yml down -v

# E2E tests (needs the full stack)
docker compose -f docker/docker-compose.e2e.yml up -d --build
cd e2e && npm ci && npx playwright install --with-deps chromium && npm test
docker compose -f docker/docker-compose.e2e.yml down -v
```

Add or update tests for anything you change — new domain/application logic gets unit tests under `server/tests/unit/`, anything touching the database or crossing layers gets integration tests under `server/tests/integration/`.

## Docs

If your change affects configuration (`server/src/config/AppConfig.ts`), add a matching entry to `docs/tooling/config-descriptions.yaml` and regenerate the reference table:

```bash
npm run docs:generate-config
```

`./test-all.sh` runs this (and `mkdocs build --strict`, if `mkdocs` is installed) as part of its docs-refresh step, and CI's `docs:check-config` fails the build if the generated file is stale.

## Before Opening a PR

```bash
git fetch origin
git rebase origin/master

./test-all.sh
```

- [ ] Tests added/updated and passing
- [ ] Linting passes
- [ ] Documentation updated if behavior or configuration changed
- [ ] Commit messages follow Conventional Commits
- [ ] Branch is rebased on current `master`

Describe in the PR: what changed and why, the type of change, the related issue (if any), and what testing was done. PRs are typically squash-merged; after merge, delete your branch and update your local `master`.
