# Audit Log Testing Guide

## Prerequisites
1. Database migrated to version 005
2. Backend server running
3. Frontend development server running
4. At least one document in Paperless-NGX with tag `llm-process`

## Test Scenarios

### Test 1: Job Creation Event
**Objective**: Verify JOB_CREATED event is logged

**Steps**:
1. Navigate to Documents page
2. Select a document
3. Submit a job with job type "GENERATE_TITLE"
4. Navigate to Job Details page
5. Scroll to Audit Log section

**Expected Results**:
- ✅ One `JOB_CREATED` event appears
- ✅ Event timestamp matches submission time
- ✅ Metadata includes `documentId` and `jobType`
- ✅ No `stepId` (should be null for job-level events)
- ✅ No processing times (should be null)

### Test 2: Step Creation Events
**Objective**: Verify STEP_CREATED events are logged for each workflow step

**Steps**:
1. Continue from Test 1 (job submitted)
2. Wait for workflow orchestrator to create steps
3. Refresh Job Details page

**Expected Results**:
- ✅ Multiple `STEP_CREATED` events appear (one per workflow step)
- ✅ Each event has a `stepId`
- ✅ Metadata includes `stepType` (e.g., "LLM_GENERATE_TITLE", "REQUIRE_APPROVAL")
- ✅ Events ordered chronologically

### Test 3: Step Execution Success
**Objective**: Verify STEP_COMPLETED event is logged after successful execution

**Steps**:
1. Continue from Test 2
2. Wait for automated step to complete (e.g., LLM_GENERATE_TITLE)
3. Refresh Job Details page

**Expected Results**:
- ✅ `STEP_COMPLETED` event appears
- ✅ `processingStartTime` is set
- ✅ `processingEndTime` is set
- ✅ `processingDurationMs` is displayed (should be > 0)
- ✅ Metadata includes `stepType` and `retryCount: 0`
- ✅ Event icon is green checkmark
- ✅ Event color is success (green)

### Test 4: Approval Decision (Approved)
**Objective**: Verify APPROVAL_APPROVED event is logged

**Steps**:
1. Navigate to Approvals page
2. Find pending approval for the job
3. Review proposed actions
4. Click "Approve"
5. Navigate back to Job Details page
6. Scroll to Audit Log

**Expected Results**:
- ✅ `APPROVAL_APPROVED` event appears
- ✅ Event has `stepId` (the approval step)
- ✅ Metadata includes `decision: "APPROVED"`
- ✅ Metadata includes `proposedActions` array
- ✅ Event icon is thumbs up
- ✅ Event color is success (green)

### Test 5: Approval Decision (Rejected)
**Objective**: Verify APPROVAL_REJECTED event is logged

**Steps**:
1. Submit a new job that requires approval
2. Wait for approval step
3. Navigate to Approvals page
4. Click "Reject" on the approval
5. Navigate to Job Details page
6. Check Audit Log

**Expected Results**:
- ✅ `APPROVAL_REJECTED` event appears
- ✅ Metadata includes `decision: "REJECTED"`
- ✅ Event icon is thumbs down
- ✅ Event color is error (red)

### Test 6: Step Failure and Retry
**Objective**: Verify STEP_FAILED and STEP_MOVED_TO_RETRYING events are logged

**Setup**: Temporarily break LLM service or Paperless connection to cause failure

**Steps**:
1. Submit a new job
2. Wait for step execution to fail
3. Check Job Details audit log

**Expected Results**:
- ✅ `STEP_FAILED` event appears
- ✅ `processingStartTime` and `processingEndTime` are set
- ✅ Metadata includes `errorMessage` with error details
- ✅ Metadata includes `retryCount`
- ✅ `STEP_MOVED_TO_RETRYING` event appears immediately after
- ✅ Retry event metadata includes `nextRetryTime`
- ✅ Retry event color is warning (orange)
- ✅ Expandable metadata shows error details

### Test 7: Step Moves to Fallout
**Objective**: Verify STEP_MOVED_TO_FALLOUT event is logged after max retries

**Setup**: Configure low max_retries (e.g., 2) and keep service broken

**Steps**:
1. Submit a new job
2. Wait for step to fail and retry multiple times
3. Wait for max retries to be exceeded
4. Check Job Details audit log

**Expected Results**:
- ✅ Multiple `STEP_FAILED` events (one per retry)
- ✅ Multiple `STEP_MOVED_TO_RETRYING` events
- ✅ Final `STEP_MOVED_TO_FALLOUT` event
- ✅ Fallout event metadata shows final `retryCount`
- ✅ Fallout event color is error (red)
- ✅ Retry counts increment with each attempt

### Test 8: Manual Retry
**Objective**: Verify STEP_MANUALLY_RETRIED event is logged

**Steps**:
1. Continue from Test 7 (step in fallout)
2. Navigate to Job Steps timeline
3. Click "Retry" button on fallout step
4. Check Audit Log

**Expected Results**:
- ✅ `STEP_MANUALLY_RETRIED` event appears
- ✅ Metadata includes `previousRetryCount`
- ✅ Event color is warning (orange)
- ✅ Event icon is refresh icon
- ✅ After retry, new execution events appear (STEP_COMPLETED or STEP_FAILED)

### Test 9: Step Cancellation
**Objective**: Verify STEP_CANCELLED event is logged

**Steps**:
1. Create a job with a step in fallout or retrying state
2. Navigate to Job Steps timeline
3. Click "Cancel" button on the step
4. Check Audit Log

