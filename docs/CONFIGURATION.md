# Configuration Guide

This guide covers all configuration options for Paperless-LLM, including environment variables, config file settings, and deployment scenarios.

## Table of Contents

- [Configuration Files](#configuration-files)
- [Database Configuration](#database-configuration)
- [Paperless Configuration](#paperless-configuration)
- [LLM Configuration](#llm-configuration)
- [Worker Configuration](#worker-configuration)
- [Retry Configuration](#retry-configuration)
- [API Configuration](#api-configuration)
- [Logging Configuration](#logging-configuration)
- [Environment Variables](#environment-variables)
- [Configuration Examples](#configuration-examples)

## Configuration Files

### config.yaml

The main configuration file. Copy from `config.example.yaml` to get started:

```bash
cp config.example.yaml config.yaml
```

**Location:** Root directory (`/home/tino/syncthing/pc/development/picloud-rewrite/ns-apps/paperless-llm/config.yaml`)

**Format:** YAML

**Loading Order:**
1. Default values (hardcoded)
2. `config.yaml` (if exists)
3. Environment variables (override config.yaml)

### config.example.yaml

Template configuration with all available options and descriptions. Use as reference or starting point.

## Database Configuration

PostgreSQL database connection settings.

### Configuration

```yaml
database:
  host: localhost
  port: 5432
  username: paperless_llm
  password: devpassword
  database: paperless_llm_dev
```

### Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `host` | string | Yes | - | PostgreSQL host |
| `port` | number | Yes | - | PostgreSQL port |
| `username` | string | Yes | - | Database user |
| `password` | string | Yes | - | Database password |
| `database` | string | Yes | - | Database name |

### Environment Variables

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=paperless_llm
export DB_PASSWORD=devpassword
export DB_NAME=paperless_llm_dev
```

### Connection Pooling

The application uses connection pooling for efficiency:

- **Pool Size:** 20 connections (default)
- **Idle Timeout:** 30 seconds
- **Connection Timeout:** 10 seconds

To adjust pool settings, modify `server/src/infrastructure/Database.ts`.

### Database Migrations

Migrations run automatically on startup:

```bash
npm run migrate  # Run migrations manually
```

**Migration Files:** `server/migrations/*.sql`

## Paperless Configuration

Paperless-NG API connection and document filtering settings.

### Configuration

```yaml
paperless:
  url: http://localhost:8000
  token: your_paperless_token_here
  tags: llm-process
  timeoutMs: 10000
```

### Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `url` | string | Yes | - | Paperless-NG base URL |
| `token` | string | Yes | - | API authentication token |
| `tags` | string | No | - | Tag filter for automated processing |
| `timeoutMs` | number | No | 10000 | Request timeout (milliseconds) |

### Environment Variables

```bash
export PAPERLESS_URL=http://localhost:8000
export PAPERLESS_TOKEN=your_token_here
export PAPERLESS_TAGS=llm-process
export PAPERLESS_TIMEOUT_MS=10000
```

### Getting a Paperless Token

1. Log in to Paperless-NG web UI
2. Click your username (top right) → Settings
3. Navigate to "API" section
4. Click "Create new token"
5. Copy token and add to config.yaml

### Tag-Based Automation

The `tags` option enables automatic document discovery:

```yaml
paperless:
  tags: llm-process  # Documents with this tag are automatically queued
```

**How it works:**
1. Automated scheduler polls Paperless every N minutes
2. Finds documents with specified tag
3. Creates jobs for documents not yet processed
4. Optionally removes tag after processing

**Planned Feature:** Multiple tags for different workflows

## LLM Configuration

Ollama (or other LLM service) connection and model settings.

### Configuration

```yaml
llm:
  url: http://localhost:11434
  model: llama3
  temperature: 0.7
  timeoutMs: 30000
```

### Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `url` | string | Yes | - | Ollama API base URL |
| `model` | string | Yes | - | Model name (llama3, mistral, etc.) |
| `temperature` | number | No | 0.7 | Creativity level (0.0-2.0) |
| `timeoutMs` | number | No | 30000 | Request timeout (milliseconds) |

### Environment Variables

```bash
export LLM_URL=http://localhost:11434
export LLM_MODEL=llama3
export LLM_TEMPERATURE=0.7
export LLM_TIMEOUT_MS=30000
```

### Supported Models

Any Ollama-compatible model:

- **llama3** - Recommended, good balance of speed and quality
- **mistral** - Faster, slightly lower quality
- **llama2** - Older, still effective
- **codellama** - Better for structured data extraction
- **custom models** - Any model you've installed in Ollama

**Install a model:**
```bash
ollama pull llama3
```

### Temperature Settings

Controls randomness of LLM output:

| Temperature | Effect | Use Case |
|-------------|--------|----------|
| 0.0 | Deterministic, consistent | Title generation, classification |
| 0.7 | Balanced (default) | General purpose |
| 1.0 | Creative | Summaries, descriptions |
| 1.5+ | Very creative | Avoid for document processing |

**Recommendation:** Use 0.0-0.3 for consistent, factual outputs.

### Timeout Tuning

- **Default:** 30000ms (30 seconds)
- **Increase if:** Using large models or slow hardware
- **Decrease if:** Using small models or fast GPUs
- **Max recommended:** 60000ms (60 seconds)

**Timeout behavior:**
- Request cancelled after timeout
- Step marked as failed
- Enters retry queue
- Retried with exponential backoff

## Worker Configuration

Worker polling behavior and concurrency settings.

### Configuration

```yaml
worker:
  instanceId: null              # Auto-generated if null
  batchSize: 5                  # Steps per polling cycle
  pollIntervalMs: 3000          # Poll every 3 seconds
  maxRetries: 3                 # Max retries before fallout
  claimTimeoutMs: 300000        # 5 minutes step timeout
  stuckStepTimeoutMs: 300000    # 5 minutes stuck detection
  stuckStepCheckIntervalMs: 30000  # Check every 30 seconds
  maxStepRetries: 3             # Deprecated (use retry.maxRetries)
```

### Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `instanceId` | string | No | auto | Unique worker identifier |
| `batchSize` | number | No | 5 | Steps processed per cycle |
| `pollIntervalMs` | number | No | 3000 | Polling frequency |
| `claimTimeoutMs` | number | No | 300000 | Step claim expiration |
| `stuckStepTimeoutMs` | number | No | 300000 | Time before step considered stuck |
| `stuckStepCheckIntervalMs` | number | No | 30000 | Stuck step check frequency |

### Environment Variables

```bash
export WORKER_INSTANCE_ID=worker-01
export WORKER_BATCH_SIZE=5
export WORKER_POLL_INTERVAL_MS=3000
export WORKER_CLAIM_TIMEOUT_MS=300000
export WORKER_STUCK_STEP_TIMEOUT_MS=300000
export WORKER_STUCK_STEP_CHECK_INTERVAL_MS=30000
```

### Batch Size Tuning

Controls how many steps are processed in each polling cycle:

| Batch Size | Throughput | Latency | Use Case |
|------------|------------|---------|----------|
| 1 | Low | Low | Development, debugging |
| 5 | Medium | Medium | Default, balanced |
| 10-20 | High | Higher | Production, high volume |

**Considerations:**
- Larger batches = higher throughput, longer cycles
- Smaller batches = lower throughput, more responsive
- Balance based on your workload

### Poll Interval Tuning

Controls how frequently workers check for new work:

| Interval | Latency | DB Load | Use Case |
|----------|---------|---------|----------|
| 1000ms | Very low | High | Real-time requirements |
| 3000ms | Low | Medium | Default, balanced |
| 10000ms | Medium | Low | Low-priority processing |
| 30000ms+ | High | Very low | Batch processing |

**Recommendation:** 3000ms (3 seconds) for most use cases.

### Multiple Workers

Run multiple worker instances for horizontal scaling:

```bash
# Terminal 1
WORKER_INSTANCE_ID=worker-01 npm run start:worker

# Terminal 2
WORKER_INSTANCE_ID=worker-02 npm run start:worker

# Terminal 3
WORKER_INSTANCE_ID=worker-03 npm run start:worker
```

**Coordination:**
- Workers coordinate via database locks
- No explicit communication between workers
- Each worker claims non-overlapping batches
- Safe to run N workers simultaneously

### Stuck Step Detection

Workers periodically check for steps stuck in IN_PROGRESS state:

```yaml
worker:
  stuckStepTimeoutMs: 300000        # 5 minutes
  stuckStepCheckIntervalMs: 30000   # Check every 30 seconds
```

**How it works:**
1. Stuck step detector runs every `stuckStepCheckIntervalMs`
2. Finds steps IN_PROGRESS for > `stuckStepTimeoutMs`
3. Marks them as FAILED
4. Triggers retry logic

**Common causes:**
- Worker crashed mid-execution
- External service timeout
- Database connection lost
- OOM kill

## Retry Configuration

Automatic retry behavior for failed steps.

### Configuration

```yaml
retry:
  maxRetries: 3                 # Max attempts
  retryDelayInMs: 30000         # Base delay (30 seconds)
  retryExponent: 2              # Exponential multiplier
```

### Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `maxRetries` | number | Yes | 3 | Maximum retry attempts |
| `retryDelayInMs` | number | Yes | 30000 | Base retry delay (ms) |
| `retryExponent` | number | Yes | 2 | Exponential backoff base |

### Environment Variables

```bash
export RETRY_MAX_RETRIES=3
export RETRY_DELAY_MS=30000
export RETRY_EXPONENT=2
```

### Exponential Backoff

Retry delays increase exponentially to avoid overwhelming services:

```
Retry 1: 30s  (2^0 * 30000ms = 30000ms)
Retry 2: 60s  (2^1 * 30000ms = 60000ms)
Retry 3: 120s (2^2 * 30000ms = 120000ms)
```

**Formula:** `delay = retryExponent^retryCount * retryDelayInMs`

### Retry Strategy Examples

**Aggressive (fast recovery):**
```yaml
retry:
  maxRetries: 5
  retryDelayInMs: 10000   # 10 seconds
  retryExponent: 1.5
# Results: 10s, 15s, 22.5s, 33.75s, 50.6s
```

**Conservative (avoid service overwhelm):**
```yaml
retry:
  maxRetries: 3
  retryDelayInMs: 60000   # 1 minute
  retryExponent: 3
# Results: 60s, 180s, 540s (1m, 3m, 9m)
```

**Balanced (default):**
```yaml
retry:
  maxRetries: 3
  retryDelayInMs: 30000   # 30 seconds
  retryExponent: 2
# Results: 30s, 60s, 120s
```

### Fallout Handling

After `maxRetries` attempts, steps enter IN_FALLOUT state:

- Manual intervention required
- Use `/api/steps/:id/retry` to reset
- Consider increasing maxRetries if frequent fallouts
- Investigate root cause (logs, external service health)

## API Configuration

REST API server settings.

### Configuration

```yaml
api:
  port: 3000
  corsOrigins:
    - "*"
```

### Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `port` | number | Yes | 3000 | HTTP port |
| `corsOrigins` | string[] | Yes | ["*"] | Allowed CORS origins |

### Environment Variables

```bash
export API_PORT=3000
export API_CORS_ORIGINS="http://localhost:5173,http://localhost:3000"
```

### CORS Configuration

**Development (allow all):**
```yaml
api:
  corsOrigins:
    - "*"
```

**Production (restrict origins):**
```yaml
api:
  corsOrigins:
    - "https://paperless.example.com"
    - "https://app.example.com"
```

### Port Selection

**Default:** 3000

**Change if:**
- Port conflict with other services
- Corporate firewall restrictions
- Load balancer requirements

```bash
export API_PORT=8080
npm start
```

## Logging Configuration

Application logging settings.

### Configuration

```yaml
logging:
  level: debug
  pretty: true
```

### Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `level` | string | No | info | Log level (debug, info, warn, error) |
| `pretty` | boolean | No | false | Human-readable logs (vs JSON) |

### Environment Variables

```bash
export LOG_LEVEL=debug
export LOG_PRETTY=true
```

### Log Levels

| Level | Description | Use Case |
|-------|-------------|----------|
| `debug` | Verbose, all details | Development, troubleshooting |
| `info` | Informational messages | Default production |
| `warn` | Warning messages only | Production, reduce noise |
| `error` | Errors only | Production, critical only |

### Log Formats

**Pretty (development):**
```yaml
logging:
  pretty: true
```

Output:
```
[2024-01-15 10:30:45] INFO: Step executed successfully
  stepId: "abc-123"
  jobId: "job-456"
  duration: 1234
```

**JSON (production):**
```yaml
logging:
  pretty: false
```

Output:
```json
{"timestamp":"2024-01-15T10:30:45.123Z","level":"info","message":"Step executed successfully","stepId":"abc-123","jobId":"job-456","duration":1234}
```

**Recommendation:** 
- Development: `pretty: true`, `level: debug`
- Production: `pretty: false`, `level: info`

### Structured Logging

All logs include contextual fields:

- `correlationId` - Trace across services
- `stepId` - Current step
- `jobId` - Current job
- `duration` - Operation duration
- `error` - Error details (if any)

## Environment Variables

Environment variables override `config.yaml` settings.

### Priority

1. **Highest:** Environment variables
2. **Medium:** config.yaml
3. **Lowest:** Default values

### Complete List

#### Database

```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=paperless_llm
DB_PASSWORD=secret
DB_NAME=paperless_llm_dev
```

#### Paperless

```bash
PAPERLESS_URL=http://localhost:8000
PAPERLESS_TOKEN=your_token
PAPERLESS_TAGS=llm-process
PAPERLESS_TIMEOUT_MS=10000
```

#### LLM

```bash
LLM_URL=http://localhost:11434
LLM_MODEL=llama3
LLM_TEMPERATURE=0.7
LLM_TIMEOUT_MS=30000
```

#### Worker

```bash
WORKER_INSTANCE_ID=worker-01
WORKER_BATCH_SIZE=5
WORKER_POLL_INTERVAL_MS=3000
WORKER_CLAIM_TIMEOUT_MS=300000
WORKER_STUCK_STEP_TIMEOUT_MS=300000
WORKER_STUCK_STEP_CHECK_INTERVAL_MS=30000
```

#### Retry

```bash
RETRY_MAX_RETRIES=3
RETRY_DELAY_MS=30000
RETRY_EXPONENT=2
```

#### API

```bash
API_PORT=3000
API_CORS_ORIGINS="*"
```

#### Logging

```bash
LOG_LEVEL=info
LOG_PRETTY=false
```

### .env File Support

Create a `.env` file in the root directory:

```bash
# .env
DB_HOST=localhost
DB_PORT=5432
DB_USER=paperless_llm
DB_PASSWORD=secret
# ... other variables
```

Load with dotenv:
```bash
npm install dotenv
```

```javascript
// Load at startup
require('dotenv').config();
```

## Configuration Examples

### Development Setup

```yaml
database:
  host: localhost
  port: 5432
  username: paperless_llm
  password: devpassword
  database: paperless_llm_dev

paperless:
  url: http://localhost:8000
  token: dev_token_12345
  tags: llm-test

llm:
  url: http://localhost:11434
  model: llama3
  temperature: 0.0  # Consistent for testing
  timeoutMs: 30000

worker:
  batchSize: 1      # Process one at a time for debugging
  pollIntervalMs: 5000  # Slower polling
  maxRetries: 1     # Fail fast for debugging

retry:
  maxRetries: 1
  retryDelayInMs: 10000
  retryExponent: 1

api:
  port: 3000
  corsOrigins:
    - "*"

logging:
  level: debug      # Verbose logging
  pretty: true      # Human-readable
```

### Production Setup

```yaml
database:
  host: postgres.production.internal
  port: 5432
  username: paperless_llm_prod
  password: ${DB_PASSWORD}  # From environment
  database: paperless_llm_prod

paperless:
  url: https://paperless.company.com
  token: ${PAPERLESS_TOKEN}  # From environment
  tags: llm-process
  timeoutMs: 10000

llm:
  url: http://ollama.internal:11434
  model: llama3
  temperature: 0.0  # Consistent results
  timeoutMs: 45000  # Longer timeout for production load

worker:
  batchSize: 10     # Higher throughput
  pollIntervalMs: 3000
  claimTimeoutMs: 300000
  stuckStepTimeoutMs: 300000
  stuckStepCheckIntervalMs: 30000

retry:
  maxRetries: 5     # More attempts
  retryDelayInMs: 60000  # 1 minute base delay
  retryExponent: 2

api:
  port: 3000
  corsOrigins:
    - "https://paperless.company.com"
    - "https://app.company.com"

logging:
  level: info       # Less verbose
  pretty: false     # JSON for log aggregation
```

### High-Throughput Setup

```yaml
database:
  host: postgres.internal
  port: 5432
  username: paperless_llm
  password: ${DB_PASSWORD}
  database: paperless_llm

paperless:
  url: http://paperless.internal:8000
  token: ${PAPERLESS_TOKEN}
  timeoutMs: 5000   # Fast failure

llm:
  url: http://ollama.internal:11434
  model: llama3
  temperature: 0.0
  timeoutMs: 20000  # Fast model

worker:
  batchSize: 20     # Large batches
  pollIntervalMs: 1000  # Aggressive polling
  claimTimeoutMs: 180000  # 3 minutes (shorter)

retry:
  maxRetries: 3
  retryDelayInMs: 15000  # 15 seconds (faster)
  retryExponent: 1.5

api:
  port: 3000
  corsOrigins: ["*"]

logging:
  level: warn       # Minimal logging overhead
  pretty: false
```

**Note:** Run multiple worker instances for true high throughput.

### Docker Compose Setup

```yaml
# docker-compose.yml
version: '3.8'
services:
  paperless-llm:
    image: paperless-llm:latest
    environment:
      # Database
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: paperless_llm
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: paperless_llm
      
      # Paperless
      PAPERLESS_URL: http://paperless:8000
      PAPERLESS_TOKEN: ${PAPERLESS_TOKEN}
      
      # LLM
      LLM_URL: http://ollama:11434
      LLM_MODEL: llama3
      
      # Worker
      WORKER_BATCH_SIZE: 5
      WORKER_POLL_INTERVAL_MS: 3000
      
      # Logging
      LOG_LEVEL: info
      LOG_PRETTY: false
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - ollama
      - paperless
```

## Configuration Validation

The application validates configuration on startup:

**Missing required fields:**
```
Error: Missing required configuration: database.host
```

**Invalid values:**
```
Error: Invalid configuration: worker.batchSize must be > 0
```

**Type mismatches:**
```
Error: Invalid configuration: api.port must be a number
```

## Configuration Best Practices

### Security

✅ **DO:**
- Store sensitive values (passwords, tokens) in environment variables
- Use `.env` files for local development (add to `.gitignore`)
- Rotate tokens regularly
- Use separate configs for dev/staging/prod

❌ **DON'T:**
- Commit secrets to version control
- Share config files with credentials
- Use production credentials in development

### Performance

✅ **DO:**
- Tune batch size based on workload
- Adjust poll interval based on latency requirements
- Increase retries for unreliable networks
- Monitor database connection pool usage

❌ **DON'T:**
- Set poll interval too low (DB overload)
- Set batch size too high (long cycles)
- Disable retries (permanent failures)

### Reliability

✅ **DO:**
- Configure appropriate timeouts
- Enable stuck step detection
- Use exponential backoff for retries
- Monitor fallout rates

❌ **DON'T:**
- Set infinite retries
- Use very short timeouts
- Ignore fallout items

## Related Documentation

- [Dev Setup Guide](DEV_SETUP.md) - Setting up development environment
- [Deployment Guide](DEPLOYMENT.md) - Production deployment patterns
- [Troubleshooting Guide](TROUBLESHOOTING.md) - Debug configuration issues
- [Architecture Guide](ARCHITECTURE.md) - Understand configuration impact

## Code References

Configuration loading:

- `server/src/config/AppConfig.ts` - Configuration schema and validation
- `server/src/infrastructure/Database.ts` - Database connection pooling
- `server/src/services/OllamaService.ts` - LLM client configuration
- `server/src/services/PaperlessService.ts` - Paperless API client
- `server/src/infrastructure/WorkerExecutor.ts` - Worker configuration
