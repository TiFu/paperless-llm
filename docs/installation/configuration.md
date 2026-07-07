# Configuration

Configuration is split into two kinds:

- **Technical** settings (infrastructure, credentials, ports) live in a single `config.yaml` file at the repo root, loaded by [`AppConfig`](../server.md) on startup. Changing them requires a restart.
- **Non-technical** settings (auto-process tags, worker loop timing, retry policy, LLM model/temperature/timeout) live in the database and are live-editable via the Settings page in the UI (or `GET`/`PUT /api/settings`) — see [Settings](../user_guide/settings.md). Changes apply to the current process immediately and to every other server/worker process within a few seconds, no restart needed.

Copy the template to get started with the technical config:

```bash
cp config.example.yaml config.yaml
```

`AppConfig` validates `config.yaml` on startup (required sections/fields) and fails fast with a descriptive error if something's missing — see [`server/src/config/AppConfig.ts`](../server.md) for the exact checks. Numeric-range validation for the non-technical settings (`llm.temperature`, the various `*PollIntervalMs`/`*TimeoutMs` minimums, etc.) lives in [`server/src/domain/settings/SettingsDomainService.ts`](../server.md) instead, applied both when `PUT /api/settings` is called and each time `AppConfig` polls the database.

When deploying via Helm, the same technical `config.yaml` structure is rendered into a Kubernetes Secret from `values.yaml`'s `config.*` keys — see [Installation > Helm](helm.md). Non-technical settings aren't part of the chart; configure them after deploy via the Settings page, as a Paperless superuser.

## CORS and port

`api.corsOrigins` accepts a list of allowed origins; use `["*"]` for local development where the frontend's origin varies, and lock it down to your actual frontend origin(s) in production. `api.port` is the only port the Express server needs — there's no separate metrics/admin port.

## Field-by-field reference (technical, config.yaml)

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
| `reconnectBaseDelayMs` | `number` | No | 500 | Initial delay before retrying a failed Redis connection; subsequent retries back off exponentially (doubling) from this value. While disconnected, caching is skipped and requests pass through to Paperless. |
| `reconnectMaxDelayMs` | `number` | No | 30000 (30 seconds) | Cap on the exponential backoff delay between Redis reconnection attempts. Reconnection retries forever, never giving up. |

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

### `paperless`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `url` | `string` | Yes | - | Base URL of the Paperless-NGX instance to read/write documents from. |
| `token` | `string` | Yes | - | Paperless-NGX API token. Generate one from the Paperless-NGX admin UI under your user profile. |

### `logging`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `level` | `string` | Yes | - | Pino log level (e.g. `debug`, `info`, `warn`, `error`). |
| `pretty` | `boolean` | Yes | - | Enable human-readable pretty-printed logs instead of structured JSON. Useful for local development, should generally be `false` in production. |

### `llm`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `url` | `string` | Yes | - | Base URL of the Ollama (or Ollama-compatible) LLM server. |

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

<!-- END GENERATED CONFIG REFERENCE -->

## Example configuration (technical, config.yaml)

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
llm:
  url: http://localhost:11434
logging:
  level: debug
  pretty: true
api:
  port: 3000
  corsOrigins: ["*"]
auth:
  jwtSecret: change_me_to_a_long_random_secret
```

Model choice, temperature, timeout, and worker batch size/poll interval are all non-technical settings now — set them via the Settings page (see [Settings](../user_guide/settings.md)) rather than in this file.

### Higher-throughput worker

For larger document volumes, raise `workers.stepExecution.batchSize` and lower `workers.stepExecution.pollIntervalMs` (via the Settings page) to claim more work more often, and scale out by running multiple `--mode=worker` processes (see [Architecture > Backend](../architecture/backend.md#scaling-performance-high-availability)) — the setting applies to every running process alike.

See [Installation > Docker](docker.md) for a docker-compose example and [Installation > Helm](helm.md) for the Kubernetes equivalent (`replicaCount`, `resources`).

