# Deployment Guide

Production deployment guide for Paperless-LLM with Docker, Kubernetes, and scaling considerations.

## Table of Contents

- [Deployment Options](#deployment-options)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Scaling Strategies](#scaling-strategies)
- [Monitoring & Observability](#monitoring--observability)
- [Security Best Practices](#security-best-practices)
- [Backup & Recovery](#backup--recovery)
- [Performance Tuning](#performance-tuning)
- [High Availability](#high-availability)

## Deployment Options

### Option 1: Docker (Recommended for Small-Medium Scale)

**Best for:**
- Single server deployments
- Small to medium workloads (< 10k documents/day)
- Simple operational requirements

**Pros:**
- Simple setup
- Easy to manage
- Low operational overhead

**Cons:**
- Limited horizontal scaling
- Manual failover required
- Single point of failure

### Option 2: Kubernetes (Recommended for Large Scale)

**Best for:**
- Multi-server deployments
- Large workloads (> 10k documents/day)
- Auto-scaling requirements
- High availability needs

**Pros:**
- Horizontal auto-scaling
- Self-healing
- Rolling updates
- Load balancing

**Cons:**
- Complex setup
- Higher operational overhead
- Requires Kubernetes expertise

### Option 3: Managed Services

**Best for:**
- Cloud-native deployments
- Minimal operational burden

**Options:**
- AWS ECS/EKS + RDS
- Google Cloud Run + Cloud SQL
- Azure Container Apps + Azure Database

## Docker Deployment

### Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  paperless-llm-api:
    image: paperless-llm:${VERSION:-latest}
    restart: unless-stopped
    environment:
      # Database
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
      
      # Paperless
      PAPERLESS_URL: ${PAPERLESS_URL}
      PAPERLESS_TOKEN: ${PAPERLESS_TOKEN}
      
      # LLM
      LLM_URL: ${LLM_URL}
      LLM_MODEL: ${LLM_MODEL}
      LLM_TIMEOUT_MS: 45000
      
      # Worker (API mode - no workers)
      WORKER_ENABLED: "false"
      
      # API
      API_PORT: 3000
      API_CORS_ORIGINS: ${CORS_ORIGINS}
      
      # Logging
      LOG_LEVEL: info
      LOG_PRETTY: "false"
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - paperless-llm

  paperless-llm-worker:
    image: paperless-llm:${VERSION:-latest}
    restart: unless-stopped
    command: ["npm", "run", "start:worker"]
    environment:
      # Same as API but worker-specific settings
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
      
      PAPERLESS_URL: ${PAPERLESS_URL}
      PAPERLESS_TOKEN: ${PAPERLESS_TOKEN}
      
      LLM_URL: ${LLM_URL}
      LLM_MODEL: ${LLM_MODEL}
      LLM_TIMEOUT_MS: 45000
      
      # Worker settings
      WORKER_INSTANCE_ID: worker-1
      WORKER_BATCH_SIZE: 10
      WORKER_POLL_INTERVAL_MS: 3000
      
      # Retry
      RETRY_MAX_RETRIES: 5
      RETRY_DELAY_MS: 60000
      RETRY_EXPONENT: 2
      
      # Logging
      LOG_LEVEL: info
      LOG_PRETTY: "false"
    depends_on:
      postgres:
        condition: service_healthy
    deploy:
      replicas: 2  # Run 2 worker instances
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
    networks:
      - paperless-llm

  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - paperless-llm

  # Optional: Nginx reverse proxy
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - paperless-llm-api
    networks:
      - paperless-llm

volumes:
  postgres-data:
    driver: local

networks:
  paperless-llm:
    driver: bridge
```

### Environment File

Create `.env.prod`:

```bash
# Version
VERSION=1.0.0

# Database
DB_NAME=paperless_llm_prod
DB_USER=paperless_llm
DB_PASSWORD=<generate-strong-password>

# Paperless
PAPERLESS_URL=https://paperless.example.com
PAPERLESS_TOKEN=<your-paperless-token>

# LLM
LLM_URL=http://ollama:11434
LLM_MODEL=llama3

# API
CORS_ORIGINS=https://paperless.example.com,https://app.example.com
```

### Building Production Image

```bash
# Create production Dockerfile
cat > Dockerfile.prod << 'EOF'
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY server/package*.json ./
RUN npm ci --only=production

# Copy source
COPY server/ ./

# Build TypeScript
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY server/migrations ./migrations

# Non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "dist/api.js"]
EOF

# Build image
docker build -f Dockerfile.prod -t paperless-llm:1.0.0 .

# Tag as latest
docker tag paperless-llm:1.0.0 paperless-llm:latest
```

### Deploying

```bash
# Start services
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Scale workers
docker compose -f docker-compose.prod.yml up -d --scale paperless-llm-worker=4
```

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (1.25+)
- kubectl configured
- Helm 3 (optional but recommended)

### Namespace

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: paperless-llm
```

```bash
kubectl apply -f namespace.yaml
```

### Secrets

```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: paperless-llm-secrets
  namespace: paperless-llm
type: Opaque
stringData:
  db-password: <base64-encoded-password>
  paperless-token: <base64-encoded-token>
```

```bash
kubectl apply -f secrets.yaml
```

### ConfigMap

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: paperless-llm-config
  namespace: paperless-llm
data:
  DB_HOST: "postgres"
  DB_PORT: "5432"
  DB_NAME: "paperless_llm_prod"
  DB_USER: "paperless_llm"
  PAPERLESS_URL: "https://paperless.example.com"
  LLM_URL: "http://ollama:11434"
  LLM_MODEL: "llama3"
  LLM_TIMEOUT_MS: "45000"
  WORKER_BATCH_SIZE: "10"
  WORKER_POLL_INTERVAL_MS: "3000"
  RETRY_MAX_RETRIES: "5"
  LOG_LEVEL: "info"
  LOG_PRETTY: "false"
```

### API Deployment

```yaml
# api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: paperless-llm-api
  namespace: paperless-llm
spec:
  replicas: 3
  selector:
    matchLabels:
      app: paperless-llm-api
  template:
    metadata:
      labels:
        app: paperless-llm-api
    spec:
      containers:
      - name: api
        image: paperless-llm:1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: WORKER_ENABLED
          value: "false"
        envFrom:
        - configMapRef:
            name: paperless-llm-config
        - secretRef:
            name: paperless-llm-secrets
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Worker Deployment

```yaml
# worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: paperless-llm-worker
  namespace: paperless-llm
spec:
  replicas: 5
  selector:
    matchLabels:
      app: paperless-llm-worker
  template:
    metadata:
      labels:
        app: paperless-llm-worker
    spec:
      containers:
      - name: worker
        image: paperless-llm:1.0.0
        command: ["npm", "run", "start:worker"]
        envFrom:
        - configMapRef:
            name: paperless-llm-config
        - secretRef:
            name: paperless-llm-secrets
        env:
        - name: WORKER_INSTANCE_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        resources:
          requests:
            cpu: 1000m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 2Gi
```

### Service

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: paperless-llm-api
  namespace: paperless-llm
spec:
  selector:
    app: paperless-llm-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
```

### Ingress

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: paperless-llm-ingress
  namespace: paperless-llm
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - paperless-llm.example.com
    secretName: paperless-llm-tls
  rules:
  - host: paperless-llm.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: paperless-llm-api
            port:
              number: 80
```

### Horizontal Pod Autoscaler

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: paperless-llm-worker-hpa
  namespace: paperless-llm
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: paperless-llm-worker
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Deploy to Kubernetes

```bash
# Apply all manifests
kubectl apply -f namespace.yaml
kubectl apply -f secrets.yaml
kubectl apply -f configmap.yaml
kubectl apply -f api-deployment.yaml
kubectl apply -f worker-deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
kubectl apply -f hpa.yaml

# Check status
kubectl get pods -n paperless-llm
kubectl get svc -n paperless-llm
kubectl get ingress -n paperless-llm

# View logs
kubectl logs -f -n paperless-llm -l app=paperless-llm-api
kubectl logs -f -n paperless-llm -l app=paperless-llm-worker
```

## Scaling Strategies

### Vertical Scaling

Increase resources per instance:

**Docker:**
```yaml
deploy:
  resources:
    limits:
      cpus: '4'      # Was 2
      memory: 4G     # Was 2G
```

**Kubernetes:**
```yaml
resources:
  limits:
    cpu: 4000m     # Was 2000m
    memory: 4Gi    # Was 2Gi
```

### Horizontal Scaling

Add more worker instances:

**Docker:**
```bash
docker compose -f docker-compose.prod.yml up -d --scale paperless-llm-worker=10
```

**Kubernetes:**
```bash
kubectl scale deployment paperless-llm-worker --replicas=10 -n paperless-llm

# Or use HPA for auto-scaling (see HPA manifest above)
```

### Database Scaling

**Connection Pooling:**
- Increase max pool size (default: 20)
- Monitor connection usage
- Use PgBouncer for connection pooling

**Read Replicas:**
- Use replicas for reporting queries
- Keep writes on primary
- Configure in application

**Vertical Scaling:**
- Increase PostgreSQL resources
- Use faster storage (SSD/NVMe)
- Tune PostgreSQL settings

## Monitoring & Observability

### Health Checks

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "paperless": "reachable",
  "ollama": "reachable"
}
```

### Metrics (Prometheus)

Add Prometheus metrics endpoint:

```typescript
// server/src/api/routes/metrics.ts
import promClient from 'prom-client';

const register = new promClient.Registry();

// Metrics
const jobsTotal = new promClient.Counter({
  name: 'jobs_total',
  help: 'Total number of jobs created',
  labelNames: ['workflow_type']
});

const stepsProcessed = new promClient.Counter({
  name: 'steps_processed_total',
  help: 'Total steps processed',
  labelNames: ['step_type', 'status']
});

register.registerMetric(jobsTotal);
register.registerMetric(stepsProcessed);

// Expose metrics
app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.send(await register.metrics());
});
```

### Logging (ELK/Loki)

**Structured JSON logs:**
```yaml
logging:
  level: info
  pretty: false  # JSON format for log aggregation
```

**Log aggregation:**
- Fluentd/Fluent Bit → Elasticsearch
- Promtail → Loki
- Vector → Any destination

### Tracing (Jaeger/Zipkin)

Add OpenTelemetry instrumentation:

```bash
npm install @opentelemetry/api @opentelemetry/sdk-node
```

```typescript
// server/src/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT
  })
});

