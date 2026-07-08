# Helm Installation

This guide covers deploying Paperless-LLM to Kubernetes using the Helm chart
in `helm/paperless-llm/`.

## Prerequisites

- A Kubernetes cluster (1.25+)
- `kubectl` configured to point at the target cluster
- Helm 3.17+ (the chart is built and linted against Helm 3.17.3 in CI)
- `kubectl` access to create Deployments, Services, Secrets, and (optionally)
  Ingress resources in the target namespace

### Using the Published OCI Chart

CI also packages and pushes the chart as an OCI artifact on tagged releases
(`v*`), to `oci://ghcr.io/TiFu/charts`. Instead of cloning the repo, you
can pull or install directly from there:

```bash
helm pull oci://ghcr.io/TiFu/charts/paperless-llm --version <version>

# or install straight from the registry
helm install paperless-llm oci://ghcr.io/TiFu/charts/paperless-llm --version <version>
```

## Components

The chart deploys three components:

| Component | Image | Runs | HTTP port |
|---|---|---|---|
| `backend` | `image.*` (server image, `--mode=server`) | The API consumed by the frontend | yes (`config.api.port`) |
| `worker` | `image.*` (same server image, `--mode=worker`) | Background job processing — title/tag generation, retries, auto-queue polling | no |
| `frontend` | `frontend.image.*` | The React SPA, served by nginx | yes (80) |

