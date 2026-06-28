# Quick Start

This guide gets the API server, worker, and frontend running locally against a local PostgreSQL instance.

## Installation

For local development, use the Docker Compose dev environment — it runs Postgres, Redis, and Paperless-NGX alongside hot-reloading server/frontend containers, see [Development](development.md). 

For a production setup, see [Installation > Docker](installation/docker.md) or the [Helm chart](installation/helm.md).

## Configuration

Copy `config.example.yaml` to `config.yaml` and fill in at least the `database`, `redis`, `llm`, and `paperless` sections. See [Configuration](installation/configuration.md) for the full field reference.

## Usage

Log in with your Paperless-NGX username and password — the server proxies this against Paperless to authenticate you. If your Paperless account normally signs in via SSO and has no password, set one first in your Paperless profile (Settings → My Profile).