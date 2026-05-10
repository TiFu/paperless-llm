# Paperless-NG LLM Integration Worker

Scalable worker service that integrates Large Language Models (LLMs) with Paperless-NG to automatically generate document titles, tags, and summaries.

## Features

- **Automatic Title Generation**: Uses LLMs to generate descriptive titles for documents
- **Scalable Architecture**: Two-worker design with separate LLM and document update queues
- **Transactional Consistency**: Ensures database integrity with proper transaction boundaries
- **Exponential Backoff Retry**: Automatically retries failed operations with increasing delays
- **Concurrent Processing**: Multiple worker instances can run simultaneously
- **Structured Logging**: JSON-formatted logs with correlation IDs for traceability
- **Health Checks**: Built-in connectivity checks for PostgreSQL, Paperless-NG, and Ollama

## Architecture

### Deployment Modes

**All-in-One (Default)**:
- Single process runs API server + both workers
- Simplest setup for development and small deployments
- Start with: `npm run dev` or `npm start`

**Separate Workers (Advanced)**:
- API server and workers run in separate processes
- Enables horizontal scaling and resource isolation
- Start API: `npm run start:api`
- Start workers: `npm run start:worker` (can run multiple instances)

### Worker Types

Both workers run concurrently in the same process (or separately in advanced deployments):

1. **LLM Worker**: 
   - Claims documents from the LLM work queue
   - Fetches document content from Paperless-NG
   - Sends prompts to Ollama for processing
   - Creates action items in the document update queue

2. **Document Update Worker**:
   - Claims action items from the document update queue
   - Applies updates to Paperless-NG documents
   - Creates audit log entries
   - Handles retry logic for failed updates

### Database Schema

- **llm_work_queue**: Pending LLM processing tasks
- **document_update_work_queue**: Pending document update actions
- **prompts**: Versioned prompt templates for different job types
- **audit_log**: Complete history of all document modifications

### Transaction Boundaries

External API calls (Paperless-NG, Ollama) happen **OUTSIDE** transactions since they cannot be rolled back. Database writes happen **INSIDE** transactions to ensure consistency.

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL 12+
- Paperless-NG instance with API access
- Ollama instance with compatible model (e.g., llama3)

## Installation

### Local Development

```bash
# Configure application
cp config.example.yaml config.yaml
# Edit config.yaml with your Paperless token, database credentials, etc.

# First, start PostgreSQL (using Docker or local install)
docker run -d \
  --name paperless-llm-db \
  -e POSTGRES_DB=paperless_llm_dev \
  -e POSTGRES_USER=paperless_llm \
  -e POSTGRES_PASSWORD=devpassword \
  -p 5432:5432 \
  postgres:15-alpine

# Terminal 1: Start backend server
./dev-server-start.sh
# Backend runs on http://localhost:3000 (with nodemon hot reload)

# Terminal 2: Start frontend
./dev-frontend-start.sh
# Frontend runs on http://localhost:5173 (with Vite HMR)

# To stop: Ctrl+C in each terminal, or use:
./dev-stop.sh
```

**Why separate terminals?**
- Cleaner output (no interleaved logs)
- Independent control (restart services separately)
- Avoids process management issues

Or run manually:

```bash
# Backend
cd server
npm install
npx nodemon --watch src --ext ts --exec "npx ts-node src/api.ts"

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

### Docker Development Environment

Run both backend and frontend with hot reload:

```bash
# Quick start with helper script
./dev-start.sh

# Attach to the dev container
docker exec -it pllm-app-dev sh

# Inside the container, start services
/app/start-services.sh
```

Or manually:

```bash
# Start environment in background
docker-compose -f docker/docker-compose.dev.yml up -d

# Attach and start services
docker exec -it pllm-app-dev sh
/app/start-dev.sh
```

This provides:
- **Backend API** on `localhost:3000` with nodemon + ts-node hot reload
- **Frontend** on `localhost:5173` with Vite hot reload
- **PostgreSQL** on `localhost:5432`
- **Interactive shell** for manual control

Edit files in `worker/src/` or `frontend/src/` and see changes immediately!

See [docker/README.md](docker/README.md) for detailed documentation.

### Docker Production Deployment

```bash
# Set environment variables
export POSTGRES_PASSWORD=your_secure_password
export PAPERLESS_TOKEN=your_paperless_api_token
export PAPERLESS_URL=http://your-paperless-instance:8000

# Build and start all services
cd docker
docker-compose up -d

# View logs
docker-compose logs -f llm-worker
docker-compose logs -f doc-update-worker

# Scale workers
docker-compose up -d --scale llm-worker=4 --scale doc-update-worker=2
```

## Configuration

Configuration is managed via `config.yaml` (see [config.example.yaml](config.example.yaml)):

```yaml
database:
  host: localhost
  port: 5432
  username: paperless_llm
  password: devpassword
  database: paperless_llm_dev

paperless:
  url: http://localhost:8000
  token: your_paperless_token_here
  tags: llm-process

