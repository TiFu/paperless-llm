# Paperless-LLM — orientation for planning/implementation

Short primer + a checklist of project-specific gotchas that have caused rework in past
sessions. Read this before planning any non-trivial change; it's meant to save a round trip,
not replace the deeper docs it links to.

## Architecture at a glance

- **`server/`** — Node/TypeScript backend, DDD-ish layering under `server/src/`:
  `domain/` (entities, workflows, steps — no I/O), `application/` (use-case orchestration,
  transactions), `infrastructure/` + `repositories/` + `services/` (Postgres, Paperless API,
  LLM client), `web/` (controllers + generated DTOs), `api/routes/` (Express routes, thin).
  Jobs progress through an explicit state machine (`JobState`, `ApprovalWorkflow` /
  `AutomatedWorkflow`, `BaseWorkflow`) executed by a Postgres-as-queue worker loop (no
  Bull/SQS). Full details: [`docs/architecture/backend.md`](docs/architecture/backend.md).
- **`frontend/`** — React + Redux Toolkit + MUI, under `frontend/src/`: `pages/`, `components/`,
  `store/slices/` (one slice per domain area), `services/api/` (hand-written `apiClient`
  wrapping a generated OpenAPI client). Details:
  [`docs/architecture/frontend.md`](docs/architecture/frontend.md).
- **`docker/`** — dev stack (`docker-compose.dev.yml`, hot-reload via nodemon/vite, containers
  named `pllm-*`) and production images (`server.Dockerfile`, `frontend.Dockerfile`). See
  [`docs/installation/docker.md`](docs/installation/docker.md) and
  [`docs/development.md`](docs/development.md) for local dev.
- **`helm/paperless-llm/`** — Kubernetes chart for production deployment (backend/worker/frontend/redis
  deployments + services + ingress, config via a mounted secret). See
  [`docs/installation/helm.md`](docs/installation/helm.md).
- **API contract**: `server/docs/openapi.yaml` is the single source of truth. Both
  `server/src/web/dtos/` and `frontend/src/services/api/generated/` are generated from it and
  gitignored — never hand-edit files under either directory.

## Planning checklist (things that have bitten us before)

- **Tests live under `server/tests/unit/` and `server/tests/integration/`** (Jest
  multi-project config: `test:unit` / `test:integration`), *not* colocated with source as
  `*.test.ts`. Before writing "no test impact" in a plan, `grep -rl` the symbol/enum
  member/class you're changing across `server/tests/`, not just `server/src/`.
- **Any edit to `server/docs/openapi.yaml` requires regenerating both generated clients**:
  `cd server && npm run generate:api` and `cd frontend && npm run generate:api` (both driven
  by `openapitools.json`). A stale generated model can silently drop a field with no type
  error — e.g. a boolean the backend returns correctly but the frontend never sees because the
  generated model's `attributeTypeMap` wasn't regenerated. If something "works on the wire"
  (confirmed via Network tab) but not in the UI, suspect the generated client first.
- **`JobState` is an explicit state machine**, not free-form status strings. Adding or
  rerouting a transition touches: `server/src/domain/job/JobState.ts` (enum),
  `server/docs/openapi.yaml`'s `JobState` schema (+ regenerate), `ApprovalWorkflow.ts` /
  `AutomatedWorkflow.ts`'s `defineTransitions()` + `getStepForState()`, the two workflow
  diagrams in `docs/architecture/backend.md`, and the frontend status-color switches in
  `frontend/src/pages/JobsPage.tsx` / `JobDetailsPage.tsx` (states missing from those switches
  silently fall back to a gray "default" chip — not a crash, but worth an explicit case).
  `TransitionMap` lookups have no memory of *how* a state was reached, so if two different
  origins need to end up in different terminal states after the same cleanup step, that
  requires two distinct intermediate states, not one shared one.
- **Turning a terminal transition into a non-terminal one breaks any caller that discards
  the new step.** `WorkflowOrchestratorDomainService` methods (`processUserDecision`,
  `processStepCancellation`, ...) return a `NextStepResult` whose `.step` must be persisted
  by the *application*-layer caller (`if (nextStepResult.step) stepRepo.create(...)`) — see
  `ApprovalApplicationService.processApprovalDecision`. If a transition used to go straight to
  a terminal state, callers may never have needed that check and can silently skip it (this
  happened with `StepCancelApplicationService.cancelStep`/`processStepCancellation`, which
  returned `void` and dropped the step entirely — the job got stuck forever once `FAILURE`
  started routing through `CLEANUP_AFTER_FAILURE` instead of straight to `FAILED`). When you
  make a previously-terminal transition non-terminal, grep every caller of the orchestrator
  method involved, not just the one you're already touching.
- **`jobs.state` has no DB `CHECK` constraint** (`server/migrations/001_initial-schema.sql`,
  plain `VARCHAR(50)`) — adding a new `JobState` value never needs a migration.
- **Auto-Queue re-creation**: `DocumentAutoQueueApplicationService` finds candidate documents
  purely by Paperless tag presence; its de-dup queries in `PostgreSQLJobRepository`
  (`getActiveJobsByDocumentIds`, `filterInProgressDocuments`) treat `completed`, `failed`, and
  `rejected` jobs as inactive. Any workflow path that reaches one of those terminal states
  *without* first removing the trigger tag (`PaperlessService.removeProcessingTag` via
  `RemoveTagsStep`) will get its document re-queued on the next Auto-Queue cycle.
- **The dev stack is usually already running** (`docker compose -f docker/docker-compose.dev.yml`,
  containers `pllm-app-dev` / `pllm-redis-dev` / `pllm-postgres-dev`) with nodemon/vite hot
  reload — check `docker ps` before assuming you need to start or rebuild anything.
