# API Usage Examples

Quick reference for interacting with the Paperless-LLM API.

> 📚 **Full API Documentation**: For comprehensive API documentation with detailed schemas, all endpoints, and interactive exploration, visit the [ReDoc UI](http://localhost:3000/api/docs) or download the [OpenAPI specification](http://localhost:3000/api/openapi.yaml).

## Submit a Job

### Single document, single job type
```bash
# Using the helper script
./submit-job.sh 123 title

# Or direct curl
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {
        "documentId": "123",
        "jobTypes": ["title"]
      }
    ]
  }'
```

### Single document, multiple job types
```bash
# Using the helper script
./submit-job.sh 123 title,tag,summary

# Or direct curl
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {
        "documentId": "123",
        "jobTypes": ["title", "tag", "summary"]
      }
    ]
  }'
```

### Multiple documents
```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {
        "documentId": "123",
        "jobTypes": ["title"]
      },
      {
        "documentId": "456",
        "jobTypes": ["title", "tag"]
      }
    ]
  }'
```

## Check Available Job Types
```bash
curl http://localhost:3000/api/jobs/types
```

Response:
```json
{
  "jobTypes": ["title", "tag", "summary"]
}
```

## Check Queue Status
```bash
# LLM work queue stats
curl http://localhost:3000/api/queue/llm/stats

# Document update queue stats
curl http://localhost:3000/api/queue/document-update/stats
```

Response:
```json
{
  "total": 15,
  "pending": 10,
  "processing": 2,
  "completed": 2,
  "failed": 1
}
```

## List Queue Items
```bash
# List LLM work queue items
curl "http://localhost:3000/api/queue/llm/items?limit=10"

# Filter by status
curl "http://localhost:3000/api/queue/llm/items?status=pending&limit=10"

# With pagination
curl "http://localhost:3000/api/queue/llm/items?limit=10&cursor=abc123"
```

## Get Audit Log
```bash
# Get all audit entries (paginated)
curl "http://localhost:3000/api/audit?limit=20&offset=0"

# Get audit entries for specific document
curl "http://localhost:3000/api/audit/document/123"
```

## Manage Prompts

### List all prompts
```bash
curl http://localhost:3000/api/prompts
```

### Update a prompt
```bash
curl -X PUT http://localhost:3000/api/prompts/title \
  -H "Content-Type: application/json" \
  -d '{
    "template": "Generate a title for: {{documentContent}}"
  }'
```

## Health Check
```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-05-02T12:34:56.789Z",
  "checks": {
    "database": "ok",
    "paperless": "ok",
    "ollama": "ok"
  }
}
```

## Helper Script Options

The `submit-job.sh` script supports environment variables:

```bash
# Custom API URL
API_URL=http://localhost:3000 ./submit-job.sh 123 title

# Submit to remote instance
API_URL=https://paperless-llm.example.com ./submit-job.sh 123 title,tag
```

Usage:
```bash
./submit-job.sh <document-id> <job-types>

# Examples:
./submit-job.sh 123 title
./submit-job.sh 456 title,tag,summary
```