llm:
  url: http://localhost:11434
  model: llama3
  temperature: 0.7
  timeoutMs: 30000

worker:
  instanceId: null  # Auto-generated if not specified
  batchSize: 5
  pollIntervalMs: 3000
  maxRetries: 3
  claimTimeoutMs: 300000

api:
  port: 3000
  corsOrigins:
    - "*"
```
| `PAPERLESS_TOKEN` | Paperless-NG API token | Required |
| `PAPERLESS_TAGS` | Comma-separated tags to filter documents | llm-pending |
| `LOG_PRETTY` | Enable pretty-printed logs | false |

## Usage

### Adding Documents to the Queue

```sql
-- Add a document to the LLM work queue for title generation
INSERT INTO llm_work_queue (document_id, job_type, status)
VALUES (123, 'title', 'pending');
```

### Managing Prompts

```sql
-- View current prompts
SELECT job_type, version, template FROM prompts;

-- Update a prompt (increments version automatically)
INSERT INTO prompts (job_type, template)
VALUES ('title', 'Generate a concise title for: {{documentContent}}')
ON CONFLICT (job_type) DO UPDATE SET template = EXCLUDED.template, version = prompts.version + 1;
```

### Monitoring

```sql
-- Check queue status
SELECT status, COUNT(*) FROM llm_work_queue GROUP BY status;
SELECT status, COUNT(*) FROM document_update_work_queue GROUP BY status;

-- View recent audit logs
SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 20;

-- Check for stuck items (claimed > 5 minutes ago)
SELECT * FROM llm_work_queue 
WHERE status = 'processing' AND claimed_at < NOW() - INTERVAL '5 minutes';
```

## Development

### Project Structure

```
worker/
├── src/
│   ├── config/           # Configuration management
│   ├── domain/           # Domain models, interfaces, jobs
│   │   ├── entities/     # Domain entities
│   │   ├── enums/        # Enumerations
│   │   ├── interfaces/   # Core interfaces
│   │   └── jobs/         # Job implementations
│   ├── implementations/  # External service implementations
│   ├── infrastructure/   # Database, transactions
│   ├── repositories/     # Data access layer
│   │   ├── interfaces/   # Repository interfaces
│   │   └── postgresql/   # PostgreSQL implementations
│   ├── services/         # Business logic
│   ├── utils/            # Utilities (logging, etc.)
│   ├── workers/          # Worker implementations
│   └── index.ts          # Entry point
├── migrations/           # Database migrations
└── tests/                # Test suite
```

### Running Tests

```bash
# Unit tests
npm test

# Integration tests (requires Docker)
npm run test:integration

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Database Migrations

```bash
# Create a new migration
npm run migrate:create migration_name

# Apply migrations
npm run migrate:up

# Rollback migrations
npm run migrate:down
```

## Extending Functionality

### Adding New Job Types

1. Define job type in [JobType enum](worker/src/domain/enums/JobType.ts)
2. Define action type in [ActionType enum](worker/src/domain/enums/ActionType.ts)
3. Create job class implementing `IJob` interface
4. Update `JobFactory.create()` method
5. Add prompt template to database
6. Update `ActionService.applyAction()` for new action types

Example:

```typescript
// worker/src/domain/jobs/SummaryJob.ts
export class SummaryJob implements IJob {
  async execute(
    document: IDocument,
    ollamaService: OllamaService,
    prompt: Prompt,
  ): Promise<ActionItem> {
    const renderedPrompt = prompt.render({
      documentContent: document.content.substring(0, 4000),
    });

    const summary = await ollamaService.sendChatRequest(renderedPrompt);

    return ActionItem.create(
      document.id,
      'paperless-ng',
      ActionType.UPDATE_SUMMARY,
      {
        field: 'summary',
        value: summary.trim(),
        oldValue: null,
      },
    );
  }
}
```

## Troubleshooting

### Workers not processing items

- Check database connectivity: `SELECT NOW();`
- Verify items exist: `SELECT COUNT(*) FROM llm_work_queue WHERE status = 'pending';`
- Check for stuck items: `SELECT * FROM llm_work_queue WHERE status = 'processing';`
- Review worker logs for errors

### External service failures

- Verify Paperless-NG is accessible: `curl $PAPERLESS_URL/api/documents/?page_size=1`
- Verify Ollama is accessible: `curl $LLM_URL/api/tags`
- Check API token validity
- Review retry_after timestamps for pending retries

### Performance tuning

- Increase `WORKER_BATCH_SIZE` for higher throughput
- Decrease `WORKER_POLL_INTERVAL_MS` for lower latency
- Scale worker instances horizontally
- Monitor database connection pool saturation
- Consider adding indexes for custom queries

## License

MIT

## Contributing

Contributions welcome! Please ensure:
- Code follows existing style (ESLint + Prettier)
- Tests pass: `npm test`
- Migrations are reversible
- Documentation is updated