`backend` and `worker` are separate Deployments running the **same** server
image with a different `--mode` argument, so they share a single top-level
`image` and `config` block in `values.yaml` rather than each having their
own — see [Configuration](#configuration) below. Both Deployments mount the
same rendered `config.yaml` Secret; `worker` simply doesn't expose a port or
define probes, since it has nothing to serve.

## Installing the Chart

A minimal install needs at least the shared and frontend image
repositories, a JWT secret, and your Paperless-NGX instance URL:

```bash
helm install paperless-llm helm/paperless-llm \
  --namespace paperless-llm --create-namespace \
  --set image.repository=ghcr.io/TiFu/paperless-llm-server \
  --set image.tag=latest \
  --set frontend.image.repository=ghcr.io/TiFu/paperless-llm-frontend \
  --set frontend.image.tag=latest \
  --set config.auth.jwtSecret=<random-secret> \
  --set config.paperless.url=https://paperless.example.com \
  --set externalDatabase.host=<postgres-host> \
  --set externalDatabase.password=<postgres-password> \
  --set externalRedis.host=<redis-host>
```

Document access itself is per-user: each person logs in with their own
Paperless-NGX credentials, and their personal Paperless token is captured
and stored at login — there's no single global Paperless API token to
obtain and configure for the deployment to function.

To apply changes (new image tag, config update, etc.), use
`upgrade --install` so the same command works for both first install and
subsequent updates:

```bash
helm upgrade --install paperless-llm helm/paperless-llm \
  --namespace paperless-llm \
  -f my-values.yaml
```

Preferring a values file over a long `--set` chain is recommended once you
have more than a couple of overrides — see below.

## values.yaml Structure

### Database

By default the chart expects an external Postgres instance:

```yaml
postgresql:
  enabled: false
  auth:
    username: paperless_llm
    password: ""
    database: paperless_llm

externalDatabase:
  host: ""
  port: 5432
  username: paperless_llm
  password: ""
  database: paperless_llm
```

Set `postgresql.enabled: true` to deploy the bundled Bitnami Postgres
subchart instead, in which case the chart's `_helpers.tpl` resolves the
connection host to `<release-name>-postgresql` automatically and ignores
`externalDatabase`. Leave it `false` (the default) to point at a
pre-existing database via `externalDatabase.*`.

### Redis

The same enabled/external pattern applies to Redis:

```yaml
redis:
  enabled: false
  auth:
    enabled: true
    password: ""

externalRedis:
  host: ""
  port: 6379
  username: ""
  password: ""
  db: 0
```

With `redis.enabled: true`, the chart resolves the host to
`<release-name>-redis-master`. Otherwise it uses `externalRedis.*`.

### Configuration

`image` and `config` sit at the top level of `values.yaml` and are shared by
both the `backend` and `worker` Deployments — they run the same image, just
with different `--mode` args and config consumption. `config.*` mirrors
`config.yaml`, which now holds TECHNICAL settings only (database and redis
connection fields are deliberately excluded — the chart fills those in from
the values above, so don't set them under `config`). Non-technical settings
(auto-process tags, worker timing, retry policy, LLM model/temperature/timeout)
live in the database and are configured after deploy via the Settings page in
the UI (or `PUT /api/settings`), by a user who is a superuser in Paperless —
not via this chart:

```yaml
image:
  repository: ""
  tag: latest
  pullPolicy: IfNotPresent

config:
  paperless:
    url: http://paperless.example.com
  llm:
    url: http://ollama.example.com:11434
  workers:
    instanceId: null
  logging:
    level: info
    pretty: false
  api:
    port: 3000
    corsOrigins:
      - "*"
  auth:
    jwtSecret: ""
    jwtExpiresIn: 8h
  redisCache:
    ttlInSeconds: 300
    reconnectBaseDelayMs: 500
    reconnectMaxDelayMs: 30000

# Per-component replica count and resources — see Scaling below.
backend:
  replicaCount: 1
  resources: {}

worker:
  replicaCount: 1
  resources: {}
```

There is no system-level Paperless API token to configure for the chart:
each user authenticates with their own Paperless-NGX credentials, and their
personal Paperless token is captured and stored at login — there is no
"global" token to obtain or rotate as part of operating this chart.

This entire `config` block is rendered into a Kubernetes `Secret` (see
[How config.yaml Becomes a Secret](#how-configyaml-becomes-a-secret) below)
and mounted into both the backend and worker containers at `/config.yaml` —
the same fixed path the server image expects when run under plain Docker.

### Frontend Config

```yaml
frontend:
  image:
    repository: ""
    tag: latest
    pullPolicy: IfNotPresent
  replicaCount: 1
  apiBaseUrl: ""
  ingress:
    enabled: false
    className: ""
    hosts:
      - host: ""
        paths:
          - path: /
            pathType: Prefix
    tls: []
```

`frontend.apiBaseUrl` is injected into the frontend container as the
`API_BASE_URL` environment variable (the same `envsubst`-at-boot mechanism
used in the standalone Docker image). If left empty, it defaults to the
in-cluster backend Service, e.g. `http://<release>-backend:3000/api`, which
only works if the frontend is reached via a proxy/ingress that can also
reach that internal Service — for a publicly reachable frontend behind an
ingress, set `apiBaseUrl` explicitly to the externally resolvable API URL.

Enable `frontend.ingress.enabled` and fill in `hosts`/`tls` to expose the
frontend via an Ingress resource. The ingress only fronts the frontend
Service; there is no ingress template for the backend in this chart.

## How config.yaml Becomes a Secret

The `config-secret.yaml` template renders all of `config.*` (plus the
resolved database/redis connection values) into a single `Secret` named
`<release>-config`, with the rendered YAML stored under the `config.yaml`
key:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: <release>-config
type: Opaque
stringData:
  config.yaml: |
    database:
      host: ...
    redis:
      host: ...
    paperless:
      ...
```

Both the backend and worker Deployments mount that same Secret as a volume
and map the `config.yaml` key to `/config.yaml` inside their container via
`subPath` — there is no ConfigMap involved, and no ConfigMap/Secret split
between sensitive and non-sensitive fields; the whole rendered config is
treated as secret material.

## Health Checks

The backend Deployment defines both probes against the `/health` endpoint:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: http
  initialDelaySeconds: 10
  periodSeconds: 15
readinessProbe:
  httpGet:
    path: /health
    port: http
  initialDelaySeconds: 5
  periodSeconds: 10
```

The worker Deployment has **no probes** — it exposes no HTTP port, so there's
nothing for `httpGet` to check; Kubernetes falls back to process-liveness
only (the container is considered healthy as long as it hasn't exited). The
frontend Deployment probes `/` on its own container port (80) with similar
liveness/readiness settings. None of these are currently exposed as
`values.yaml` overrides.
