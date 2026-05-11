# Development Setup Guide

Complete step-by-step guide for setting up the Paperless-LLM development environment with Docker Compose.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Docker Compose Setup](#docker-compose-setup)
- [Local Development (No Docker)](#local-development-no-docker)
- [Container Shell Access](#container-shell-access)
- [Database Access](#database-access)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Debugging](#debugging)
- [Common Issues](#common-issues)

## Prerequisites

### Required

- **Docker** (20.10+) and **Docker Compose** (2.0+)
  ```bash
  docker --version
  docker compose version
  ```

- **Node.js** (18+) - for local development without Docker
  ```bash
  node --version
  npm --version
  ```

- **Git**
  ```bash
  git --version
  ```

### Optional but Recommended

- **Ollama** - Local LLM runtime
  ```bash
  # Install Ollama (https://ollama.ai)
  curl -fsSL https://ollama.com/install.sh | sh
  
  # Pull a model
  ollama pull llama3
  ```

- **PostgreSQL Client Tools** - For database access
  ```bash
  # Ubuntu/Debian
  sudo apt install postgresql-client
  
  # macOS
  brew install postgresql
  ```

- **VS Code** - Recommended IDE with extensions:
  - ESLint
  - Prettier
  - Docker
  - PostgreSQL

## Quick Start

Get up and running in under 5 minutes:

```bash
# 1. Clone repository
git clone <repo-url>
cd paperless-llm

# 2. Start all services with Docker Compose
cd docker
docker compose -f docker-compose.dev.yml up -d

# 3. Wait for services to be ready (~2 minutes)
docker compose -f docker-compose.dev.yml logs -f paperless-ngx-dev
# Wait for "Paperless-ngx ready!" message

# 4. Set up Paperless-NG
# Open browser: http://localhost:8000
# Login: admin / admin
# Create API token: Settings → API → Create new token

# 5. Configure Paperless-LLM
cd ..
cp config.example.yaml config.yaml
# Edit config.yaml and paste your Paperless token

# 6. Start development servers
./dev-start.sh

# 7. Open frontend
# Browser: http://localhost:5173
```

## Docker Compose Setup

The recommended development environment uses Docker Compose to run all infrastructure services.

### Services Overview

```
┌─────────────────────────────────────────────┐
│          Docker Compose Services            │
├─────────────────────────────────────────────┤
│                                             │
│  pllm-postgres-dev        (Port 5432)       │
│  paperless-postgres-dev   (Port 5433)       │
│  paperless-redis-dev      (Port 6379)       │
│  paperless-ngx-dev        (Port 8000)       │
│  pllm-app-dev            (Port 3000)        │
│                                             │
└─────────────────────────────────────────────┘
```

### Starting Services

```bash
cd docker
docker compose -f docker-compose.dev.yml up -d
```

**Output:**
```
[+] Running 5/5
 ✔ Container pllm-postgres-dev         Started
 ✔ Container paperless-postgres-dev    Started
 ✔ Container paperless-redis-dev       Started
 ✔ Container paperless-ngx-dev         Started
 ✔ Container pllm-app-dev              Started
```

### Checking Status

```bash
docker compose -f docker-compose.dev.yml ps
```

**Expected:**
```
NAME                       STATUS          PORTS
pllm-postgres-dev          Up (healthy)    0.0.0.0:5432->5432/tcp
paperless-postgres-dev     Up (healthy)    0.0.0.0:5433->5432/tcp
paperless-redis-dev        Up              0.0.0.0:6379->6379/tcp
paperless-ngx-dev          Up (healthy)    0.0.0.0:8000->8000/tcp
pllm-app-dev               Up              0.0.0.0:3000->3000/tcp
```

### Viewing Logs

```bash
# All services
docker compose -f docker-compose.dev.yml logs -f

# Specific service
docker compose -f docker-compose.dev.yml logs -f paperless-ngx-dev
docker compose -f docker-compose.dev.yml logs -f pllm-app-dev

# Last 100 lines
docker compose -f docker-compose.dev.yml logs --tail=100 pllm-app-dev
```

### Stopping Services

```bash
# Stop but keep data
docker compose -f docker-compose.dev.yml stop

# Stop and remove containers (keeps volumes)
docker compose -f docker-compose.dev.yml down

# Stop, remove containers, and delete data
docker compose -f docker-compose.dev.yml down -v
```

### Restarting Services

```bash
# Restart all
docker compose -f docker-compose.dev.yml restart

# Restart specific service
docker compose -f docker-compose.dev.yml restart pllm-app-dev
```

## Local Development (No Docker)

For local development without Docker containers:

### 1. Install Dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Start PostgreSQL

You need PostgreSQL running locally:

```bash
# Using Docker (recommended)
docker run -d \
  --name paperless-llm-db \
  -e POSTGRES_DB=paperless_llm_dev \
  -e POSTGRES_USER=paperless_llm \
  -e POSTGRES_PASSWORD=devpassword \
  -p 5432:5432 \
  postgres:15-alpine

# Or install PostgreSQL locally
sudo apt install postgresql  # Ubuntu/Debian
brew install postgresql      # macOS
```

### 3. Start Ollama

```bash
# Start Ollama service
ollama serve

# Pull model (in another terminal)
ollama pull llama3
```

### 4. Configure Application

```bash
cp config.example.yaml config.yaml
# Edit config.yaml with your settings
```

### 5. Run Migrations

```bash
cd server
npm run migrate
```

### 6. Start Development Servers

```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

**Or use the helper scripts:**

```bash
# Terminal 1: Backend
./dev-server-start.sh

# Terminal 2: Frontend
./dev-frontend-start.sh
```

### 7. Access Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **API Docs:** http://localhost:3000/api/docs (if available)

## Container Shell Access

Access container shells for debugging and inspection:

### Paperless-LLM Container

```bash
# Get container name
docker ps | grep pllm-app

# Shell into container
docker exec -it pllm-app-dev /bin/bash

# Or with Docker Compose
cd docker
docker compose -f docker-compose.dev.yml exec pllm-app-dev /bin/bash
```

**Inside the container:**
```bash
# Check Node.js version
node --version

# Check running processes
ps aux

# View application logs
tail -f /app/logs/app.log

# Run npm commands
npm run migrate
npm test

# Check environment variables
env | grep DB_
```

### PostgreSQL Container

```bash
# Shell into Paperless-LLM database
docker exec -it pllm-postgres-dev /bin/bash

# Or directly access psql
docker exec -it pllm-postgres-dev psql -U paperless_llm -d paperless_llm_dev
```

**Inside psql:**
```sql
-- List databases
\l

-- Connect to database
\c paperless_llm_dev

-- List tables
\dt

-- View jobs
SELECT id, document_id, state FROM jobs ORDER BY created_at DESC LIMIT 10;

-- View steps
SELECT id, job_id, step_type, status FROM steps WHERE status = 'IN_FALLOUT';

-- View prompts
SELECT step_type, version FROM prompts;

-- Exit
\q
```

### Paperless-NG Container

```bash
# Shell into Paperless container
docker exec -it paperless-ngx-dev /bin/bash

# Check Paperless version
python manage.py version

# Create superuser (if needed)
python manage.py createsuperuser

# Check documents
python manage.py document_count
```

## Database Access

### Using psql Command Line

```bash
# From host machine (if postgres-client installed)
psql -h localhost -p 5432 -U paperless_llm -d paperless_llm_dev

# From Docker container
docker exec -it pllm-postgres-dev psql -U paperless_llm -d paperless_llm_dev
```

### Using pgAdmin

```bash
# Add pgAdmin to docker-compose.dev.yml
services:
  pgadmin:
    image: dpage/pgadmin4
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@example.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"

# Start services
docker compose -f docker-compose.dev.yml up -d

# Access: http://localhost:5050
# Add server: Host=pllm-postgres-dev, Port=5432, User=paperless_llm
```

### Using VS Code Extensions

1. Install "PostgreSQL" extension (by Chris Kolkman)
2. Add connection:
   - Host: localhost
   - Port: 5432
   - Database: paperless_llm_dev
   - Username: paperless_llm
   - Password: devpassword
3. Run queries directly in VS Code

### Common Database Queries

```sql
-- View all jobs with their current state
SELECT 
  id, 
  document_id, 
  state, 
  workflow_type,
  created_at,
  updated_at
FROM jobs 
ORDER BY created_at DESC 
LIMIT 20;

-- View steps with status counts
SELECT 
  step_type,
  status,
  COUNT(*) as count
FROM steps
GROUP BY step_type, status
ORDER BY step_type, status;

-- Find stuck steps
SELECT 
  id,
  job_id,
  step_type,
  status,
  retry_count,
  updated_at,
  error
FROM steps
WHERE status = 'IN_PROGRESS'
  AND updated_at < NOW() - INTERVAL '5 minutes';

-- View retry queue
SELECT 
  id,
  job_id,
  step_type,
  retry_count,
  retry_after,
  error
FROM steps
WHERE status = 'RETRYING'
ORDER BY retry_after;

-- View fallout items
SELECT 
  s.id,
  s.job_id,
  s.step_type,
  s.retry_count,
  s.error,
  j.document_id
FROM steps s
JOIN jobs j ON s.job_id = j.id
WHERE s.status = 'IN_FALLOUT'
ORDER BY s.updated_at DESC;

-- Clear old completed jobs (be careful!)
DELETE FROM jobs 
WHERE state = 'COMPLETED' 
  AND created_at < NOW() - INTERVAL '30 days';
```

## Development Workflow

### Making Code Changes

#### Backend Changes

```bash
# Server runs with nodemon (auto-restart on changes)
cd server
npm run dev

# Make changes to files in server/src/
# Server automatically restarts on save
```

**Hot Reload:** The backend uses `nodemon` to automatically restart on file changes.

#### Frontend Changes

```bash
# Frontend runs with Vite (Hot Module Replacement)
cd frontend
npm run dev

# Make changes to files in frontend/src/
# Browser automatically updates on save
```

**HMR:** The frontend uses Vite's Hot Module Replacement for instant updates without full page reload.

### Adding Database Migrations

```bash
cd server/migrations

# Create new migration file
# Format: NNN_description.sql (e.g., 005_add_tags_table.sql)
cat > 005_add_tags_table.sql << 'EOF'
-- Add tags support
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE job_tags (
  job_id UUID NOT NULL REFERENCES jobs(id),
  tag_id UUID NOT NULL REFERENCES tags(id),
  PRIMARY KEY (job_id, tag_id)
);
EOF

# Run migration
npm run migrate
```

### Running Tests

```bash
# Backend tests
cd server
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test -- StepExecutor   # Run specific test

# Frontend tests
cd frontend
npm test

# Integration tests
cd server
npm run test:integration

# Coverage
npm run test:coverage
```

### Linting and Formatting

```bash
# Backend
cd server
npm run lint              # Check for issues
npm run lint:fix          # Auto-fix issues
npm run format            # Format with Prettier

# Frontend
cd frontend
npm run lint
npm run lint:fix
npm run format
```

### TypeScript Type Checking

```bash
# Backend
cd server
npm run type-check

# Frontend
cd frontend
npm run type-check
```

## Debugging

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/server",
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug Frontend",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/frontend/src"
    }
  ]
}
```

**Usage:**
1. Set breakpoints in code
2. Press F5 or use Debug panel
3. Select configuration
4. Debug!

### Docker Container Debugging

```bash
# View container logs
docker logs -f pllm-app-dev

# Check container resource usage
docker stats pllm-app-dev

# Inspect container
docker inspect pllm-app-dev

# Check container network
docker network inspect docker_default
```

### Application Debugging

```bash
# Enable debug logging
export LOG_LEVEL=debug
npm run dev

# Debug specific module
DEBUG=app:* npm run dev

# Node.js debugger
node --inspect server/src/api.js

# Then connect Chrome DevTools to chrome://inspect
```

### Database Debugging

```bash
# Enable query logging in PostgreSQL
docker exec -it pllm-postgres-dev psql -U paperless_llm -d paperless_llm_dev

# Inside psql:
\set ECHO_QUERIES on
ALTER DATABASE paperless_llm_dev SET log_statement = 'all';

# View logs
docker logs pllm-postgres-dev 2>&1 | grep 'LOG:  statement:'
```

## Common Issues

### Port Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find process using port
lsof -i :3000
sudo netstat -tlnp | grep 3000

# Kill process
kill -9 <PID>

# Or change port
export API_PORT=3001
npm run dev
```

### Docker Compose Not Starting

**Error:** `ERROR: Couldn't connect to Docker daemon`

**Solution:**
```bash
# Start Docker service
sudo systemctl start docker  # Linux
# Or start Docker Desktop     # macOS/Windows

# Check Docker is running
docker ps
```

### Database Connection Failed

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**
```bash
# Check PostgreSQL container is running
docker ps | grep postgres

# Check PostgreSQL logs
docker logs pllm-postgres-dev

# Restart PostgreSQL
docker restart pllm-postgres-dev

# Verify connection
docker exec -it pllm-postgres-dev psql -U paperless_llm -d paperless_llm_dev
```

### Ollama Connection Failed

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:11434`

**Solution:**
```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama
ollama serve

# Pull model
ollama pull llama3

# Test model
ollama run llama3 "Hello"
```

### Paperless API Token Invalid

**Error:** `401 Unauthorized` when calling Paperless API

**Solution:**
1. Generate new token in Paperless UI (Settings → API)
2. Update `config.yaml`:
   ```yaml
   paperless:
     token: your_new_token_here
   ```
3. Restart application

### Node Modules Issues

**Error:** Various module not found errors

**Solution:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Or use fresh install
npm ci
```

### TypeScript Compilation Errors

**Error:** `TS2322: Type 'X' is not assignable to type 'Y'`

**Solution:**
```bash
# Clean build
rm -rf dist
npm run build

# Check types
npm run type-check

# Restart TS server (VS Code)
# Cmd+Shift+P → "TypeScript: Restart TS Server"
```

### Permission Denied (Docker Volumes)

**Error:** `EACCES: permission denied` inside container

**Solution:**
```bash
# Fix ownership (Linux)
sudo chown -R $USER:$USER .

# Or run container as current user
docker compose run --user $(id -u):$(id -g) pllm-app-dev
```

## Development Tips

### Faster Development Cycle

```bash
# Use nodemon for backend (auto-restart)
npm run dev  # Already configured

# Use Vite for frontend (instant HMR)
npm run dev  # Already configured

# Use Docker Compose watch mode (Docker Compose 2.20+)
docker compose -f docker-compose.dev.yml watch
```

### Database Seeding

```bash
# Create seed script
cat > server/migrations/seed-dev.sql << 'EOF'
-- Insert test jobs
INSERT INTO jobs (id, document_id, state, workflow_type)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '12345', 'COMPLETED', 'AUTOMATED'),
  ('00000000-0000-0000-0000-000000000002', '67890', 'FAILED', 'AUTOMATED');
EOF

# Run seed
docker exec -it pllm-postgres-dev psql -U paperless_llm -d paperless_llm_dev -f /docker-entrypoint-initdb.d/seed-dev.sql
```

### Quick Reset

```bash
# Reset everything (WARNING: destroys data)
cd docker
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d

# Wait for services
sleep 30

# Reconfigure
cd ..
./dev-start.sh
```

### Performance Monitoring

```bash
# Monitor Docker resources
docker stats

# Monitor Node.js
npm install -g clinic
clinic doctor -- node server/src/api.js

# Monitor PostgreSQL
docker exec -it pllm-postgres-dev pg_top -U paperless_llm -d paperless_llm_dev
```

## Next Steps

- **[Configuration Guide](CONFIGURATION.md)** - Customize your setup
- **[Architecture Guide](ARCHITECTURE.md)** - Understand the system
- **[Contributing Guide](CONTRIBUTING.md)** - Start contributing
- **[Troubleshooting Guide](TROUBLESHOOTING.md)** - Debug issues

## Getting Help

- **GitHub Issues:** Report bugs and request features
- **Discord/Slack:** Real-time help (if available)
- **Documentation:** Check other guides in `docs/`
- **Logs:** Always check logs first (`docker compose logs -f`)
