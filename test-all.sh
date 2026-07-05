#!/usr/bin/env bash
#
# Runs the full test suite in one shot: backend lint + unit tests, frontend
# lint + build, integration tests (real Postgres + Paperless-ngx), e2e tests
# (full stack via Playwright), and a docs refresh. Mirrors what CI runs
# across .github/workflows/{tests,e2e,pr,master,release}.yml, so a clean run
# here is a strong signal a PR will pass CI. See docs/development.md#testing
# for what each layer covers individually.
#
# Usage: ./test-all.sh [--skip-integration] [--skip-e2e] [--skip-docs]

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

SKIP_INTEGRATION=false
SKIP_E2E=false
SKIP_DOCS=false

for arg in "$@"; do
  case "$arg" in
    --skip-integration) SKIP_INTEGRATION=true ;;
    --skip-e2e) SKIP_E2E=true ;;
    --skip-docs) SKIP_DOCS=true ;;
    -h|--help)
      echo "Usage: $0 [--skip-integration] [--skip-e2e] [--skip-docs]"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Usage: $0 [--skip-integration] [--skip-e2e] [--skip-docs]" >&2
      exit 1
      ;;
  esac
done

step() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }

INTEGRATION_STACK_UP=false
E2E_STACK_UP=false

cleanup() {
  if [ "$INTEGRATION_STACK_UP" = true ]; then
    step "Tearing down integration test stack"
    docker compose -f docker/docker-compose.integration-test.yml down -v
  fi
  if [ "$E2E_STACK_UP" = true ]; then
    step "Tearing down e2e stack"
    docker compose -f docker/docker-compose.e2e.yml down -v
  fi
}
trap cleanup EXIT

install_deps() {
  local dir=$1
  if [ ! -d "$dir/node_modules" ]; then
    step "Installing dependencies in $dir/"
    npm ci --prefix "$dir"
  fi
}

wait_for_server_health() {
  for i in $(seq 1 60); do
    if curl -sf http://localhost:3000/health > /dev/null; then
      return 0
    fi
    sleep 5
  done
  echo "Server did not become healthy in time" >&2
  docker compose -f docker/docker-compose.e2e.yml logs
  return 1
}

install_deps server
install_deps frontend

step "Server: lint"
npm run lint --prefix server

step "Server: unit tests"
npm run test:unit --prefix server

step "Frontend: lint"
npm run lint --prefix frontend

step "Frontend: build"
npm run build --prefix frontend

if [ "$SKIP_INTEGRATION" = true ]; then
  step "Skipping integration tests (--skip-integration)"
else
  step "Integration tests: starting Postgres + Paperless-ngx"
  docker compose -f docker/docker-compose.integration-test.yml up -d --wait
  INTEGRATION_STACK_UP=true

  step "Integration tests: running"
  npm run test:integration --prefix server

  step "Integration tests: tearing down"
  docker compose -f docker/docker-compose.integration-test.yml down -v
  INTEGRATION_STACK_UP=false
fi

if [ "$SKIP_E2E" = true ]; then
  step "Skipping e2e tests (--skip-e2e)"
else
  step "E2E: building and starting full stack"
  docker compose -f docker/docker-compose.e2e.yml up -d --build
  E2E_STACK_UP=true

  step "E2E: waiting for server health"
  wait_for_server_health

  install_deps e2e

  step "E2E: installing Playwright browsers"
  npx --prefix e2e playwright install --with-deps chromium

  step "E2E: running Playwright tests"
  npm test --prefix e2e

  step "E2E: tearing down"
  docker compose -f docker/docker-compose.e2e.yml down -v
  E2E_STACK_UP=false
fi

if [ "$SKIP_DOCS" = true ]; then
  step "Skipping docs refresh (--skip-docs)"
else
  install_deps .

  step "Refreshing generated config docs"
  npm run docs:generate-config

  if git diff --quiet -- docs/installation/configuration.md; then
    echo "docs/installation/configuration.md is up to date."
  else
    echo "docs/installation/configuration.md was regenerated with changes — review and commit them."
  fi

  if command -v mkdocs > /dev/null 2>&1; then
    step "Building docs site (mkdocs build --strict)"
    mkdocs build --strict
  else
    echo "mkdocs not installed — skipping site build (pip install -r docs/requirements.txt to enable)."
  fi
fi

step "All done"
