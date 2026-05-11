# Architecture Guide

This guide provides a comprehensive overview of the Paperless-LLM architecture, design principles, and key patterns.

## Table of Contents

- [Overview](#overview)
- [Core Architectural Principles](#core-architectural-principles)
- [Domain-Driven Design Structure](#domain-driven-design-structure)
- [Transaction Boundaries](#transaction-boundaries)
- [Workflow Orchestration](#workflow-orchestration)
- [Queue System](#queue-system)
- [Retry & Error Handling](#retry--error-handling)
- [Deployment Architecture](#deployment-architecture)
- [Key Design Decisions](#key-design-decisions)

## Overview

Paperless-LLM is a scalable worker service that integrates Large Language Models with Paperless-NG to automatically generate document titles, tags, and summaries. The architecture follows Domain-Driven Design principles with clear separation of concerns and transactional consistency guarantees.

### High-Level Architecture

```
┌─────────────────┐
│   Frontend      │ (React + Vite)
│   (Port 5173)   │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│   API Server    │ (Express)
│   (Port 3000)   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│          Worker Executors                │
│  ┌──────────────┐  ┌──────────────────┐ │
│  │ Step Polling │  │ Retry Processor  │ │
│  │  (3s cycle)  │  │   (30s cycle)    │ │
│  └──────────────┘  └──────────────────┘ │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│           PostgreSQL Database            │
│  ┌─────┐ ┌──────┐ ┌────────┐ ┌────────┐│
│  │Jobs │ │Steps │ │Prompts │ │Actions ││
│  └─────┘ └──────┘ └────────┘ └────────┘│
└─────────┬───────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│       External Services                  │
│  ┌──────────────┐  ┌────────────────┐   │
│  │ Paperless-NG │  │ Ollama (LLM)   │   │
│  │ (Port 8000)  │  │ (Port 11434)   │   │
│  └──────────────┘  └────────────────┘   │
└─────────────────────────────────────────┘
```

## Core Architectural Principles

### 1. Domain-Driven Design (DDD)

The codebase is organized into three distinct layers with clear boundaries:

#### Domain Layer (`server/src/domain/`)

**Purpose:** Contains pure business logic with no dependencies on infrastructure concerns.

**Key Components:**
- **Entities:** `Job`, `Step`, `Action`, `Prompt` - core business objects with identity
- **Value Objects:** `DocumentId`, `StepType`, `JobState` - immutable values
- **Domain Services:** `WorkflowDefinition`, `PromptDomainService` - stateless domain operations
- **Interfaces:** `IDocumentManagementSystem`, `ILLMService` - contracts for external services

**Rules:**
- No database access
- No HTTP calls
- No framework dependencies
- Pure TypeScript/JavaScript logic

**Example - Job State Transitions:**
```typescript
// server/src/domain/job/Job.ts
class Job {
  advance(transition: Transition): void {
    const workflow = this.getWorkflow();
    const nextState = workflow.getNextState(this.state, transition.result);
    
    if (nextState) {
      this.state = nextState;
      this.updatedAt = new Date();
    }
  }
}
```

#### Application Layer (`server/src/application/`)

**Purpose:** Orchestrates domain operations and coordinates with infrastructure.

**Key Components:**
- **Application Services:** `JobApplicationService`, `StepExecutorApplicationService`, `WorkflowOrchestratorService`
- **Service Factory:** `ApplicationServiceFactory` - dependency injection container

**Responsibilities:**
- Transaction coordination
- Domain object retrieval and persistence
- External service integration
- Error handling and logging

**Example - Step Execution Orchestration:**
```typescript
// server/src/application/StepExecutorApplicationService.ts
async executeStep(stepId: string): Promise<void> {
  await using context = await this.txManager.createContext();
  
  try {
    context.start();
    
    // 1. Retrieve domain objects
    const step = await repos.steps.findById(stepId);
    const job = await repos.jobs.findById(step.jobId);
    
    // 2. Execute step logic (may call external services)
    const transition = await step.execute(services);
    
    // 3. Update domain state
    step.markCompleted();
    job.advance(transition);
    
    // 4. Persist changes
    await repos.steps.update(step);
    await repos.jobs.update(job);
    
    context.commit();
  } catch (error) {
    context.rollback();
    throw error;
  }
}
```

#### Infrastructure Layer (`server/src/infrastructure/`)

**Purpose:** Handles data persistence, transaction management, and external service communication.

**Key Components:**
- **Repositories:** `PostgreSQLJobRepository`, `PostgreSQLStepRepository` - database access
- **Transaction Manager:** `TransactionManager` - coordinates database transactions
- **Worker Executor:** `WorkerExecutor` - polling and batch processing
- **External Services:** `PaperlessService`, `OllamaService` - API clients

**Responsibilities:**
- SQL query execution
- Connection pooling
- Transaction lifecycle management
- HTTP client configuration
- Retries and timeouts

### 2. Transaction Boundaries

**Principle:** External API calls happen OUTSIDE transactions since they cannot be rolled back. Database writes happen INSIDE transactions to ensure consistency.

#### Why This Matters

Consider this scenario:
1. Start transaction
2. Call Ollama to generate title (takes 5 seconds)
3. Update database with title
4. Commit transaction

**Problem:** The database connection is held for 5+ seconds, blocking other workers and wasting resources.

#### Solution: External-Then-Transactional Pattern

```typescript
// ❌ BAD: External call inside transaction
async executeStep(stepId: string): Promise<void> {
  await using context = await this.txManager.createContext();
  context.start();
  
  // Holds DB connection during external call!
  const title = await this.llmService.generateTitle(content);
  await repos.steps.update(step);
  
  context.commit();
}

// ✅ GOOD: External call outside transaction
async executeStep(stepId: string): Promise<void> {
  // 1. Fetch data in minimal transaction
  await using context1 = await this.txManager.createContext();
  context1.start();
  const step = await repos.steps.findById(stepId);
  const doc = await repos.documents.findById(step.documentId);
  context1.commit();
  
  // 2. Call external service (no DB connection held)
  const title = await this.llmService.generateTitle(doc.content);
  
  // 3. Update in new transaction
  await using context2 = await this.txManager.createContext();
  context2.start();
  step.result = title;
  step.markCompleted();
  await repos.steps.update(step);
  context2.commit();
}
```

#### Transaction Context Pattern

All repository access requires an active transaction context:

```typescript
// Transaction lifecycle
await using context = await txManager.createContext();

// Start transaction
context.start();

// Get repositories bound to this transaction
const repos = context.getRepositoryRegistry();

// Perform operations
await repos.jobs.findById(jobId);
await repos.steps.create(newStep);

// Commit or rollback
context.commit();  // or context.rollback()
```

**Benefits:**
- Explicit transaction boundaries
- Prevents accidental auto-commit
- Clear visibility of transactional scope
- Type-safe repository access

### 3. External API Handling

#### Service Abstraction

External services are abstracted behind domain interfaces:

```typescript
// server/src/domain/services/IDocumentManagementSystem.ts
interface IDocumentManagementSystem {
  getDocument(documentId: DocumentId): Promise<Document>;
  updateDocument(documentId: DocumentId, updates: DocumentUpdate): Promise<void>;
  listDocuments(filters?: DocumentFilters): Promise<Document[]>;
}

// server/src/domain/llm/ILLMService.ts
interface ILLMService {
  generateCompletion(prompt: string, options?: LLMOptions): Promise<string>;
}
```

**Benefits:**
- Testability (easy to mock)
- Decoupling from specific implementations
- Clear contracts
- Swappable implementations (Ollama → OpenAI)

#### Timeout Configuration

All external calls have configurable timeouts:

```yaml
# config.yaml
llm:
  timeoutMs: 30000  # 30 seconds

paperless:
  timeoutMs: 10000  # 10 seconds
```

**Timeout Handling:**
- Timeouts cause step failure
- Step enters retry queue
- Exponential backoff prevents service overwhelm
- After max retries, step moves to fallout

#### Idempotency

External operations are designed to be idempotent where possible:

- **Document updates:** Overwrite operations (not incremental)
- **LLM calls:** Same prompt → same result (with temperature=0)
- **Step execution:** Early returns if already completed

## Domain-Driven Design Structure

### Layer Diagram

```
┌─────────────────────────────────────────────────────┐
│                   API Layer                          │
│         (Express routes, middleware)                 │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│              Application Layer                       │
│    (Application Services, Orchestration)             │
│                                                       │
│  • JobApplicationService                             │
│  • StepExecutorApplicationService                    │
│  • WorkflowOrchestratorService                       │
│  • PromptApplicationService                          │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│                Domain Layer                          │
│         (Business Logic, Entities)                   │
│                                                       │
│  • Job (state machine)                               │
│  • Step (executable units)                           │
│  • Workflow (transition rules)                       │
│  • Action (document updates)                         │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│             Infrastructure Layer                     │
│      (Database, External Services)                   │
│                                                       │
│  • PostgreSQL Repositories                           │
│  • TransactionManager                                │
│  • PaperlessService                                  │
│  • OllamaService                                     │
└─────────────────────────────────────────────────────┘
```

### Dependency Rules

**Allowed Dependencies:**
- API → Application
- Application → Domain
- Application → Infrastructure
- Infrastructure → Domain

**Forbidden Dependencies:**
- Domain → Application
- Domain → Infrastructure
- Infrastructure → Application (except interfaces)

## Workflow Orchestration

### State Machine Design

Jobs follow a defined state path with deterministic transitions:

```
PENDING
  │
  ├──→ LLM_PROCESSING
  │      │
  │      ├──→ UPDATING_DOCUMENT
  │      │      │
  │      │      └──→ COMPLETED ✓
  │      │
  │      └──→ FAILED ✗
  │
  └──→ FAILED ✗
```

### Workflow Types

#### AutomatedWorkflow

Fully automated processing without human intervention.

**States:**
1. `PENDING` - Job created, waiting for first step
2. `LLM_PROCESSING` - LLM generating content
3. `UPDATING_DOCUMENT` - Applying updates to Paperless
4. `COMPLETED` - All steps finished successfully
5. `FAILED` - Unrecoverable error occurred

**Steps:**
- `LLM_GENERATE_TITLE` → Generate title via LLM
- `UPDATE_DOCUMENT` → Apply title to Paperless document

#### ApprovalWorkflow

Includes manual approval gates for user verification.

**States:**
1. `PENDING`
2. `LLM_PROCESSING`
3. `AWAITING_APPROVAL` - Waiting for user approval
4. `UPDATING_DOCUMENT`
5. `COMPLETED`
6. `FAILED`
7. `REJECTED` - User rejected the proposed changes

**Steps:**
- `LLM_GENERATE_TITLE`
- `REQUIRE_APPROVAL` - User reviews and approves/rejects
- `UPDATE_DOCUMENT`

### Progression Flow

The `WorkflowOrchestratorService` handles job progression:

```typescript
// server/src/application/WorkflowOrchestratorService.ts
async advanceToNextStep(jobId: string, transition: Transition): Promise<void> {
  await using context = await this.txManager.createContext();
  context.start();
  
  const repos = context.getRepositoryRegistry();
  const job = await repos.jobs.findById(jobId);
  
  // Update job state based on transition
  job.advance(transition);
  
  // Create next step if not terminal
  if (!this.isTerminalState(job.state)) {
    const nextStep = this.createNextStep(job);
    await repos.steps.create(nextStep);
  }
  
  await repos.jobs.update(job);
  context.commit();
}
```

**Key Points:**
1. Job state updated based on transition result
2. Next step created if job not finished
3. Both job and step persisted atomically
4. Workflow definition determines next state

## Queue System

### Database-Driven Queue

Unlike traditional message queues (RabbitMQ, SQS), Paperless-LLM uses the PostgreSQL database as the queue:

**Advantages:**
- Single source of truth
- Transactional consistency
- No additional infrastructure
- Simpler operational model
- Native query capabilities

**Trade-offs:**
- Higher database load
- Higher latency than in-memory queues
- Limited throughput compared to dedicated queues

### Queue Tables

#### Steps Table

```sql
CREATE TABLE steps (
  id UUID PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id),
  step_type TEXT NOT NULL,
  status TEXT NOT NULL,  -- WAITING, IN_PROGRESS, COMPLETED, FAILED, RETRYING, IN_FALLOUT
  retry_count INTEGER DEFAULT 0,
  retry_after TIMESTAMP,
  result JSONB,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_steps_status ON steps(status);
CREATE INDEX idx_steps_retry_after ON steps(retry_after) WHERE status = 'RETRYING';
```

### Polling Model

The `WorkerExecutor` polls the database on configurable intervals:

```typescript
// server/src/infrastructure/WorkerExecutor.ts
class WorkerExecutor {
  async start(): void {
    this.running = true;
    
    while (this.running) {
      const startTime = Date.now();
      
      try {
        await this.processPendingSteps();
      } catch (error) {
        logger.error('Error processing steps', { error });
      }
      
      // Adaptive timing: maintain consistent rhythm
      const duration = Date.now() - startTime;
      const delay = Math.max(0, this.pollInterval - duration);
      
      await sleep(delay);
    }
  }
  
  async processPendingSteps(): Promise<void> {
    // 1. Claim batch of WAITING steps
    const steps = await this.claimSteps(this.batchSize);
    
    // 2. Execute each step
    for (const step of steps) {
      await this.stepExecutor.executeStep(step.id);
    }
  }
}
```

### Batch Processing

Steps are processed in batches for efficiency:

1. **Claim Transaction:** Atomically fetch and lock N steps
2. **Execution:** Process each step (may involve external calls)
3. **Update Transaction:** Bulk update step statuses

**Configuration:**
```yaml
worker:
  batchSize: 5          # Process 5 steps per cycle
  pollIntervalMs: 3000  # Poll every 3 seconds
```

### Multiple Workers

Multiple worker instances can run simultaneously:

- Each worker claims a non-overlapping batch
- Database row-level locking prevents double-processing
- Workers coordinate through database state
- No explicit worker coordination required

## Retry & Error Handling

### Automatic Retry Mechanism

When a step fails, the retry system automatically schedules re-execution:

```yaml
# config.yaml
retry:
  maxRetries: 3
  retryDelayInMs: 30000  # 30 seconds base delay
  retryExponent: 2       # Exponential backoff: 2^retryCount
```

### Exponential Backoff

Retry delays increase exponentially to prevent overwhelming external services:

```
Retry 1: 30s  (2^0 * 30000ms)
Retry 2: 60s  (2^1 * 30000ms)
Retry 3: 120s (2^2 * 30000ms)
```

### Step Status Lifecycle

```
WAITING
  │
  ├──→ IN_PROGRESS (claimed by worker)
  │      │
  │      ├──→ COMPLETED ✓
  │      │
  │      └──→ FAILED
  │             │
  │             ├──→ RETRYING (retryCount < maxRetries)
  │             │      │
  │             │      └──→ WAITING (after retryAfter expires)
  │             │
  │             └──→ IN_FALLOUT (retryCount >= maxRetries)
```

### Retry Queue Processor

A separate poller handles steps in `RETRYING` status:

```typescript
async processRetryQueue(): Promise<void> {
  const now = new Date();
  
  // Find steps ready to retry
  const steps = await this.findStepsToRetry(now);
  
  for (const step of steps) {
    await this.moveToWaiting(step.id);
  }
}
```

**Schedule:**
- Runs every 30 seconds (configurable)
- Moves ready steps from `RETRYING` → `WAITING`
- Main poller picks them up in next cycle

### Stuck Step Detection

The `StuckStepResetApplicationService` periodically finds and resets hung steps:

```typescript
async resetStuckSteps(): Promise<number> {
  const timeout = Date.now() - this.stuckThreshold;
  
  // Find steps stuck IN_PROGRESS beyond threshold
  const stuckSteps = await this.findStuckSteps(timeout);
  
  for (const step of stuckSteps) {
    step.markFailed('Step exceeded timeout threshold');
    await this.repos.steps.update(step);
  }
  
  return stuckSteps.length;
}
```

**Configuration:**
```yaml
worker:
  stuckStepTimeoutMs: 300000        # 5 minutes
  stuckStepCheckIntervalMs: 30000   # Check every 30 seconds
```

### Manual Intervention

When steps reach `IN_FALLOUT`, manual intervention is required:

**Retry API:**
```bash
POST /api/steps/:stepId/retry
```

Resets step to `WAITING` for re-execution.

**Cancel API:**
```bash
POST /api/steps/:stepId/cancel
```

Marks step as failed and advances job to terminal state.

## Deployment Architecture

### All-in-One Mode (Default)

Single process runs API server and workers together:

```bash
npm start
```

**Process Structure:**
```
┌────────────────────────────────────┐
│      Node.js Process (PID 1234)    │
│                                     │
│  ┌──────────────────────────────┐  │
│  │     Express API Server        │  │
│  │        (Port 3000)            │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │   Worker Executor #1          │  │
│  │   (Step Processor)            │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │   Worker Executor #2          │  │
│  │   (Retry Processor)           │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

**Best For:**
- Development
- Small deployments
- Low to medium throughput

### Separate Workers Mode (Advanced)

API and workers run in separate processes for horizontal scaling:

```bash
# Terminal 1: API only
npm run start:api

# Terminal 2: Worker instance 1
npm run start:worker

# Terminal 3: Worker instance 2 (for scaling)
npm run start:worker
```

**Process Structure:**
```
┌────────────────────┐
│   API Process      │
│   (PID 1234)       │
│                    │
│  ┌──────────────┐  │
│  │ Express API  │  │
│  │ (Port 3000)  │  │
│  └──────────────┘  │
└────────────────────┘

┌────────────────────┐  ┌────────────────────┐
│  Worker Process 1  │  │  Worker Process 2  │
│  (PID 2345)        │  │  (PID 3456)        │
│                    │  │                    │
│  ┌──────────────┐  │  │  ┌──────────────┐  │
│  │ Step Proc.   │  │  │  │ Step Proc.   │  │
│  └──────────────┘  │  │  └──────────────┘  │
│  ┌──────────────┐  │  │  ┌──────────────┐  │
│  │ Retry Proc.  │  │  │  │ Retry Proc.  │  │
│  └──────────────┘  │  │  └──────────────┘  │
└────────────────────┘  └────────────────────┘
```

**Best For:**
- Production deployments
- High throughput requirements
- Resource isolation needs
- Horizontal scaling

### Scaling Considerations

**Vertical Scaling (More Resources):**
- Increase worker batch size
- Decrease poll interval
- Add more CPU/RAM to single instance

**Horizontal Scaling (More Workers):**
- Run multiple worker processes
- Database coordinates via row locks
- No worker-to-worker communication needed
- Load balancer for API server

**Database Scaling:**
- Connection pooling (default: 20 connections)
- Read replicas for reporting queries
- Partitioning for large datasets

## Key Design Decisions

### 1. Polling vs. Message Queue

**Decision:** Use database polling instead of external message queue (Bull, RabbitMQ, SQS).

**Rationale:**
- Simpler operational footprint
- Single source of truth (database)
- Transactional consistency guarantees
- No additional infrastructure to manage
- Sufficient for expected throughput

**Trade-offs:**
- Higher database load
- Higher latency (seconds vs. milliseconds)
- Limited throughput compared to dedicated queues

### 2. Step-Based Workflow Decomposition

**Decision:** Break jobs into discrete, idempotent step units.

**Rationale:**
- Pause/resume at clear boundaries
- Independent retry for each step
- Clear audit trail
- Testable in isolation
- Flexible workflow composition

**Alternative Considered:** Monolithic job execution (single transaction)

### 3. External-Then-Transactional Pattern

**Decision:** Execute external calls outside transactions.

**Rationale:**
- Prevent long-held database connections
- Allow concurrent worker processing
- Isolate external service failures
- Better resource utilization

**Consequence:** Requires idempotent external operations

### 4. Explicit Transaction Isolation

**Decision:** Require explicit transaction context for repository access.

**Rationale:**
- Prevents accidental auto-commit
- Clear visibility of transactional scope
- Type-safe repository binding
- Easier to reason about concurrency

**Alternative Considered:** Implicit transactions (auto-begin/commit)

### 5. Global Retry Configuration

**Decision:** Uniform retry policy across all step types.

**Rationale:**
- Simpler configuration
- Consistent behavior
- Prevents service overwhelm
- Easy to tune

**Future Enhancement:** Per-step-type retry configuration

## Related Documentation

- [Domain Concepts](DOMAIN_CONCEPTS.md) - Deep dive into Jobs, Steps, Workflows, Actions
- [Configuration Guide](CONFIGURATION.md) - Configure workers, retries, timeouts
- [Deployment Guide](DEPLOYMENT.md) - Production deployment patterns
- [Troubleshooting](TROUBLESHOOTING.md) - Debug architecture-related issues
- [Contributing](CONTRIBUTING.md) - Code organization and standards

## Code References

Key architectural components:

- `server/src/domain/` - Domain layer (entities, workflows, services)
- `server/src/application/` - Application layer (orchestration, use cases)
- `server/src/infrastructure/` - Infrastructure layer (database, workers, external services)
- `server/src/api/` - API layer (routes, middleware)
- `server/src/infrastructure/TransactionManager.ts` - Transaction coordination
- `server/src/infrastructure/WorkerExecutor.ts` - Polling and batch processing
- `server/src/application/WorkflowOrchestratorService.ts` - State machine orchestration
