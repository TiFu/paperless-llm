# Audit Log Implementation Summary

## Overview
Successfully implemented a comprehensive audit log system for tracking all job and step execution events, including retries, approvals, cancellations, and stuck step resets.

## Requirements Satisfied
✅ Log all step executions with error messages and retry counts
✅ Track job creation events
✅ Record approvals and rejections
✅ Include timestamps for each action
✅ Track processing time (start & end) for each step
✅ Display audit log on JobDetailsPage below Document Actions

## Database Schema (Migration 005)

### Table: `audit_log`
- `id` (UUID, PK): Unique identifier
- `job_id` (UUID, FK → jobs): Associated job
- `step_id` (UUID, FK → steps, nullable): Associated step (null for job-level events)
- `event_type` (VARCHAR): Type of event (12 possible values)
- `event_timestamp` (TIMESTAMP): When the event occurred
- `processing_start_time` (TIMESTAMP, nullable): When processing started
- `processing_end_time` (TIMESTAMP, nullable): When processing ended
- `metadata` (JSONB, nullable): Event-specific details

### Event Types
1. `JOB_CREATED` - New job submitted
2. `STEP_CREATED` - New step added to workflow
3. `STEP_COMPLETED` - Step finished successfully
4. `STEP_FAILED` - Step execution failed
5. `STEP_MOVED_TO_RETRYING` - Step scheduled for retry
6. `STEP_MOVED_TO_FALLOUT` - Step exceeded max retries
7. `APPROVAL_REQUESTED` - Manual approval required (unused, for future)
8. `APPROVAL_APPROVED` - User approved proposed actions
9. `APPROVAL_REJECTED` - User rejected proposed actions
10. `STEP_MANUALLY_RETRIED` - User manually retried fallout/retrying step
11. `STEP_CANCELLED` - User cancelled step execution
12. `STUCK_STEP_RESET` - Automatic reset of stuck IN_PROGRESS step

### Indexes
- `idx_audit_log_job_id_timestamp` (job_id, event_timestamp DESC)
- `idx_audit_log_step_id_timestamp` (step_id, event_timestamp DESC)
- `idx_audit_log_event_type` (event_type)
- `idx_audit_log_timestamp` (event_timestamp DESC)

## Backend Implementation

### Domain Layer
**File**: `server/src/domain/audit/AuditLogEntry.ts`
- Domain entity representing audit events
- Type-safe metadata interfaces for each event type
- `getProcessingDurationMs()` helper method

**File**: `server/src/domain/audit/IAuditLogRepository.ts`
- Repository interface defining persistence contract

### Infrastructure Layer
**File**: `server/src/repositories/postgresql/PostgreSQLAuditLogRepository.ts`
- PostgreSQL implementation with JSONB serialization
- Query methods: `create()`, `getByJobId()`, `getByStepId()`, `deleteByJobId()`

**File**: `server/src/infrastructure/RepositoryRegistry.ts`
- Registered audit log repository in DI container

### Application Layer
**File**: `server/src/application/AuditLogApplicationService.ts`
- Centralized logging service with 11 event-specific methods
- Graceful error handling (logs errors without throwing)
- Transaction-aware (uses TransactionContext)

**Integration Points** (9 services updated):
1. `JobApplicationService` - logs JOB_CREATED after job creation
2. `WorkflowOrchestratorService` - logs STEP_CREATED after step creation
3. `StepExecutorApplicationService` - logs execution events (STEP_COMPLETED, STEP_FAILED, STEP_MOVED_TO_RETRYING, STEP_MOVED_TO_FALLOUT)
4. `ApprovalApplicationService` - logs APPROVAL_APPROVED/REJECTED
5. `StepRetryApplicationService` - logs STEP_MANUALLY_RETRIED
6. `StepCancelApplicationService` - logs STEP_CANCELLED
7. `StuckStepResetApplicationService` - logs STUCK_STEP_RESET