sdk.start();
```

### Alerting

**Prometheus AlertManager rules:**

```yaml
# alerts.yaml
groups:
- name: paperless-llm
  rules:
  - alert: HighFalloutRate
    expr: rate(steps_fallout_total[5m]) > 0.1
    for: 5m
    annotations:
      summary: "High step fallout rate"
      description: "More than 10% of steps entering fallout"
  
  - alert: WorkerDown
    expr: up{job="paperless-llm-worker"} == 0
    for: 2m
    annotations:
      summary: "Worker instance down"
      description: "Worker {{ $labels.instance }} is down"
```

## Security Best Practices

### Secrets Management

**Never commit secrets:**
```bash
# Add to .gitignore
.env
.env.*
config.yaml
secrets/
```

**Use secret managers:**
- Kubernetes Secrets
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault

### Network Security

**TLS/HTTPS:**
- Use TLS for all external connections
- Use Let's Encrypt for certificates
- Configure HTTPS redirects

**Firewall:**
- Allow only necessary ports
- Use security groups/network policies
- Restrict database access

### Authentication

**Paperless Token:**
- Rotate regularly
- Use read-only tokens where possible
- Store securely

**Database:**
- Use strong passwords
- Restrict network access
- Enable SSL connections

### Container Security

**Non-root user:**
```dockerfile
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs
```

**Image scanning:**
```bash
# Scan for vulnerabilities
docker scan paperless-llm:latest
trivy image paperless-llm:latest
```

**Minimal base image:**
- Use Alpine Linux
- Remove unnecessary packages
- Multi-stage builds

## Backup & Recovery

### Database Backups

**Automated backups:**
```bash
# Cron job for daily backups
0 2 * * * docker exec pllm-postgres-prod pg_dump -U paperless_llm paperless_llm_prod | gzip > /backups/db-$(date +\%Y\%m\%d).sql.gz
```

**Kubernetes CronJob:**
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: paperless-llm
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:15-alpine
            command:
            - /bin/sh
            - -c
            - pg_dump -h postgres -U paperless_llm paperless_llm_prod | gzip > /backups/db-$(date +%Y%m%d).sql.gz
            volumeMounts:
            - name: backups
              mountPath: /backups
          restartPolicy: OnFailure
          volumes:
          - name: backups
            persistentVolumeClaim:
              claimName: backup-pvc
```

