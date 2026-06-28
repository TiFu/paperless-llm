# Configuration

Paperless-LLM is configured via a single `config.yaml` file at the repo root, loaded by [`AppConfig`](server.md) on startup. Copy the template to get started:

```bash
cp config.example.yaml config.yaml
```

`AppConfig` validates the file on startup (required sections/fields, numeric ranges like `llm.temperature` and the various `*PollIntervalMs`/`*TimeoutMs` minimums) and fails fast with a descriptive error if something's missing or out of range — see [`server/src/config/AppConfig.ts`](server.md) for the exact checks.

When deploying via Helm, the same structure is rendered into a Kubernetes Secret from `values.yaml`'s `config.*` keys — see [Installation > Helm](installation/helm.md).

## Choosing an LLM model

`llm.url`/`llm.model` point at an [Ollama](https://ollama.com/)-compatible server. Any locally pulled model works (e.g. `ollama pull qwen3:4b`); larger models generally produce better titles/tags at the cost of slower `llm.timeoutMs`-bound responses. `llm.temperature` trades determinism (lower) for variety (higher) — for metadata generation, lower values (0.2-0.7) tend to produce more consistent results than the high end of the 0-2 range.

## Stuck step recovery

If a worker process dies or hangs mid-step, the step stays claimed. The stuck-step reset poller (`workers.stuckStepReset.checkIntervalMs`) periodically finds steps claimed longer than `workers.stuckStepReset.timeoutMs` and recovers them for retry, up to `retry.maxRetries` attempts before the step is marked failed.

## Retry strategy

`retry.*` controls exponential backoff for automated step failures: the delay before the *n*-th retry is `retryDelayInMs * retryExponent^n`. With the defaults (`retryDelayInMs: 30000`, `retryExponent: 2`), retries land at 30s, 60s, 120s, ... Increase `retryExponent` for sparser retries against flaky external services, or lower `maxRetries` to surface failures (as [fallouts](architecture/backend.md)) sooner.

## CORS and port

`api.corsOrigins` accepts a list of allowed origins; use `["*"]` for local development where the frontend's origin varies, and lock it down to your actual frontend origin(s) in production. `api.port` is the only port the Express server needs — there's no separate metrics/admin port.

## Field-by-field reference

<!-- BEGIN GENERATED CONFIG REFERENCE -->

### `redis`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `host` | `string` | Yes | - | Redis host used for caching Paperless API responses. |
| `port` | `number` | Yes | - | Redis port. |
| `username` | `string` | Yes | - | Redis username (use an empty string if your Redis instance has no ACL user configured). |
| `password` | `string` | Yes | - | Redis password (use an empty string if your Redis instance has no auth configured). |
| `db` | `number` | Yes | - | Redis logical database index. |
| `ttlInSeconds` | `number` | Yes | - | How long cached Paperless API responses are kept in Redis before they're refetched. |

### `database`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `host` | `string` | Yes | - | PostgreSQL host. |
| `port` | `number` | Yes | - | PostgreSQL port. |
| `username` | `string` | Yes | - | PostgreSQL username. |
| `password` | `string` | Yes | - | PostgreSQL password. |
| `database` | `string` | Yes | - | PostgreSQL database name. |

### `workers`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `instanceId` | `string` | No | `unified-worker-<timestamp>` | Identifier for this worker process. Currently only used to label log lines — auto-generated if omitted or null. |

### `workers.stepExecution`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `batchSize` | `number` | Yes | - | Number of steps a single poll cycle claims and processes at once. |
| `pollIntervalMs` | `number` | Yes | - | How often the step-processing poller checks for newly claimable steps. Must be at least 100ms. |

### `workers.stuckStepReset`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `timeoutMs` | `number` | No | 300000 (5 minutes) | Time a step can sit claimed without completing before the stuck-step reset poller considers it stuck and recovers it. Must be at least 1000ms. |
| `checkIntervalMs` | `number` | No | 30000 (30 seconds) | How often the stuck-step reset poller scans for stuck steps. Must be at least 1000ms. |

### `workers.entitySync`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `pollIntervalMs` | `number` | No | 900000 (15 minutes) | How often the entity-sync poller refreshes cached tag/correspondent/document-type descriptions from Paperless. |

### `workers.autoQueue`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `enabled` | `boolean` | No | false | Enables the automatic document pickup queue, which periodically tag-checks Paperless and creates jobs without manual submission. |
| `pollIntervalMs` | `number` | No | 60000 (60 seconds) | How often the auto-queue poller checks Paperless for newly tagged documents. Must be at least 1000ms. |
| `workflowType` | `WorkflowType` | No | automated | Workflow type to use for auto-created jobs: `automated` (no human approval) or `approval` (steps pause for review). |
| `tag` | `string` | No | llm-auto-process | Paperless tag used to identify documents that should be auto-picked-up. Must be non-empty. |
| `fields` | `DocumentField[]` | No | ["title"] | Document fields the auto-queue should generate (e.g. `title`, `tags`) when it creates a job for a picked-up document. |

### `paperless`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `url` | `string` | Yes | - | Base URL of the Paperless-NGX instance to read/write documents from. |
| `token` | `string` | Yes | - | Paperless-NGX API token. Generate one from the Paperless-NGX admin UI under your user profile. |
| `tags` | `string` | No | - | Comma-separated Paperless tag(s) used as the default filter when listing documents to process. |

### `logging`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `level` | `string` | Yes | - | Pino log level (e.g. `debug`, `info`, `warn`, `error`). |
| `pretty` | `boolean` | Yes | - | Enable human-readable pretty-printed logs instead of structured JSON. Useful for local development, should generally be `false` in production. |

### `llm`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `url` | `string` | Yes | - | Base URL of the Ollama (or Ollama-compatible) LLM server. |
| `model` | `string` | Yes | - | Model name to request from the LLM server (e.g. `qwen3:4b`, `llama3`). |
| `temperature` | `number` | Yes | - | Sampling temperature passed to the LLM. Must be between 0 and 2. |
| `timeoutMs` | `number` | Yes | - | Request timeout for a single LLM call before it's treated as failed. |

### `api`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `port` | `number` | Yes | - | Port the Express API server listens on. |
| `corsOrigins` | `string[]` | Yes | - | List of allowed CORS origins for the API (use `["*"]` to allow any origin, e.g. in local development). |

### `auth`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `jwtSecret` | `string` | Yes | - | Secret used to sign and verify login JWTs. Must be a long, random value — never reuse the example/default. |
| `jwtExpiresIn` | `string` | No | 8h | JWT expiry duration, in [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) `expiresIn` format (e.g. `8h`, `30m`). |

### `retry`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `maxRetries` | `number` | No | 3 | Maximum retry attempts for an automated step, or for a step reset by the stuck-step poller, before it's surfaced as a fallout. |
| `retryDelayInMs` | `number` | No | 30000 (30 seconds) | Base delay before the first retry; subsequent retries back off exponentially from this value. |
| `retryExponent` | `number` | No | 2 | Exponential backoff multiplier applied per retry attempt (delay = retryDelayInMs * retryExponent^attempt). |

<!-- END GENERATED CONFIG REFERENCE -->

## Example configurations

### Local development

```yaml
database:
  host: localhost
  port: 5432
  username: paperless_llm
  password: devpassword
  database: paperless_llm_dev
redis:
  host: localhost
  port: 6379
  username: ""
  password: ""
  db: 0
  ttlInSeconds: 300
paperless:
  url: http://localhost:8000
  token: your_paperless_token_here
  tags: llm-process
llm:
  url: http://localhost:11434
  model: qwen3:4b
  temperature: 0.7
  timeoutMs: 300000
workers:
  stepExecution:
    batchSize: 5
    pollIntervalMs: 3000
logging:
  level: debug
  pretty: true
api:
  port: 3000
  corsOrigins: ["*"]
auth:
  jwtSecret: change_me_to_a_long_random_secret
```

### Higher-throughput worker

For larger document volumes, raise `workers.stepExecution.batchSize` and lower `workers.stepExecution.pollIntervalMs` to claim more work more often, and scale out by running multiple `--mode=worker` processes (see [Architecture > Backend](architecture/backend.md#scaling-performance-high-availability)):

```yaml
workers:
  stepExecution:
    batchSize: 20
    pollIntervalMs: 1000
```

See [Installation > Docker](installation/docker.md) for a docker-compose example and [Installation > Helm](installation/helm.md) for the Kubernetes equivalent (`replicaCount`, `resources`).