**File**: `server/src/application/ApplicationServiceFactory.ts`
- Updated to create and inject AuditLogApplicationService

### API Layer
**File**: `server/src/api/routes/jobs.ts`
- Added `GET /api/jobs/:id/audit-log` endpoint
- Returns array of audit log entries with computed duration

**File**: `server/docs/openapi.yaml`
- Added endpoint documentation with example responses
- Defined `AuditEventType` enum schema
- Defined `AuditLogEntry` and `AuditLogResponse` schemas

## Frontend Implementation

### Types
**File**: `frontend/src/types/api.ts`
- Added `AuditEventType` enum (12 values)
- Added `AuditLogEntry` interface
- Added `JobAuditLogResponse` interface

### API Client
**File**: `frontend/src/services/api.ts`
- Added `fetchJobAuditLog(jobId)` method
- Returns `Promise<JobAuditLogResponse>`

### Components
**File**: `frontend/src/components/AuditLogTimeline.tsx`
- Material-UI Timeline component for visualizing audit events
- Color-coded event dots (success=green, error=red, warning=orange, info=blue)
- Event icons for each type (CheckCircle, Error, Refresh, ThumbUp/Down, etc.)
- Processing duration chips (formatted as ms or seconds)
- Expandable metadata details (errors, retry info, stuck duration, etc.)
- Timestamps formatted with date-fns

### Pages
**File**: `frontend/src/pages/JobDetailsPage.tsx`
- Integrated audit log fetch into job details refresh cycle
- Added new Grid section below Document Actions
- Renders `<AuditLogTimeline entries={auditLog} />`
- Auto-refreshes every 5s until job reaches terminal state

## Key Design Decisions

1. **step_id as dedicated column** (not just in metadata):
   - Enables efficient querying by step
   - Supports partial index for step-specific queries
   - Null for job-level events

2. **Graceful error handling in logging**:
   - Audit log failures don't break application flow
   - Errors logged via Pino for debugging
   - Ensures system remains operational even if audit fails

3. **JSONB metadata for flexibility**:
   - Different event types have different data
   - Avoids schema bloat with event-specific columns
   - Easy to add new metadata fields without migration

4. **Processing time tracking**:
   - Captured at execution boundaries (start/end)
   - Computed duration for easy display
   - Null for events without execution (e.g., JOB_CREATED)

5. **Transaction-aware logging**:
   - Audit entries created within same transaction as business logic
   - Ensures consistency (no audit entry for failed transaction)
   - Uses TransactionContext pattern

## Migration Guide

1. **Run migration**:
   ```bash
   cd server
   npm run migrate
   ```

2. **Verify table creation**:
   ```sql
   SELECT * FROM audit_log;
   ```

3. **Test frontend**:
   - Submit a new job
   - Navigate to Job Details page
   - Verify Audit Log section appears below Document Actions
   - Check that events include timestamps and processing durations

4. **Expected events for typical job**:
   - JOB_CREATED (on submission)
   - STEP_CREATED (for each workflow step)
   - STEP_COMPLETED or STEP_FAILED (for each executed step)
   - APPROVAL_APPROVED/REJECTED (if approval step)
   - STEP_MOVED_TO_RETRYING (if step fails and retries enabled)
   - STEP_MOVED_TO_FALLOUT (if max retries exceeded)

## Future Enhancements

1. **Audit log filtering**:
   - Filter by event type
   - Filter by date range
   - Search by metadata fields

2. **Audit log export**:
   - CSV/JSON export for external analysis
   - Integration with monitoring tools

3. **Audit log retention policy**:
   - Automatic cleanup of old entries
   - Archive to cold storage

4. **Enhanced metadata**:
   - User identity (when user-initiated)
   - Client IP address
   - Request correlation IDs

5. **Performance metrics**:
   - Aggregate processing times by step type
   - Retry rate analysis
   - Failure pattern detection
