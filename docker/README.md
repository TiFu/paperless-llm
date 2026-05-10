# Docker Development Environment

This directory contains Docker configurations for running the Paperless LLM application in development mode with hot reload.

## Quick Start

### Development Environment (Backend + Frontend)

Start the complete development environment:

```bash
docker-compose -f docker/docker-compose.dev.yml up
```

This will start PostgreSQL and launch you into an interactive shell inside the dev container.

**Inside the container shell**, run the startup script to start both services:

```bash
/app/start-services.sh
```

This will start:
- **Backend API** on `localhost:3000` with hot reload (nodemon + ts-node)
- **Frontend** on `localhost:5173` with hot reload (Vite)

Or start services individually:

```bash
# Backend only
cd /app/server && nodemon --watch src --ext ts --exec "ts-node src/api.ts"

# Frontend only (in another terminal/shell)
cd /app/frontend && npm run dev -- --host 0.0.0.0
```

### With Ollama (Optional)

To include Ollama for local LLM testing:

```bash
docker-compose -f docker/docker-compose.dev.yml --profile with-ollama up
```

Ollama will be available on `localhost:11434`

### Production Environment

For production deployment with multiple worker instances:

```bash
docker-compose -f docker/docker-compose.yml up
```

## Development Features

### Hot Reload

- **Backend**: Changes to `worker/src/**/*.ts` automatically restart the API server via nodemon
- **Frontend**: Changes to `frontend/src/**/*` automatically refresh via Vite HMR

### Source Code Mounting

The development container mounts your local source code directories as read-only volumes:
- `worker/src` → `/app/worker/src`
- `frontend/src` → `/app/frontend/src`

This means you edit files on your host machine, and changes are immediately reflected in the container.

### Database

The dev environment uses a separate database (`paperless_llm_dev`) to avoid conflicts with production data.

## Environment Variables

Create a `.env` file in the project root:

```bash
# Database
POSTGRES_PASSWORD=devpassword

# Paperless NGX
PAPERLESS_URL=http://localhost:8000
PAPERLESS_TOKEN=your_paperless_token_here

# LLM (if using Ollama in container)
LLM_URL=http://ollama:11434
LLM_MODEL=llama3

# Or use external Ollama/LLM service
# LLM_URL=http://host.docker.internal:11434

# Logging
LOG_LEVEL=debug
LOG_PRETTY=true
```

## Accessing Services

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | React app with Vite dev server |
| Backend API | http://localhost:3000 | Express API server |
| API Docs | http://localhost:3000/api/health | Health check endpoint |
| Paperless-LLM DB | localhost:5432 | PostgreSQL (user: paperless_llm, db: paperless_llm_dev) |
| Paperless-ngx DB | localhost:5433 | PostgreSQL (user: paperless, db: paperless) |
| Paperless-ngx | http://localhost:8000 | Document management system |
| Ollama | http://localhost:11434 | LLM service (optional) |

## Development Workflow

### 1. Start the environment

```bash
docker-compose -f docker/docker-compose.dev.yml up -d
```

### 2. Attach to the dev container

```bash
docker exec -it pllm-app-dev sh
```

### 3. Start services

```bash
/app/start-services.sh
```

### 4. Edit code

Edit files in `worker/src/` or `frontend/src/` on your host machine.

### 5. Watch logs

Backend and frontend logs appear in the docker-compose output:
- Backend: Pino JSON logs (when LOG_PRETTY=true, formatted logs)
- Frontend: Vite dev server output

### 6. Test changes

- Frontend: Open http://localhost:5173 in browser
- Backend: Use curl or Postman to test API endpoints

### 7. Run migrations

To run database migrations inside the dev container:

```bash
docker exec -it pllm-app-dev sh -c "cd /app/server && npx ts-node src/scripts/migrate.ts"
```

Or connect to the databases directly:

```bash
# Paperless-LLM database
docker exec -it pllm-postgres-dev psql -U paperless_llm -d paperless_llm_dev

# Paperless-ngx database
docker exec -it paperless-postgres-dev psql -U paperless -d paperless
```

## Troubleshooting

### Port conflicts

If ports 3000, 5173, or 5432 are already in use, modify the port mappings in `docker-compose.dev.yml`:

```yaml
ports:
  - "3001:3000"  # Change host port
  - "5174:5173"
```

### Hot reload not working

1. Ensure source code volumes are mounted correctly
2. Check file permissions (should be readable by container)
3. Restart the container: `docker-compose -f docker/docker-compose.dev.yml restart dev`

### Database connection errors

1. Wait for PostgreSQL to be ready (health check)
2. Verify DATABASE_PASSWORD matches POSTGRES_PASSWORD
3. Check logs: `docker logs pllm-postgres-dev`
4. For Paperless-ngx DB issues: `docker logs paperless-postgres-dev`

### Ollama model not found

Pull the model inside the Ollama container:

```bash
docker exec -it paperless-llm-ollama-dev ollama pull llama3
```

## Stopping the Environment

```bash
# Stop all services
docker-compose -f docker/docker-compose.dev.yml down

# Stop and remove volumes (cleans database)
docker-compose -f docker/docker-compose.dev.yml down -v
```

## Building Images

The dev image is built automatically on first `docker-compose up`. To rebuild after dependency changes:

```bash
docker-compose -f docker/docker-compose.dev.yml build --no-cache
```

## VS Code Integration

For the best development experience, you can also run the services directly on your host machine (without Docker) and use Docker only for PostgreSQL:

```bash
# Start only PostgreSQL
docker-compose -f docker/docker-compose.dev.yml up postgres

# In separate terminals:
cd worker && npm run dev:api
cd frontend && npm run dev
```

This gives you better debugging capabilities with VS Code.

## Architecture

```
┌─────────────────────────────────────────┐
│     Docker Dev Environment              │
│                                         │
│  ┌─────────────┐    ┌────────────────┐ │
│  │  Backend    │    │   Frontend     │ │
│  │  (nodemon)  │◄───│   (Vite)       │ │
│  │  :3000      │    │   :5173        │ │
│  └──────┬──────┘    └────────────────┘ │
│         │                               │
│         ▼                               │
│  ┌─────────────┐    ┌────────────────┐ │
│  │ PostgreSQL  │    │   Ollama       │ │
│  │  :5432      │    │   :11434       │ │
│  └─────────────┘    └────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
         ▲                       ▲
         │                       │
    Your Editor              Browser
    (Hot Reload)          (localhost:5173)
```

## Additional Commands

```bash
# Start dev environment in background
docker-compose -f docker/docker-compose.dev.yml up -d

# Attach to running dev container
docker exec -it pllm-app-dev sh

# View logs
docker-compose -f docker/docker-compose.dev.yml logs -f

# Execute one-off commands in dev container
docker exec -it pllm-app-dev sh -c "cd /app/server && npm test"

# Check API health
curl http://localhost:3000/api/health

# Restart dev container
docker-compose -f docker/docker-compose.dev.yml restart dev

# Stop everything
docker-compose -f docker/docker-compose.dev.yml down
```
