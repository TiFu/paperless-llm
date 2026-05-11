# Domain Concepts

This guide explains the core domain concepts in Paperless-LLM: Jobs, Steps, Workflows, Actions, and their relationships.

## Table of Contents

- [Overview](#overview)
- [Jobs](#jobs)
- [Steps](#steps)
- [Workflows](#workflows)
- [Actions](#actions)
- [Prompts](#prompts)
- [Document](#document)
- [Relationships](#relationships)
- [Examples](#examples)

## Overview

Paperless-LLM uses a workflow-based architecture to process documents. The core concepts work together to orchestrate document processing tasks:

```
Document → Job → Steps → Actions → Updated Document
           ↓
        Workflow
           ↓
        Prompts
```

## Jobs

A **Job** represents a complete processing task for a document. It tracks the overall state and progress of document processing.

### Key Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Unique identifier |
| `documentId` | string | Paperless document ID |
| `state` | JobState | Current state (PENDING, LLM_PROCESSING, etc.) |
| `workflowType` | string | Workflow definition (AUTOMATED, APPROVAL) |
| `createdAt` | Date | When job was created |
| `updatedAt` | Date | Last state change |

### Job States

Jobs progress through a series of states defined by their workflow:

#### Automated Workflow States

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

#### Approval Workflow States

```
PENDING
  │
  ├──→ LLM_PROCESSING
  │      │
  │      ├──→ AWAITING_APPROVAL
  │      │      │
  │      │      ├──→ UPDATING_DOCUMENT
  │      │      │      │
  │      │      │      └──→ COMPLETED ✓
  │      │      │
  │      │      └──→ REJECTED ✗
  │      │
  │      └──→ FAILED ✗
  │
  └──→ FAILED ✗
```

### State Transitions

Jobs transition between states based on step execution results:

```typescript
// Domain logic
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

### Terminal States

Once a job reaches a terminal state, it cannot transition further:

- `COMPLETED` - Successfully processed
- `FAILED` - Unrecoverable error
- `REJECTED` - User rejected proposed changes

### Job Lifecycle Example

```typescript
// 1. Create job
const job = Job.create({
  documentId: "12345",
  workflowType: "AUTOMATED"
});
// job.state === "PENDING"

// 2. Start LLM processing
job.advance(Transition.success());
// job.state === "LLM_PROCESSING"

// 3. LLM completes successfully
job.advance(Transition.success());
// job.state === "UPDATING_DOCUMENT"

// 4. Document update completes
job.advance(Transition.success());
// job.state === "COMPLETED"
```

## Steps

A **Step** represents an atomic unit of work within a job. Steps are executed sequentially, with each step potentially triggering the creation of the next step.

### Key Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Unique identifier |
| `jobId` | UUID | Parent job |
| `stepType` | StepType | Type of step (LLM_GENERATE_TITLE, etc.) |
| `status` | StepStatus | Current status (WAITING, IN_PROGRESS, etc.) |
| `retryCount` | number | Number of retry attempts |
| `retryAfter` | Date | When to retry (if RETRYING) |
| `result` | any | Step execution result |
| `error` | string | Error message (if failed) |

### Step Types

Each step type performs a specific operation:

| Step Type | Description | Needs Prompt | External Calls |
|-----------|-------------|--------------|----------------|
| `LLM_GENERATE_TITLE` | Generate document title via LLM | ✅ Yes | Ollama |
| `REQUIRE_APPROVAL` | Wait for user approval | ❌ No | None |
| `UPDATE_DOCUMENT` | Update Paperless document | ❌ No | Paperless |

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

### Step Execution

Each step type implements the `execute()` method:

```typescript
abstract class Step {
  abstract execute(services: DomainServices): Promise<Transition>;
}

class LLMGenerateTitleStep extends Step {
  async execute(services: DomainServices): Promise<Transition> {
    // 1. Get document content
    const doc = await services.dms.getDocument(this.documentId);
    
    // 2. Get and render prompt
    const prompt = await services.promptService.getPrompt('LLM_GENERATE_TITLE');
    const rendered = prompt.render({ documentContent: doc.content });
    
    // 3. Call LLM
    const title = await services.llm.generateCompletion(rendered);
    
    // 4. Create action for next step
    const action = new UpdateTitleAction(this.documentId, title);
    
    return Transition.success([action]);
  }
}
```

### Step Results

Steps return a `Transition` that determines the next job state:

```typescript
class Transition {
  result: 'SUCCESS' | 'FAILURE' | 'NONE';
  actions: Action[];
  
  static success(actions: Action[] = []): Transition {
    return new Transition('SUCCESS', actions);
  }
  
  static failure(): Transition {
    return new Transition('FAILURE', []);
  }
}
```

### Idempotency

Steps are designed to be idempotent:

- Can be executed multiple times with same result
- Early returns if already COMPLETED or FAILED
- Prevents double-execution from retries

## Workflows

A **Workflow** defines the state transitions and step sequence for a job. Workflows encode the business process logic.

### Workflow Interface

```typescript
interface WorkflowDefinition {
  // Determine next state based on current state and transition result
  getNextState(currentState: JobState, result: TransitionResult): JobState | null;
  
  // Determine next step based on current state
  getNextStepType(currentState: JobState): StepType | null;
  
  // Check if state is terminal
  isTerminalState(state: JobState): boolean;
}
```

### Automated Workflow

**Purpose:** Fully automated document processing without human intervention.

**States:**
- `PENDING` - Initial state
- `LLM_PROCESSING` - LLM generating content
- `UPDATING_DOCUMENT` - Applying updates
- `COMPLETED` - Success
- `FAILED` - Error

**Steps:**
1. `LLM_GENERATE_TITLE` - Generate title
2. `UPDATE_DOCUMENT` - Apply to Paperless

**Transition Rules:**
```typescript
class AutomatedWorkflow implements WorkflowDefinition {
  getNextState(currentState: JobState, result: TransitionResult): JobState | null {
    if (currentState === 'PENDING' && result === 'SUCCESS') {
      return 'LLM_PROCESSING';
    }
    if (currentState === 'LLM_PROCESSING' && result === 'SUCCESS') {
      return 'UPDATING_DOCUMENT';
    }
    if (currentState === 'UPDATING_DOCUMENT' && result === 'SUCCESS') {
      return 'COMPLETED';
    }
    if (result === 'FAILURE') {
      return 'FAILED';
    }
    return null;
  }
}
```

### Approval Workflow

**Purpose:** Includes manual approval gate for user verification before applying changes.

**States:**
- `PENDING`
- `LLM_PROCESSING`
- `AWAITING_APPROVAL` - User review required
- `UPDATING_DOCUMENT`
- `COMPLETED`
- `FAILED`
- `REJECTED` - User rejected

**Steps:**
1. `LLM_GENERATE_TITLE` - Generate title
2. `REQUIRE_APPROVAL` - User approves/rejects
3. `UPDATE_DOCUMENT` - Apply to Paperless (if approved)

**Approval Process:**
```
LLM generates title
     │
     ▼
User reviews proposal
     │
     ├──→ Approve → Update document → COMPLETED
     │
     └──→ Reject → REJECTED (no update)
```

### Custom Workflows (Future)

The workflow system is extensible:

```typescript
class MultiFieldWorkflow implements WorkflowDefinition {
  // Process title, tags, correspondent in sequence
  getNextStepType(currentState: JobState): StepType | null {
    if (currentState === 'PENDING') return 'LLM_GENERATE_TITLE';
    if (currentState === 'TITLE_COMPLETED') return 'LLM_GENERATE_TAGS';
    if (currentState === 'TAGS_COMPLETED') return 'LLM_DETECT_CORRESPONDENT';
    if (currentState === 'CORRESPONDENT_COMPLETED') return 'UPDATE_DOCUMENT';
    return null;
  }
}
```

## Actions

An **Action** represents a specific update to be applied to a document. Actions are created by steps and stored for the UPDATE_DOCUMENT step to execute.

### Action Types

| Action Type | Description | Data |
|-------------|-------------|------|
| `UPDATE_TITLE` | Set document title | `title: string` |
| `ADD_TAGS` | Add tags to document | `tagIds: number[]` |
| `REMOVE_TAGS` | Remove tags from document | `tagIds: number[]` |
| `SET_CORRESPONDENT` | Set document correspondent | `correspondentId: number` |
| `SET_DOCUMENT_TYPE` | Set document type | `documentTypeId: number` |

### Action Structure

```typescript
interface Action {
  type: ActionType;
  documentId: string;
  data: Record<string, any>;
  createdAt: Date;
}

// Example
const updateTitleAction: Action = {
  type: 'UPDATE_TITLE',
  documentId: '12345',
  data: {
    title: 'Invoice - Acme Corp - 2024-01-15'
  },
  createdAt: new Date()
};
```

### Action Execution

Actions are executed by the UPDATE_DOCUMENT step:

```typescript
class UpdateDocumentStep extends Step {
  async execute(services: DomainServices): Promise<Transition> {
    const actions = await this.getActionsForJob(this.jobId);
    
    for (const action of actions) {
      await this.applyAction(action, services.dms);
    }
    
    return Transition.success();
  }
  
  private async applyAction(action: Action, dms: IDocumentManagementSystem): Promise<void> {
    switch (action.type) {
      case 'UPDATE_TITLE':
        await dms.updateDocument(action.documentId, {
          title: action.data.title
        });
        break;
      
      case 'ADD_TAGS':
        await dms.addTags(action.documentId, action.data.tagIds);
        break;
      
      // ... other action types
    }
  }
}
```

### Action Queue

Actions are stored in the database until executed:

```sql
CREATE TABLE actions (
  id UUID PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id),
  step_id UUID NOT NULL REFERENCES steps(id),
  action_type TEXT NOT NULL,
  document_id TEXT NOT NULL,
  data JSONB NOT NULL,
  applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Prompts

A **Prompt** is a template with variable placeholders used to generate LLM requests. See [Prompts & Variables Guide](PROMPTS_AND_VARIABLES.md) for details.

### Key Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Unique identifier |
| `stepType` | StepType | Which step uses this prompt |
| `template` | string | Template with `{{variables}}` |
| `version` | number | Auto-incremented on updates |

### Usage in Steps

```typescript
class LLMGenerateTitleStep extends Step {
  async execute(services: DomainServices): Promise<Transition> {
    // 1. Get prompt for this step type
    const prompt = await services.promptService.getPrompt('LLM_GENERATE_TITLE');
    
    // 2. Gather variable values
    const doc = await services.dms.getDocument(this.documentId);
    const variables = {
      documentContent: doc.content.substring(0, 4000),
      documentTitle: doc.title || "(No title)"
    };
    
    // 3. Render prompt with variables
    const renderedPrompt = prompt.render(variables);
    
    // 4. Send to LLM
    const result = await services.llm.generateCompletion(renderedPrompt);
    
    return Transition.success([new UpdateTitleAction(this.documentId, result)]);
  }
}
```

## Document

A **Document** represents a Paperless-NG document. Documents live in Paperless, not in the Paperless-LLM database.

### Key Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | string | Paperless document ID |
| `title` | string | Document title |
| `content` | string | OCR extracted text |
| `tags` | number[] | Assigned tag IDs |
| `correspondent` | number | Correspondent ID |
| `documentType` | number | Document type ID |
| `created` | Date | Document creation date |

### Document Access

Documents are accessed via the `IDocumentManagementSystem` interface:

```typescript
interface IDocumentManagementSystem {
  getDocument(documentId: string): Promise<Document>;
  updateDocument(documentId: string, updates: Partial<Document>): Promise<void>;
  listDocuments(filters?: DocumentFilters): Promise<Document[]>;
}
```

### Document Updates

The system updates Paperless documents via the Paperless API:

```typescript
// Example: Update document title
await dms.updateDocument('12345', {
  title: 'Invoice - Acme Corp - 2024-01-15'
});

// Example: Add tags
await dms.addTags('12345', [10, 15, 20]);
```

## Relationships

### Entity Relationship Diagram

```
┌─────────────┐
│  Document   │ (in Paperless)
│  (External) │
└──────┬──────┘
       │
       │ 1:N
       │
┌──────▼──────┐
│     Job     │
│             │
│  - state    │
│  - workflow │
└──────┬──────┘
       │
       │ 1:N
       │
┌──────▼──────┐        ┌──────────┐
│    Step     │ N:1    │ Prompt   │
│             ├───────→│          │
│  - type     │        │ - type   │
│  - status   │        │ - template│
└──────┬──────┘        └──────────┘
       │
       │ 1:N
       │
┌──────▼──────┐
│   Action    │
│             │
│  - type     │
│  - data     │
└─────────────┘
```

### Cardinality

- One Document can have many Jobs (over time)
- One Job has exactly one Workflow
- One Job has many Steps (sequential)
- One Step has one StepType
- One StepType may use one Prompt
- One Step can create many Actions
- Many Actions belong to one Job

### Example Data Flow

```
1. User submits job for document 12345
   → Job created (state: PENDING)

2. Worker creates first step
   → LLMGenerateTitleStep (status: WAITING)

3. Worker executes step
   → Fetches prompt for LLM_GENERATE_TITLE
   → Fetches document 12345 from Paperless
   → Renders prompt with document content
   → Calls Ollama LLM
   → Creates UpdateTitleAction
   → Step marked COMPLETED

4. Workflow advances job
   → Job state: UPDATING_DOCUMENT
   → Creates UpdateDocumentStep

5. Worker executes update step
   → Fetches actions for this job
   → Applies UpdateTitleAction to Paperless
   → Step marked COMPLETED

6. Workflow advances job
   → Job state: COMPLETED
   → No more steps created
```

## Examples

### Example 1: Simple Title Generation

**Scenario:** Generate a title for a bank statement.

```typescript
// 1. Create job
const job = await jobService.createJob({
  documentId: "12345",
  workflowType: "AUTOMATED",
  jobTypes: ["title"]
});
// Job ID: job-001, State: PENDING

// 2. First step created automatically
// Step ID: step-001, Type: LLM_GENERATE_TITLE, Status: WAITING

// 3. Worker picks up step
await stepExecutor.executeStep("step-001");

// Behind the scenes:
// - Fetches document 12345 from Paperless
// - Fetches prompt for LLM_GENERATE_TITLE
// - Renders: "Generate a title... Document content: [bank statement text]"
// - Calls Ollama
// - LLM returns: "Bank Statement - Chase Checking - January 2024"
// - Creates action: UPDATE_TITLE with title data
// - Step marked COMPLETED

// 4. Job advances to UPDATING_DOCUMENT
// Step ID: step-002, Type: UPDATE_DOCUMENT, Status: WAITING

// 5. Worker picks up update step
await stepExecutor.executeStep("step-002");

// Behind the scenes:
// - Fetches actions for job-001
// - Applies UPDATE_TITLE to Paperless document 12345
// - Step marked COMPLETED

// 6. Job advances to COMPLETED
// Final state: Job COMPLETED, Document title updated in Paperless
```

### Example 2: Approval Workflow

**Scenario:** Generate title but require approval before applying.

```typescript
// 1. Create job with approval workflow
const job = await jobService.createJob({
  documentId: "67890",
  workflowType: "APPROVAL",
  jobTypes: ["title"]
});
// Job ID: job-002, State: PENDING

// 2. LLM step executes (same as Example 1)
// Job advances to: AWAITING_APPROVAL
// Step ID: step-003, Type: REQUIRE_APPROVAL, Status: WAITING

// 3. User reviews proposed title via UI
const approval = await approvalService.getApproval("job-002");
// approval.proposedTitle = "Invoice - Acme Corp - Jan 2024"

// 4. User approves
await approvalService.approve("step-003");
// Step marked COMPLETED with result: APPROVED

// 5. Job advances to UPDATING_DOCUMENT
// Step ID: step-004, Type: UPDATE_DOCUMENT, Status: WAITING

// 6. Update step applies changes
await stepExecutor.executeStep("step-004");

// 7. Job advances to COMPLETED
```

### Example 3: Retry After Failure

**Scenario:** LLM service is temporarily unavailable.

```typescript
// 1. Worker executes step
await stepExecutor.executeStep("step-005");

// Behind the scenes:
try {
  const title = await llmService.generateCompletion(prompt);
} catch (error) {
  // LLM service timeout
  throw new Error("Ollama timeout after 30s");
}

// 2. Step marked FAILED, retry logic activated
// Step status: RETRYING
// retryCount: 1
// retryAfter: now + 30s (first retry delay)

// 3. After 30 seconds, retry processor moves step back to WAITING
// Step status: WAITING

// 4. Worker picks up step again
await stepExecutor.executeStep("step-005");

// 5. This time LLM service is available
const title = await llmService.generateCompletion(prompt);
// Success!

// 6. Step marked COMPLETED
```

### Example 4: Manual Intervention After Fallout

**Scenario:** Step fails repeatedly and enters fallout.

```typescript
// After 3 failed retries:
// Step status: IN_FALLOUT
// retryCount: 3
// Job state: Still LLM_PROCESSING (blocked)

// 1. Admin investigates the issue
const step = await stepService.getStep("step-006");
console.log(step.error); // "Ollama model not found: llama3"

// 2. Admin fixes the issue (installs llama3 model)
// ollama pull llama3

// 3. Admin manually retries the step
await stepService.retryStep("step-006");
// Step status: WAITING
// retryCount: reset to 0

// 4. Worker picks up step and executes successfully
await stepExecutor.executeStep("step-006");
// Step status: COMPLETED

// 5. Job continues normally
```

## Best Practices

### Job Design

✅ **DO:**
- Keep jobs focused on single documents
- Use appropriate workflow types
- Handle terminal states gracefully

❌ **DON'T:**
- Create circular workflows
- Mix documents in single job
- Ignore job state transitions

### Step Design

✅ **DO:**
- Make steps idempotent
- Return clear transition results
- Handle errors gracefully
- Log execution details

❌ **DON'T:**
- Hold state between executions
- Assume step order
- Perform long-running operations in transactions

### Workflow Design

✅ **DO:**
- Define clear state transitions
- Use terminal states
- Document state meanings
- Test all transition paths

❌ **DON'T:**
- Create ambiguous transitions
- Allow infinite loops
- Skip terminal states

## Related Documentation

- [Architecture Guide](ARCHITECTURE.md) - System architecture and patterns
- [Prompts & Variables](PROMPTS_AND_VARIABLES.md) - Prompt system details
- [Configuration Guide](CONFIGURATION.md) - Configure jobs and workers
- [API Reference](../README.md#api-endpoints) - REST API for jobs and steps

## Code References

Domain layer files:

- `server/src/domain/job/Job.ts` - Job entity and state machine
- `server/src/domain/steps/Step.ts` - Step base class
- `server/src/domain/steps/LLMGenerateTitleStep.ts` - LLM step implementation
- `server/src/domain/workflows/BaseWorkflow.ts` - Workflow base class
- `server/src/domain/workflows/AutomatedWorkflow.ts` - Automated workflow
- `server/src/domain/workflows/ApprovalWorkflow.ts` - Approval workflow
- `server/src/domain/actions/Action.ts` - Action definitions
- `server/src/domain/prompt/Prompt.ts` - Prompt entity
- `server/src/domain/document/Document.ts` - Document value object
