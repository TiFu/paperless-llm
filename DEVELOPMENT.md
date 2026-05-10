# Development Setup Guide

Complete step-by-step guide for setting up the Paperless LLM development environment.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development without Docker)
- Ollama running locally with a model (e.g., llama3) - optional but recommended

## Quick Start

Follow these steps in order for a complete setup:

1. [Start Docker Compose](#1-start-docker-compose)
2. [Set up Paperless-ngx](#2-set-up-paperless-ngx)
3. [Configure Paperless LLM](#3-configure-paperless-llm)
4. [Start the Application](#4-start-the-application)
5. [Verify the Integration](#5-verify-the-integration)

---

## 1. Start Docker Compose

Start all infrastructure services (PostgreSQL databases, Redis, and Paperless-ngx):

```bash
cd /home/tino/syncthing/pc/development/picloud-rewrite/ns-apps/paperless-llm
docker-compose -f docker/docker-compose.dev.yml up -d
```

### Expected Output

```
Creating network "paperless-llm_default" or using existing
Creating volume "paperless-llm_pllm_postgres_data_dev" with default driver
Creating volume "paperless-llm_paperless_postgres_data_dev" with default driver
Creating volume "paperless-llm_paperless_data_dev" with default driver
Creating pllm-postgres-dev ... done
Creating paperless-postgres-dev ... done
Creating paperless-redis-dev ... done
Creating paperless-ngx-dev ... done
Creating pllm-app-dev ... done
```

### Wait Time

First startup takes 2-3 minutes:
- PostgreSQL databases: ~20 seconds each
- Paperless-ngx initialization: ~2 minutes (downloads OCR models, sets up admin user)

Check status:

```bash
docker ps
```

You should see:
- `pllm-postgres-dev` - healthy
- `paperless-postgres-dev` - healthy
- `paperless-redis-dev` - running
- `paperless-ngx-dev` - healthy
- `pllm-app-dev` - running

Check Paperless-ngx logs to confirm it's ready:

```bash
docker logs paperless-ngx-dev
```

Wait for: `"Paperless-ngx ready!"` or similar message indicating the webserver is running.

---

## 2. Set up Paperless-ngx

### 2.1 Access the Web UI

Open your browser and navigate to:

```
http://localhost:8000
```

### 2.2 Login

Use the default credentials:
- **Username**: `admin`
- **Password**: `admin`

> **Note**: Change these credentials in production! Set `PAPERLESS_ADMIN_USER` and `PAPERLESS_ADMIN_PASSWORD` in your `.env` file.

### 2.3 Generate API Token

Once logged in:

1. Click on your username in the top right corner
2. Select **Settings** from the dropdown
3. Navigate to **API** section in the left sidebar
4. Under **Token Authentication**, click **Create new token**
5. Give it a name like `paperless-llm-dev`
6. Click **Create**
7. **Copy the token** - you'll need it in the next step

The token will look like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0`

### 2.4 Create the `llm-process` Tag

Tags are used to identify documents that should be processed by the LLM:

1. Navigate to **Tags** in the left sidebar (or click the tags icon)
2. Click **Create tag** button
3. Enter the following details:
   - **Name**: `llm-process`
   - **Color**: Choose any color (e.g., blue or green)
   - **Is inbox tag**: Leave unchecked
4. Click **Save**

### 2.5 Upload Test Documents (Optional)

Upload some test documents to verify the setup:

1. Navigate to **Documents** in the left sidebar
2. Click **Upload** button
3. Select PDFs or images from `test-documents/consume/` folder
4. Once uploaded, assign the `llm-process` tag to at least one document:
   - Click on the document
   - In the right panel, find **Tags**
   - Add the `llm-process` tag
   - Click **Save**

Alternatively, drop files directly into `test-documents/consume/` and Paperless will auto-import them:

```bash
# Files in this directory are automatically consumed by Paperless
cp your-document.pdf test-documents/consume/
```

Watch the consumption logs:

```bash
docker logs -f paperless-ngx-dev
```

---

## 3. Configure Paperless LLM

### 3.1 Create config.yaml

If you don't have a `config.yaml` file yet:

```bash
cp config.example.yaml config.yaml
```

### 3.2 Update Configuration

Edit `config.yaml` with your settings:

```yaml
database:
  host: localhost
  port: 5432
  username: paperless_llm
  password: devpassword
  database: paperless_llm_dev

paperless:
  url: http://localhost:8000
  token: YOUR_API_TOKEN_FROM_STEP_2.3_HERE  # ⚠️ Paste the token you copied earlier
  tags: llm-process

llm:
  url: http://localhost:11434  # Ollama running locally
  model: llama3  # Or any model you have pulled
  temperature: 0.7
  timeoutMs: 30000

worker:
  instanceId: null  # Auto-generated if not specified
  batchSize: 5
  pollIntervalMs: 3000
  maxRetries: 3
  claimTimeoutMs: 300000

orchestration:
  llmCycleDurationMs: 30000
  docUpdateCycleDurationMs: 30000

logging:
  level: debug
  pretty: true

api:
  port: 3000
  corsOrigins:
    - "*"
```

**Important fields to update:**
- `paperless.token`: Paste the API token from step 2.3
- `llm.url`: Ensure Ollama is running and accessible
- `llm.model`: Use a model you've already pulled (e.g., `llama3`, `mistral`, etc.)

### 3.3 Verify Ollama (Optional)

If using Ollama locally, verify it's running:

```bash
curl http://localhost:11434/api/tags
```

Should return a list of available models. If not installed:

```bash
# Pull a model
ollama pull llama3
```

---

## 4. Start the Application

You have two options for running the application:

### Option A: Local Development (Recommended)

Run the backend and frontend directly on your host machine (not in Docker):

**Terminal 1 - Backend:**

```bash
./dev-server-start.sh
```

Expected output:
```
🚀 Starting Paperless LLM Server (API + Workers)

✅ Starting backend on http://localhost:3000
   (nodemon will watch for changes and auto-restart)

[nodemon] starting `npx ts-node src/api.ts`
{"level":30,"time":1234567890,"msg":"Database connected"}
{"level":30,"time":1234567891,"msg":"Server listening on port 3000"}
```

**Terminal 2 - Frontend:**

```bash
./dev-frontend-start.sh
```

Expected output:
```
🚀 Starting Paperless LLM Frontend

✅ Starting frontend on http://localhost:5173
   (Vite HMR enabled - instant updates on file changes)

  VITE v5.x.x  ready in 324 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Option B: Inside Docker Container

Use the development container:

```bash
docker exec -it pllm-app-dev sh

# Inside the container
cd /app/server && npm start
```

---

## 5. Verify the Integration

### 5.1 Check Backend Health

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2026-05-10T12:00:00.000Z",
  "uptime": 123.456
}
```

### 5.2 Check Queue Status

```bash
curl http://localhost:3000/api/queue
```

Should return information about the job queues (may be empty initially).

### 5.3 Access Frontend

Open http://localhost:5173 in your browser.

You should see the Paperless LLM dashboard with:
- Documents page
- Queues page
- Prompts page
- Approvals page

### 5.4 Trigger Document Processing

Submit a job to process documents tagged with `llm-process`:

```bash
# Using the helper script
./submit-job.sh

# Or manually via API
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "workflowType": "document-processing",
    "documentTag": "llm-process"
  }'
```

Expected response:

```json
{
  "jobId": "job-uuid-here",
  "status": "pending",
  "workflowType": "document-processing",
  "createdAt": "2026-05-10T12:00:00.000Z"
}
```

### 5.5 Monitor Logs

Watch the backend logs for activity:

```bash
# If running locally
# Check Terminal 1 where dev-server-start.sh is running

# If using Docker
docker logs -f pllm-app-dev
```

You should see:
- Document fetching from Paperless
- LLM requests and responses
- Queue processing updates
- Job status changes

### 5.6 Check Job Status

```bash
curl http://localhost:3000/api/jobs/<job-id>
```

Replace `<job-id>` with the ID returned from step 5.4.

---

## Troubleshooting

### Paperless-ngx Not Starting

**Symptom**: `paperless-ngx-dev` container exits or is unhealthy

**Solutions**:
1. Check logs: `docker logs paperless-ngx-dev`
2. Verify database connection: `docker logs paperless-postgres-dev`
3. Wait longer - first startup downloads OCR models (~500MB)
4. Reset and try again:
   ```bash
   docker-compose -f docker/docker-compose.dev.yml down -v
   docker-compose -f docker/docker-compose.dev.yml up -d
   ```

### API Token Invalid

**Symptom**: `401 Unauthorized` when connecting to Paperless

**Solutions**:
1. Verify the token in `config.yaml` matches the one from Paperless UI
2. Token may have expired - generate a new one
3. Check `paperless.url` is correct: `http://localhost:8000`

### Database Connection Failed

**Symptom**: Backend logs show database connection errors

**Solutions**:
1. Verify PostgreSQL is running: `docker ps | grep pllm-postgres-dev`
2. Check health: `docker exec pllm-postgres-dev pg_isready -U paperless_llm`
3. Verify credentials in `config.yaml` match:
   - `username: paperless_llm`
   - `password: devpassword`
   - `database: paperless_llm_dev`
   - `host: localhost`
   - `port: 5432`

### Ollama Connection Failed

**Symptom**: LLM requests timeout or fail

**Solutions**:
1. Verify Ollama is running: `curl http://localhost:11434/api/tags`
2. Check model is available: `ollama list`
3. Pull model if needed: `ollama pull llama3`
4. Update `config.yaml` with correct `llm.url` and `llm.model`

### Port Conflicts

**Symptom**: Docker fails to start with "port already in use"

**Solutions**:
1. Check what's using the port:
   ```bash
   sudo lsof -i :5432  # PostgreSQL
   sudo lsof -i :8000  # Paperless-ngx
   sudo lsof -i :3000  # Backend API
   ```
2. Stop conflicting services or modify ports in `docker-compose.dev.yml`:
   ```yaml
   ports:
     - "5434:5432"  # Change host port
   ```

### No Documents Processing

**Symptom**: Jobs complete but nothing happens

**Solutions**:
1. Verify documents have the `llm-process` tag in Paperless
2. Check tag name exactly matches in `config.yaml`: `tags: llm-process`
3. Review backend logs for errors
4. Verify Paperless API token has permissions to read documents

---

## Database Access

### Connect to Paperless-LLM Database

```bash
docker exec -it pllm-postgres-dev psql -U paperless_llm -d paperless_llm_dev
```

### Connect to Paperless-ngx Database

```bash
docker exec -it paperless-postgres-dev psql -U paperless -d paperless
```

### Run Migrations

If migrations haven't been run or you need to re-run them:

```bash
docker exec -it pllm-app-dev sh -c "cd /app/server && npx ts-node -e \"
  // Migration script would go here
  // For now, manually run SQL files from server/migrations/
\""
```

Or manually:

```bash
docker exec -i pllm-postgres-dev psql -U paperless_llm -d paperless_llm_dev < server/migrations/001_initial_schema.sql
docker exec -i pllm-postgres-dev psql -U paperless_llm -d paperless_llm_dev < server/migrations/002_seed_default_prompts.sql
```

---

## Development Workflow

### Making Changes

1. **Backend changes** (`server/src/**/*.ts`):
   - Edit files on your host machine
   - Nodemon automatically restarts the server
   - Check Terminal 1 for restart confirmation

2. **Frontend changes** (`frontend/src/**/*`):
   - Edit files on your host machine
   - Vite HMR instantly reflects changes
   - Browser auto-refreshes

3. **Configuration changes** (`config.yaml`):
   - Edit the file
   - Restart the backend: `Ctrl+C` in Terminal 1, then `./dev-server-start.sh` again

### Running Tests

```bash
# Backend tests
cd server
npm test

# Frontend tests
cd frontend
npm test
```

### Stopping Services

```bash
# Stop dev scripts: Ctrl+C in each terminal

# Stop Docker services
docker-compose -f docker/docker-compose.dev.yml down

# Stop and remove all data (including databases)
docker-compose -f docker/docker-compose.dev.yml down -v
```

---

## Next Steps

- Review [API_EXAMPLES.md](API_EXAMPLES.md) for API usage examples
- Check [docker/README.md](docker/README.md) for Docker-specific details
- See [README.md](README.md) for architecture and design documentation
- Explore [ImprovementIdeas.md](ImprovementIdeas.md) for future enhancements

---

## Summary Checklist

- [ ] Docker Compose services started and healthy
- [ ] Paperless-ngx accessible at http://localhost:8000
- [ ] Logged in with admin:admin
- [ ] API token generated and copied
- [ ] `llm-process` tag created in Paperless
- [ ] Test documents uploaded (optional)
- [ ] `config.yaml` created and configured with API token
- [ ] Ollama running with model available (optional)
- [ ] Backend started and healthy (http://localhost:3000/api/health)
- [ ] Frontend accessible (http://localhost:5173)
- [ ] Job submitted and processing logs visible

If all boxes are checked, your development environment is ready! 🎉
