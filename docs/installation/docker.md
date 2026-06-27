# Docker Installation

This guide covers running Paperless-LLM in **production** with Docker: building or pulling the standalone server/frontend images, running them, and operating them day to day.

For a Docker-based local *development* environment with hot reload (or running from source without Docker at all), see [Development](../development.md) instead — this page intentionally doesn't duplicate that.

## Prerequisites

- Docker Engine
- A running Paperless-ngx instance
- An LLM backend reachable from the container (Ollama, etc.)

## Production Deployment (Standalone Images)

CI builds and publishes these images to GitHub Container Registry as:

- `ghcr.io/TiFu/paperless-llm-server`
- `ghcr.io/TiFu/paperless-llm-frontend`

tagged with `latest` (on the default branch), the short commit SHA, and
semver tags on version tags (`v*`). Pulling a released image is usually
simpler than building locally:

**Latest always points to the latest master build, not a release version**

```bash
docker pull ghcr.io/TiFu/paperless-llm-server:latest
docker pull ghcr.io/TiFu/paperless-llm-frontend:latest
```

## Environment Variables

The production server and frontend images are configured primarily through
`config.yaml` (server) and `API_BASE_URL` (frontend) rather than a long list
of environment variables — see `config.example.yaml` at the repo root, or
[Configuration](../configuration.md), for the full set of config keys
(`database`, `redis`, `paperless`, `llm`, `worker`, `api`, `auth`, `retry`,
`autoQueue`, `entitySync`, `logging`).