### Restore Procedure

```bash
# Docker
gunzip < backup.sql.gz | docker exec -i pllm-postgres-prod psql -U paperless_llm -d paperless_llm_prod

# Kubernetes
kubectl exec -i postgres-pod -n paperless-llm -- psql -U paperless_llm -d paperless_llm_prod < backup.sql
```

## Performance Tuning

### Application Tuning

**Worker configuration:**
```yaml
worker:
  batchSize: 20          # Larger batches
  pollIntervalMs: 1000   # Faster polling
```

**Database connection pool:**
```typescript
// Increase pool size
const pool = new Pool({
  max: 50,  // Was 20
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});
```

### Database Tuning

**PostgreSQL settings:**
```sql
-- Increase shared memory
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';

-- Improve write performance
ALTER SYSTEM SET synchronous_commit = 'off';
ALTER SYSTEM SET wal_buffers = '16MB';

-- Connection settings
ALTER SYSTEM SET max_connections = 200;
```

### LLM Optimization

**Model selection:**
- Smaller models = faster response
- Larger models = better quality
- Balance based on requirements

**Parallel requests:**
- Configure concurrent LLM calls
- Use queue to prevent overwhelm

## High Availability

### Database HA

**PostgreSQL replication:**
- Primary-replica setup
- Automatic failover with Patroni/Stolon
- Synchronous replication for zero data loss

### Application HA

**Multiple instances:**
- API: 3+ replicas
- Workers: 5+ replicas
- Load balancer in front

**Health checks:**
- Liveness probes
- Readiness probes
- Automatic restart on failure

### Disaster Recovery

**Multi-region:**
- Deploy in multiple regions
- Database replication across regions
- DNS failover

**Backup strategy:**
- Daily full backups
- Continuous WAL archiving
- Test restore procedures regularly

## Related Documentation

- [Configuration Guide](CONFIGURATION.md) - Configuration options
- [Dev Setup Guide](DEV_SETUP.md) - Local development
- [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues
- [Architecture Guide](ARCHITECTURE.md) - System design

## Production Checklist

- [ ] Secrets stored securely (not in git)
- [ ] TLS/HTTPS configured
- [ ] Database backups automated
- [ ] Health checks configured
- [ ] Monitoring and alerting set up
- [ ] Log aggregation configured
- [ ] Resource limits set
- [ ] Auto-scaling configured (if needed)
- [ ] Disaster recovery plan documented
- [ ] Security scanning automated
- [ ] Performance testing completed
- [ ] Load testing completed
- [ ] Documentation updated
- [ ] Runbook created for operations team
