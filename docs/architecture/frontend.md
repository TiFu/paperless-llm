# Frontend Architecture

The frontend (`frontend/`) is a React single-page application that gives operators visibility into document-processing jobs, lets them review and approve LLM-proposed changes, manage prompts, and monitor workers — backed entirely by the REST API exposed by the [backend](backend.md).

## Overview and Tech Stack

- **React 18** with TypeScript, built and served by **Vite**.
- **Material-UI (MUI)** for components, plus `@mui/x-date-pickers` for date inputs and `@mui/lab` for supplementary components.
- **Redux Toolkit** (`@reduxjs/toolkit` + `react-redux`) for application state.
- **React Router** for client-side routing, gated by an authenticated layout.
- An **OpenAPI-generated** TypeScript client (not hand-written axios calls) for all server communication — see [API Integration](#api-integration).
- **dayjs** for date formatting/manipulation.

The app is served behind the backend's CORS configuration in development (Vite proxies `/api` requests to the backend) and is built as static assets for production, with the API base URL injected at container start (see the frontend Dockerfile/Helm chart for the concrete deployment mechanism).

## Project Structure

```
frontend/src/
├── components/         # Reusable UI components
│   ├── action_display/   # Renders a DocumentAction's value by fieldType (string, date, enum, multi-enum)
│   ├── audit_entries/    # One display component per audit log event type
│   ├── Sidebar.tsx
│   ├── ApprovalCard.tsx
│   ├── FalloutCard.tsx
│   ├── JobStepsTimeline.tsx
│   ├── AuditLogTimeline.tsx
│   ├── AutomatedStepsItemsTable.tsx
│   ├── AutomatedStepsStatsCard.tsx
│   ├── DocumentActionDisplay.tsx
│   ├── DocumentActionViewer.tsx
│   ├── DocumentList.tsx
│   └── HealthStatusIndicator.tsx
├── pages/               # Top-level routed pages (see below)
├── services/
│   ├── api/
│   │   ├── api.ts         # Thin wrapper around the generated client (apiClient)
│   │   └── generated/      # OpenAPI-generated client — do not hand-edit
│   └── auth/                # Token storage and unauthorized-event handling
├── store/
│   ├── store.ts             # configureStore + reducer map
│   ├── hooks.ts              # Typed useAppDispatch / useAppSelector
│   └── slices/                # One Redux Toolkit slice per domain area (see below)
├── App.tsx               # Routing, theming, auth gate, error boundary
└── main.tsx              # Entry point
```

This is the current structure verified directly against `frontend/src/`. The frontend's own `README.md` describes an older `DocumentsPage`/`QueuesPage`/`AuditLogPage` + `types/` + `contexts/` layout (a `DocumentList.tsx`/`QueueStatsCard.tsx`/`QueueItemsTable.tsx`/`AuditLogTable.tsx` component set) that no longer matches the codebase — there is no `types/` or `contexts/` directory, and the page set has grown substantially since that README was written. The structure above reflects what's actually in source.

## Pages

Routing is defined in `App.tsx`. All routes except `/login` are wrapped in a `RequireAuth` guard that bootstraps the session and redirects unauthenticated users to the login page.

| Route | Page component | Purpose |
|---|---|---|
| `/login` | `LoginPage` | Authentication |
| `/documents` (default) | `DocumentsPage` | Browse Paperless documents and submit new jobs against them |
| `/jobs` | `JobsPage` | List jobs with filtering/pagination |
| `/jobs/:id` | `JobDetailsPage` | Job detail view, including its steps timeline and audit log |
| `/queues` | `AutomatedStepsPage` | Monitor automated step execution (uses `AutomatedStepsItemsTable` / `AutomatedStepsStatsCard`) |
| `/steps/:stepId` | `StepDetailsPage` | Single step detail |
| `/approvals` | `ApprovalsPage` | Review and approve/reject pending `REQUIRE_APPROVAL` steps |
| `/fallouts` | `FalloutsPage` | Steps stuck in `in_fallout`; retry or cancel them |
| `/prompts` | `PromptsPage` | View and edit LLM prompt templates per step type |
| `/entities` | `EntityDescriptionsPage` | Manage descriptions for Paperless tags/correspondents/document types (used to give the LLM extra context) |
| `/workers` | `WorkerExecutionsPage` | List recorded worker poller runs |
| `/workers/:id` | `WorkerExecutionDetailsPage` | Detail view for a single worker execution, including its items |

This list reflects the actual contents of `frontend/src/pages/` at the time of writing. The page set in `frontend/README.md` (`DocumentsPage`, `QueuesPage`, `AuditLogPage`) describes an earlier version of the app and is missing everything related to approvals, fallouts, prompts, entity descriptions, and worker execution monitoring — all of which exist in the current frontend.

## State Management

Global state is managed with Redux Toolkit. `store.ts` combines one slice per domain area, each following the standard `createSlice` + async thunk pattern for data fetched from the API:

| Slice | State area |
|---|---|
| `authSlice` | Session/auth status, current user, login/logout/bootstrap |
| `statsSlice` | Dashboard statistics |
| `queueSlice` | Generic work queue stats/items |
| `jobsSlice` | Job list and job detail data |
| `approvalsSlice` | Pending approvals and approval decisions |
| `falloutsSlice` | Steps in fallout, retry/cancel actions |
| `documentsSlice` | Paperless document listing for job submission |
| `promptsSlice` | Prompt templates, editing |
| `documentEntitiesSlice` | Entity values (tags/correspondents/document types) used in document/action forms |
| `entityDescriptionsSlice` | Entity description management |
| `workerExecutionsSlice` | Worker execution history |

The store disables Redux Toolkit's serializable-state middleware check (`serializableCheck: false`) because the generated API client returns class instances (not plain objects) as response data, which would otherwise trip that check. Component-local UI state (form inputs, dialog open/close, etc.) stays in component state rather than Redux; only data that's fetched from or submitted to the API lives in slices.

## API Integration

The frontend never calls the backend with hand-written `fetch`/axios calls directly. Instead:

1. **OpenAPI spec as source of truth.** The backend publishes an OpenAPI spec at `server/docs/openapi.yaml` (also served live at `/api/openapi.yaml` and rendered at `/api/docs`).
2. **Generated client.** `frontend/src/services/api/generated/` is generated from that spec by the `openapi-generator-cli` TypeScript generator (configured in the repo-root `openapitools.json`, under the `typescript-frontend` generator key). It produces typed `*Api` classes (`DocumentsApi`, `JobsApi`, `ApprovalsApi`, `PromptsApi`, `QueueApi`, `StatsApi`, `StepsApi`, `HealthApi`, `EntityDescriptionsApi`, `WorkerExecutionsApi`, `AuthApi`) plus model types/enums (`JobState`, `StepType`, `WorkflowType`, `WorkerExecutionStatus`, etc.). This directory is generated output and should never be hand-edited.
3. **Thin wrapper.** `frontend/src/services/api/api.ts` constructs a shared `Configuration` (base URL from `window.__APP_CONFIG__.apiBaseUrl`, falling back to `http://localhost:3000/api`; bearer-token auth via `tokenStorage`; a middleware that emits an app-wide "unauthorized" event on HTTP 401), instantiates each generated `*Api` class once, and exposes a single `apiClient` object with one method per backend operation. Every method normalizes errors from the generated client's `ApiException`/RFC 7807 `ProblemDetails` shape into a plain `Error` with a human-readable message, so slices and components don't need to know about the generated client's exception types.
4. **Redux thunks call `apiClient`.** Slices dispatch async thunks that call into `apiClient`, not into the generated `*Api` classes directly — this keeps the generated-client surface isolated to one file.

### Regenerating the client

Whenever the backend's API surface changes, regenerate the client rather than hand-editing it:

```bash
cd frontend
npm run generate:api
```

This re-runs `openapi-generator-cli generate` against `../server/docs/openapi.yaml` using the `typescript-frontend` generator config. There's a matching `clean:api` script (`rm -rf src/services/api/generated`) for a clean regeneration. The same OpenAPI spec also drives a second generator target, `typescript-backend-dtos`, which generates the backend's own request/response DTOs into `server/src/web/dtos` — so frontend and backend types are generated from, and stay consistent with, the same spec rather than being maintained by hand in two places. Production Docker builds run the codegen step internally as part of the image build, so `npm run generate:api` does not need to be run manually before building a production image.
