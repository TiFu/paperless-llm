# Troubleshooting Guide

Common issues, debugging techniques, and solutions for Paperless-LLM.

## Table of Contents

- [General Debugging](#general-debugging)
- [Database Issues](#database-issues)
- [Paperless Connection Issues](#paperless-connection-issues)
- [LLM/Ollama Issues](#llmollama-issues)
- [Worker Issues](#worker-issues)
- [Retry & Fallout Issues](#retry--fallout-issues)
- [Performance Issues](#performance-issues)
- [API Issues](#api-issues)
- [Docker Issues](#docker-issues)
- [Common Error Messages](#common-error-messages)

## General Debugging

### Enable Debug Logging

```yaml
# config.yaml
logging:
  level: debug
  pretty: true
```

```bash
# Or via environment variable
export LOG_LEVEL=debug
npm run dev
```

### Check Health Status

```bash
# API health endpoint
curl http://localhost:3000/api/health

# Expected response
{
  "status": "healthy",
  "database": "connected",
  "paperless": "reachable",
  "ollama": "reachable"
}
```

### View Logs

```bash
# Docker
docker logs -f pllm-app-dev

# Kubernetes
kubectl logs -f -n paperless-llm -l app=paperless-llm-api

# Local development
tail -f server/logs/app.log
```

### Check Queue Status

```bash
# LLM work queue
curl http://localhost:3000/api/queue/llm/stats

# Document update queue
curl http://localhost:3000/api/queue/document-update/stats
```

## Database Issues

### Cannot Connect to Database

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
Error: FATAL: password authentication failed
```

**Solutions:**

1. **Check database is running:**
```bash
# Docker
docker ps | grep postgres

# Check logs
docker logs pllm-postgres-dev
```

2. **Verify connection settings:**
```yaml
# config.yaml
database:
  host: localhost  # or container name in Docker
  port: 5432
  username: paperless_llm
  password: devpassword
  database: paperless_llm_dev
```

3. **Test connection manually:**
```bash
psql -h localhost -p 5432 -U paperless_llm -d paperless_llm_dev
```

4. **Check network connectivity (Docker):**
```bash
# If using Docker, ensure containers are on same network
docker network ls
docker network inspect <network-name>
```

### Migration Failures

**Symptoms:**
```
Error: Migration 003_add_step_retry_tracking.sql failed
Error: relation "jobs" does not exist
```

**Solutions:**

1. **Check migration status:**
```sql
-- Connect to database
psql -h localhost -U paperless_llm -d paperless_llm_dev

-- Check migrations table
SELECT * FROM schema_migrations ORDER BY version;
```

2. **Manually run failed migration:**
```bash
cd server/migrations
psql -h localhost -U paperless_llm -d paperless_llm_dev -f 003_add_step_retry_tracking.sql
```

3. **Reset database (CAREFUL - destroys data):**
```bash
# Drop and recreate database
psql -h localhost -U paperless_llm -d postgres << 'EOF'
DROP DATABASE IF EXISTS paperless_llm_dev;
CREATE DATABASE paperless_llm_dev OWNER paperless_llm;
EOF

# Run migrations
npm run migrate
```

### Database Connection Pool Exhausted

**Symptoms:**
```
Error: Timeout acquiring connection from pool
Error: remaining connection slots are reserved
```

**Solutions:**

1. **Check active connections:**
```sql
SELECT count(*) FROM pg_stat_activity 
WHERE datname = 'paperless_llm_dev';
```

2. **Increase pool size:**
```typescript
// server/src/infrastructure/Database.ts
const pool = new Pool({
  max: 50,  // Increase from default 20
  idleTimeoutMillis: 30000
});
```

3. **Check for connection leaks:**
```bash
# Enable connection logging
export DEBUG=pg:pool
npm run dev
```

4. **Kill idle connections:**
```sql
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'paperless_llm_dev' 
  AND state = 'idle' 
  AND state_change < NOW() - INTERVAL '5 minutes';
```

### Slow Queries

**Symptoms:**
- Long response times
- Workers taking too long to process steps
- High database CPU usage

**Solutions:**

1. **Identify slow queries:**
```sql
-- Enable query logging (PostgreSQL config)
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- Log queries > 1s
SELECT pg_reload_conf();

-- View logs
tail -f /var/lib/postgresql/data/log/postgresql-*.log
```

2. **Check missing indexes:**
```sql
SELECT * FROM pg_stat_user_tables 
WHERE schemaname = 'public' 
ORDER BY seq_scan DESC;
```

3. **Add indexes:**
```sql
-- Example: Index on step status for faster queue queries
CREATE INDEX CONCURRENTLY idx_steps_status ON steps(status);
CREATE INDEX CONCURRENTLY idx_steps_retry_after ON steps(retry_after) 
  WHERE status = 'RETRYING';
```

4. **Analyze tables:**
```sql
ANALYZE steps;
ANALYZE jobs;
```

## Paperless Connection Issues

### Cannot Reach Paperless API

**Symptoms:**
```
Error: connect ECONNREFUSED <paperless-url>
Error: 401 Unauthorized
Error: Request timeout after 10000ms
```

**Solutions:**

1. **Verify Paperless is running:**
```bash
curl http://localhost:8000/api/

# Should return API version info
```

2. **Check token validity:**
```bash
# Test with your token
curl -H "Authorization: Token your_token_here" \
  http://localhost:8000/api/documents/

# Should return documents list
```

3. **Verify configuration:**
```yaml
# config.yaml
paperless:
  url: http://localhost:8000  # No trailing slash
  token: your_valid_token_here
  timeoutMs: 10000
```

4. **Check network connectivity (Docker):**
```bash
# From Paperless-LLM container, test Paperless
docker exec -it pllm-app-dev curl http://paperless-ngx-dev:8000/api/
```

5. **Regenerate API token:**
- Log in to Paperless UI
- Settings → API → Revoke old token
- Create new token
- Update config.yaml

### Document Not Found

**Symptoms:**
```
Error: Document 12345 not found in Paperless
404 Not Found
```

**Solutions:**

1. **Verify document exists:**
```bash
curl -H "Authorization: Token your_token" \
  http://localhost:8000/api/documents/12345/
```

2. **Check document ID:**
```sql
-- Find jobs with missing documents
SELECT j.id, j.document_id, j.state 
FROM jobs j
WHERE NOT EXISTS (
  -- Test if document exists in Paperless
);
```

3. **Cancel job for missing document:**
```bash
curl -X POST http://localhost:3000/api/jobs/<job-id>/cancel
```

## LLM/Ollama Issues

### Cannot Connect to Ollama

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:11434
Error: Failed to generate completion
```

**Solutions:**

1. **Check Ollama is running:**
```bash
curl http://localhost:11434/api/tags

# Should list installed models
```

2. **Start Ollama:**
```bash
ollama serve
```

3. **Verify configuration:**
```yaml
# config.yaml
llm:
  url: http://localhost:11434
  model: llama3
  timeoutMs: 30000
```

4. **Check Docker network (if using Docker):**
```bash
# Test from container
docker exec -it pllm-app-dev curl http://host.docker.internal:11434/api/tags
```

### Model Not Found

**Symptoms:**
```
Error: model "llama3" not found
Error: 404 Not Found
```

**Solutions:**

1. **List installed models:**
```bash
ollama list
```

2. **Pull missing model:**
```bash
ollama pull llama3
```

3. **Verify model name in config:**
```yaml
llm:
  model: llama3  # Must match exactly
```

### LLM Timeout

**Symptoms:**
```
Error: LLM request timeout after 30000ms
Step failed: Timeout
```

**Solutions:**

1. **Increase timeout:**
```yaml
# config.yaml
llm:
  timeoutMs: 60000  # 60 seconds
```

2. **Use smaller model:**
```yaml
llm:
  model: mistral  # Faster than llama3
```

3. **Reduce prompt length:**
- Document content is truncated to 4000 chars by default
- Adjust in PromptDomainService if needed

4. **Check Ollama performance:**
```bash
# Test directly
time ollama run llama3 "Generate a title for: This is a test document"
```

### Poor LLM Output Quality

**Symptoms:**
- Generated titles are too long/short
- Incorrect classifications
- Inconsistent formatting

**Solutions:**

1. **Adjust temperature:**
```yaml
llm:
  temperature: 0.0  # More consistent (less creative)
```

2. **Improve prompts:**
```bash
# Update prompt via API
curl -X PUT http://localhost:3000/api/prompts/LLM_GENERATE_TITLE \
  -H "Content-Type: application/json" \
  -d '{
    "template": "Generate a concise title (max 100 chars):\n\n{{documentContent}}\n\nTitle:"
  }'
```

3. **Try different model:**
```yaml
llm:
  model: llama2  # or mistral, codellama
```

4. **Test with ollama CLI:**
```bash
# Test prompt iteratively
ollama run llama3 "Your prompt here"
```

## Worker Issues

### Workers Not Processing Steps

**Symptoms:**
- Steps stuck in WAITING status
- Queue size growing
- No worker activity in logs

**Solutions:**

1. **Check workers are running:**
```bash
# Docker
docker ps | grep worker

# Kubernetes
kubectl get pods -n paperless-llm -l app=paperless-llm-worker

# Logs
docker logs paperless-llm-worker-1
```

2. **Verify worker configuration:**
```yaml
worker:
  batchSize: 5
  pollIntervalMs: 3000
```

3. **Check for errors in logs:**
```bash
docker logs paperless-llm-worker-1 2>&1 | grep ERROR
```

4. **Restart workers:**
```bash
# Docker
docker restart paperless-llm-worker-1

# Kubernetes
kubectl rollout restart deployment/paperless-llm-worker -n paperless-llm
```

### Steps Stuck in IN_PROGRESS

**Symptoms:**
```sql
SELECT * FROM steps WHERE status = 'IN_PROGRESS' 
  AND updated_at < NOW() - INTERVAL '10 minutes';
```

**Solutions:**

1. **Check stuck step detection:**
```yaml
# Ensure these are configured
worker:
  stuckStepTimeoutMs: 300000        # 5 minutes
  stuckStepCheckIntervalMs: 30000   # Check every 30s
```

2. **Manually reset stuck steps:**
```sql
-- Mark as failed to trigger retry
UPDATE steps 
SET status = 'FAILED',
    error = 'Manually reset stuck step'
WHERE status = 'IN_PROGRESS' 
  AND updated_at < NOW() - INTERVAL '10 minutes';
```

3. **Check for crashed workers:**
```bash
# View recent crashes
docker ps -a | grep worker
kubectl get pods -n paperless-llm | grep Error

# Check logs of crashed pods
kubectl logs -p <pod-name> -n paperless-llm
```

### High Worker CPU/Memory Usage

**Symptoms:**
- Workers consuming excessive resources
- System slowdown
- OOM kills

**Solutions:**

1. **Reduce batch size:**
```yaml
worker:
  batchSize: 3  # Reduce from 5
```

2. **Increase poll interval:**
```yaml
worker:
  pollIntervalMs: 5000  # Slow down from 3000ms
```

3. **Set resource limits (Docker):**
```yaml
# docker-compose.yml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
```

4. **Set resource limits (Kubernetes):**
```yaml
resources:
  limits:
    cpu: 2000m
    memory: 2Gi
```

5. **Check for memory leaks:**
```bash
# Monitor memory over time
docker stats paperless-llm-worker-1

# Heap snapshot (Node.js)
node --inspect server/dist/api.js
```

## Retry & Fallout Issues

### Too Many Fallouts

**Symptoms:**
- Many steps in IN_FALLOUT status
- Jobs not completing
- High error rate

**Solutions:**

1. **Identify common failures:**
```sql
SELECT 
  step_type, 
  error, 
  COUNT(*) as count
FROM steps
WHERE status = 'IN_FALLOUT'
GROUP BY step_type, error
ORDER BY count DESC;
```

2. **Increase max retries:**
```yaml
# If transient failures
retry:
  maxRetries: 5  # Increase from 3
```

3. **Fix underlying issue:**
- LLM timeout → increase timeout or use faster model
- Network errors → check connectivity
- Paperless errors → verify API token

4. **Manually retry fallout steps:**
```bash
# Get fallout steps
curl http://localhost:3000/api/queue/llm/items?status=IN_FALLOUT

# Retry specific step
curl -X POST http://localhost:3000/api/steps/<step-id>/retry
```

5. **Bulk retry:**
```sql
-- Reset all fallout steps to WAITING
UPDATE steps 
SET status = 'WAITING',
    retry_count = 0,
    retry_after = NULL,
    error = NULL
WHERE status = 'IN_FALLOUT';
```

### Excessive Retries

**Symptoms:**
- Steps retrying too frequently
- External services overwhelmed
- Same errors repeating

**Solutions:**

1. **Increase retry delay:**
```yaml
retry:
  retryDelayInMs: 60000  # 1 minute (from 30s)
  retryExponent: 3        # Slower backoff
```

2. **Reduce max retries:**
```yaml
retry:
  maxRetries: 2  # Fail faster
```

3. **Fix root cause:**
- Don't rely on retries to mask persistent issues
- Check logs for patterns
- Fix configuration or external services

## Performance Issues

### Slow Job Processing

**Symptoms:**
- Jobs taking too long to complete
- High queue depth
- Poor throughput

**Solutions:**

1. **Scale workers horizontally:**
```bash
# Docker
docker compose up -d --scale paperless-llm-worker=5

# Kubernetes
kubectl scale deployment paperless-llm-worker --replicas=10 -n paperless-llm
```

2. **Increase batch size:**
```yaml
worker:
  batchSize: 10  # From 5
```

3. **Decrease poll interval:**
```yaml
worker:
  pollIntervalMs: 1000  # From 3000ms
```

4. **Optimize LLM:**
```yaml
llm:
  model: mistral  # Faster model
  timeoutMs: 20000  # Shorter timeout
```

5. **Profile slow operations:**
```bash
# Enable timing logs
export DEBUG=app:timing
npm run dev
```

### Database Performance

**Symptoms:**
- Slow API responses
- Query timeouts
- High DB CPU

**Solutions:**

1. **Add indexes:**
```sql
-- See Database Issues → Slow Queries section
```

2. **Vacuum and analyze:**
```sql
VACUUM ANALYZE jobs;
VACUUM ANALYZE steps;
```

3. **Tune PostgreSQL:**
```sql
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
SELECT pg_reload_conf();
```

4. **Use read replicas:**
- Separate read/write workloads
- Use replica for reporting queries

### Memory Issues

**Symptoms:**
- OOM (Out of Memory) errors
- Process crashes
- Swap usage

**Solutions:**

1. **Increase memory limits:**
```yaml
# Docker
deploy:
  resources:
    limits:
      memory: 4G
```

2. **Reduce worker batch size:**
```yaml
worker:
  batchSize: 3
```

3. **Check for memory leaks:**
```bash
# Heap snapshot
node --inspect --max-old-space-size=4096 server/dist/api.js
```

4. **Monitor memory usage:**
```bash
docker stats
kubectl top pods -n paperless-llm
```

## API Issues

### CORS Errors

**Symptoms:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solutions:**

1. **Configure CORS origins:**
```yaml
# config.yaml
api:
  corsOrigins:
    - "http://localhost:5173"
    - "http://localhost:3000"
```

2. **Allow all origins (development only):**
```yaml
api:
  corsOrigins:
    - "*"
```

3. **Check preflight requests:**
```bash
curl -X OPTIONS http://localhost:3000/api/jobs \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST"
```

### 401 Unauthorized

**Symptoms:**
- API returns 401 for authenticated requests
- Token rejected

**Solutions:**

1. **Check authentication middleware:**
- Verify token format
- Check token validation logic

2. **Regenerate token:**
- Create new Paperless API token
- Update configuration

3. **Check request headers:**
```bash
curl -v -H "Authorization: Token your_token" \
  http://localhost:3000/api/jobs
```

### 500 Internal Server Error

**Symptoms:**
- API returns 500
- Generic error response

**Solutions:**

1. **Check application logs:**
```bash
docker logs -f pllm-app-dev 2>&1 | grep ERROR
```

2. **Enable error details:**
```yaml
logging:
  level: debug
```

3. **Check stack trace:**
```bash
# Logs should include full stack trace in debug mode
```

## Docker Issues

### Container Won't Start

**Symptoms:**
```
Container exited with code 1
Error: Cannot find module
```

**Solutions:**

1. **Check container logs:**
```bash
docker logs pllm-app-dev
docker logs --tail=100 pllm-app-dev
```

2. **Rebuild image:**
```bash
docker compose -f docker-compose.dev.yml build --no-cache
docker compose -f docker-compose.dev.yml up -d
```

3. **Check dependencies:**
```bash
docker exec -it pllm-app-dev npm list
```

4. **Verify entrypoint:**
```dockerfile
# Check Dockerfile CMD/ENTRYPOINT
```

### Volume Mount Issues

**Symptoms:**
- Code changes not reflected
- Permission denied errors

**Solutions:**

1. **Check volume mounts:**
```bash
docker inspect pllm-app-dev | grep Mounts -A 10
```

2. **Fix permissions (Linux):**
```bash
sudo chown -R $USER:$USER .
```

3. **Recreate volumes:**
```bash
docker compose down -v
docker compose up -d
```

## Common Error Messages

### "Transaction has already been committed"

**Cause:** Attempting to use transaction context after commit/rollback

**Solution:**
- Create new transaction context for each operation
- Don't reuse transaction contexts
- Check for accidental double-commit

### "Cannot read property 'X' of undefined"

**Cause:** Null/undefined value access

**Solution:**
- Add null checks
- Use optional chaining: `obj?.prop`
- Validate data before use

### "Deadlock detected"

**Cause:** Multiple transactions waiting for each other's locks

**Solution:**
- Reduce transaction scope
- Access tables in consistent order
- Retry on deadlock (PostgreSQL retries automatically)

### "Timeout acquiring connection from pool"

**Cause:** Connection pool exhausted

**Solution:** See Database Issues → Database Connection Pool Exhausted

## Getting Help

If you're still stuck:

1. **Check logs** with debug level enabled
2. **Search GitHub Issues** for similar problems
3. **Create an issue** with:
   - Error messages
   - Logs (sanitize sensitive data)
   - Configuration (sanitize secrets)
   - Steps to reproduce
4. **Join community chat** (if available)

## Related Documentation

- [Dev Setup Guide](DEV_SETUP.md) - Development environment
- [Configuration Guide](CONFIGURATION.md) - Configuration options
- [Architecture Guide](ARCHITECTURE.md) - System design
- [Deployment Guide](DEPLOYMENT.md) - Production deployment