**Expected Results**:
- ✅ `STEP_CANCELLED` event appears
- ✅ Metadata includes `previousStatus` (RETRYING or IN_FALLOUT)
- ✅ Event color is grey
- ✅ Event icon is cancel icon

### Test 10: Stuck Step Reset
**Objective**: Verify STUCK_STEP_RESET event is logged

**Setup**: Simulate stuck step by forcibly terminating worker mid-execution

**Steps**:
1. Submit a job
2. While step is IN_PROGRESS, kill the worker process
3. Wait for stuck step cleanup cron job to run (check cron schedule)
4. Check Job Details audit log

**Expected Results**:
- ✅ `STUCK_STEP_RESET` event appears
- ✅ Metadata includes `stuckDurationMs` (should be > configured threshold)
- ✅ Metadata includes `previousStartedAt` timestamp
- ✅ Event color is warning (orange)
- ✅ Expandable metadata shows stuck duration in readable format

### Test 11: Timeline Display Features
**Objective**: Verify UI features work correctly

**Steps**:
1. Navigate to Job Details page with multiple audit events
2. Verify timeline rendering
3. Click expand button on event with metadata
4. Verify processing duration chips

**Expected Results**:
- ✅ Timeline displays vertically with events in chronological order
- ✅ Event dots color-coded correctly (green/red/orange/blue/grey)
- ✅ Time displayed as HH:MM:SS on left
- ✅ Date displayed as "MMM D" on left
- ✅ Event labels are human-readable (not raw enum values)
- ✅ Processing duration chips display for execution events
- ✅ Duration formatted as "Xms" for < 1s, "X.XXs" for >= 1s
- ✅ Clicking expand icon reveals metadata details
- ✅ Expand icon rotates 180° when expanded
- ✅ Metadata formatted with labels (not raw JSON keys)
- ✅ Error messages displayed in red color
- ✅ Expandable section animates smoothly

### Test 12: Auto-Refresh
**Objective**: Verify audit log updates automatically during job execution

**Steps**:
1. Submit a new job
2. Navigate to Job Details page immediately
3. Watch audit log section (do not manually refresh)
4. Wait for job to progress through steps

**Expected Results**:
- ✅ New audit events appear automatically every 5 seconds
- ✅ No page flicker or scroll position reset
- ✅ Auto-refresh stops when job reaches terminal state (COMPLETED/FAILED/REJECTED)
- ✅ Refresh icon in header stops spinning when auto-refresh stops

### Test 13: API Endpoint Testing
**Objective**: Verify API returns correct data structure

**Steps**:
1. Get a job ID from Job Details page
2. Open browser console or use curl:
   ```bash
   curl http://localhost:3000/api/jobs/<JOB_ID>/audit-log
   ```

**Expected Results**:
- ✅ Returns 200 OK status
- ✅ Response body has `auditLog` array
- ✅ Each entry has required fields: `id`, `jobId`, `eventType`, `eventTimestamp`
- ✅ Optional fields are present when applicable: `stepId`, `processingStartTime`, `processingEndTime`, `processingDurationMs`, `metadata`
- ✅ `processingDurationMs` is computed correctly (endTime - startTime in milliseconds)
- ✅ Metadata is valid JSON object (not string)
- ✅ Events ordered by `eventTimestamp` DESC (newest first)

### Test 14: Database Query Performance
**Objective**: Verify indexes are used and queries are fast

**Steps**:
1. Create 10+ jobs with multiple steps each
2. Use psql to check query plan:
   ```sql
   EXPLAIN ANALYZE 
   SELECT * FROM audit_log 
   WHERE job_id = '<JOB_ID>' 
   ORDER BY event_timestamp DESC;
   ```

**Expected Results**:
- ✅ Query plan shows "Index Scan" (not "Seq Scan")
- ✅ Uses `idx_audit_log_job_id_timestamp` index
- ✅ Execution time < 5ms for typical job
- ✅ No table scan for jobs table join

### Test 15: Edge Cases
**Objective**: Verify system handles edge cases gracefully

**Test Cases**:
1. Job with no steps (immediate failure):
   - ✅ Shows only JOB_CREATED event
   
2. Job with 0ms processing time:
   - ✅ Processing duration displays as "0ms"
   
3. Job with very long processing time (> 1 minute):
   - ✅ Duration displays correctly (e.g., "65.23s")
   
4. Event with empty metadata:
   - ✅ Expand button not shown (or no-op on click)
   
5. Event with null stepId:
   - ✅ No error, displays correctly as job-level event
   
6. Very long error message:
   - ✅ Displays in metadata section (may wrap or truncate)
   
7. Malformed event_timestamp:
   - ✅ Frontend handles gracefully (shows "Invalid Date" or similar)

## Success Criteria

All tests must pass with ✅ for audit log implementation to be considered complete and production-ready.

## Regression Testing

After any changes to:
- Transaction management
- Step execution flow
- Approval process
- Retry logic
- Workflow orchestration

Re-run at minimum: Tests 1-6, 8-10, 13

## Performance Benchmarks

Target metrics:
- Audit log API response time: < 100ms for 50 events
- UI rendering time: < 200ms for 50 events
- Database insert time: < 5ms per event
- Auto-refresh cycle time: < 2s total (all fetches combined)

## Monitoring in Production

Key metrics to track:
1. Audit log table growth rate (rows/day)
2. Failed audit log writes (should be 0)
3. Slow queries on audit_log table
4. Frontend errors related to audit log display
