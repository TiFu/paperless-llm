/**
 * Audit event types - all events that should be tracked in the audit log
 */
export enum AuditEventType {
  // Job lifecycle
  JOB_CREATED = 'JOB_CREATED',
  
  // Step lifecycle
  STEP_CREATED = 'STEP_CREATED',
  STEP_COMPLETED = 'STEP_COMPLETED',
  STEP_FAILED = 'STEP_FAILED',
  
  // State transitions
  STEP_MOVED_TO_RETRYING = 'STEP_MOVED_TO_RETRYING',
  STEP_MOVED_TO_FALLOUT = 'STEP_MOVED_TO_FALLOUT',
  
  // Approval events
  APPROVAL_REQUESTED = 'APPROVAL_REQUESTED',
  APPROVAL_APPROVED = 'APPROVAL_APPROVED',
  APPROVAL_REJECTED = 'APPROVAL_REJECTED',
  
  // Manual operations
  STEP_MANUALLY_RETRIED = 'STEP_MANUALLY_RETRIED',
  STEP_CANCELLED = 'STEP_CANCELLED',
  
  // System operations
  STUCK_STEP_RESET = 'STUCK_STEP_RESET',
}

/**
 * Metadata types for different event types
 * These are stored as JSONB in the database
 */
export interface JobCreatedMetadata {
  documentId: string;
  jobType: string;
}

export interface StepCreatedMetadata {
  stepType: string;
}

export interface StepExecutionMetadata {
  retryCount: number;
}

export interface StepFailedMetadata extends StepExecutionMetadata {
  errorMessage: string;
}

export interface StepMovedToRetryingMetadata extends StepFailedMetadata {
  nextRetryTime: Date;
}

export interface StepMovedToFalloutMetadata extends StepFailedMetadata {
  // No additional fields beyond StepFailedMetadata
}

export interface ApprovalDecisionMetadata {
  decision: string;
  proposedActions?: any[];
}

export interface StepManuallyRetriedMetadata {
  previousRetryCount: number;
}

export interface StepCancelledMetadata {
  previousStatus: string;
}

export interface StuckStepResetMetadata {
  stuckDurationMs: number;
  previousStartedAt: Date;
}

/**
 * Union type for all possible metadata
 */
export type AuditLogMetadata = 
  | JobCreatedMetadata
  | StepCreatedMetadata
  | StepExecutionMetadata
  | StepFailedMetadata
  | StepMovedToRetryingMetadata
  | StepMovedToFalloutMetadata
  | ApprovalDecisionMetadata
  | StepManuallyRetriedMetadata
  | StepCancelledMetadata
  | StuckStepResetMetadata
  | Record<string, any>; // Fallback for extensibility

/**
 * AuditLogEntry entity - represents a single event in the audit log
 */
export class AuditLogEntry {
  constructor(
    public readonly id: string,
    public readonly jobId: string,
    public readonly stepId: string | null,
    public readonly eventType: AuditEventType,
    public readonly eventTimestamp: Date,
    public readonly processingStartTime: Date | null,
    public readonly processingEndTime: Date | null,
    public readonly metadata: AuditLogMetadata | null,
  ) {}

  /**
   * Calculate processing duration in milliseconds
   * Returns null if start or end time is missing
   */
  public getProcessingDurationMs(): number | null {
    if (!this.processingStartTime || !this.processingEndTime) {
      return null;
    }
    return this.processingEndTime.getTime() - this.processingStartTime.getTime();
  }

  /**
   * Create a new audit log entry (factory method)
   */
  public static create(
    id: string,
    jobId: string,
    eventType: AuditEventType,
    options: {
      stepId?: string | null;
      eventTimestamp?: Date;
      processingStartTime?: Date | null;
      processingEndTime?: Date | null;
      metadata?: AuditLogMetadata | null;
    } = {}
  ): AuditLogEntry {
    return new AuditLogEntry(
      id,
      jobId,
      options.stepId ?? null,
      eventType,
      options.eventTimestamp ?? new Date(),
      options.processingStartTime ?? null,
      options.processingEndTime ?? null,
      options.metadata ?? null,
    );
  }
}
