import { postMessageToThread } from "worker_threads";
import { IStep, StepType } from "../steps/IStep.js";
import { Job } from "../job/Job.js";

/**
 * Audit event types - all events that should be tracked in the audit log
 */
export enum AuditEventType {
  // Job lifecycle
  JOB_CREATED = 'JOB_CREATED',
  JOB_COMPLETED = 'JOB_COMPLETED',
  JOB_FAILED = 'JOB_FAILED',
  
  ERROR = 'ERROR',
  // Step lifecycle
  STEP_CREATED = 'STEP_CREATED',
  STEP_EXECUTED = 'STEP_EXECUTED',
  STEP_COMPLETED = 'STEP_COMPLETED',

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

export interface ErrorMetadata {
  message: string
}
/**
 * Metadata types for different event types
 * These are stored as JSONB in the database
 */
export interface JobCompleted {
  documentId: string;
  jobType: string;
}

/**
 * Metadata types for different event types
 * These are stored as JSONB in the database
 */
export interface JobCreatedMetadata {
  documentId: number;
  jobType: string;
  message: string | undefined
}

export interface StepCreatedMetadata {
  stepType: StepType
}

export interface StepCompletedMetadata {
  message: string
  success: boolean
  stepType: StepType
}

export interface StepExecutionMetadata {
  message: string
  stepType: StepType
  success: boolean
  retryCount: number;
  nextRetryTime: Date | null;
}

export interface ManualStepDecisionMetadata {
  decision: string;
  stepType: StepType
}

export interface StepManuallyRetriedMetadata {
  previousRetryCount: number;
  stepType: StepType
}

export interface StepCancelledMetadata {
  previousStatus: string;
  stepType: StepType
}

export interface StuckStepResetMetadata {
  stuckDurationMs: number;
  previousStartedAt: Date;
  stepType: StepType
}

/**
 * Union type for all possible metadata
 */
export type AuditLogMetadata = 
  | JobCreatedMetadata
  | StepCreatedMetadata
  | StepExecutionMetadata
  | ManualStepDecisionMetadata
  | StepManuallyRetriedMetadata
  | StepCancelledMetadata
  | StuckStepResetMetadata
  | Record<string, any>; // Fallback for extensibility

/**
 * AuditLogEntry entity - represents a single event in the audit log
 */
export class AuditLogEntry {
  constructor(
    public readonly id: string | null,
    public readonly jobId: string,
    public readonly stepId: string | null,
    public readonly eventType: AuditEventType,
    public readonly eventTimestamp: Date,
    public readonly processingStartTime: Date | null,
    public readonly processingEndTime: Date | null,
    public readonly metadata: AuditLogMetadata | null,
  ) {}

/**
   * Static creator for JOB_CREATED event
   */
  public static createJobCompleted(
    job: Job,
    metadata: JobCreatedMetadata,
    eventTimestamp: Date
  ): AuditLogEntry {
    return AuditLogEntry.createForJob(
      job,
      AuditEventType.JOB_COMPLETED,
      eventTimestamp,
      metadata
    );
  }

  public static createError(jobId: string, stepId: string | null, error: ErrorMetadata): AuditLogEntry {
    return AuditLogEntry.create(jobId, stepId, AuditEventType.ERROR, new Date(), error);
  }

  /**
   * Static creator for JOB_CREATED event
   */
  public static createJobCreated(
    job: Job
  ): AuditLogEntry {
    return AuditLogEntry.createForJob(
      job,
      AuditEventType.JOB_CREATED,
      new Date(),
      { documentId: job.documentId, jobType: job.jobType}
    );
  }

  /**
   * Static creator for STEP_CREATED event
   */
  public static createStepCreated(
    step: IStep,
    metadata: StepCreatedMetadata,
    eventTimestamp: Date
  ): AuditLogEntry {
    return AuditLogEntry.createForStep(
      step,
      AuditEventType.STEP_CREATED,
      eventTimestamp,
      metadata
    );
  }

  /**
   * Static creator for STEP_COMPLETED event
   */
  public static createStepCompleted(
    step: IStep,
    metadata: StepCompletedMetadata,
    eventTimestamp: Date
  ): AuditLogEntry {
    return AuditLogEntry.createForStep(
      step,
      AuditEventType.STEP_COMPLETED,
      eventTimestamp,
      metadata
    );
  }

  /**
   * Static creator for STEP_COMPLETED event
   */
  public static createStepExecuted(
    step: IStep,
    metadata: StepExecutionMetadata,
    eventTimestamp: Date,
    processingStartTime: Date | null,
    processingEndTime: Date | null
  ): AuditLogEntry {
    return AuditLogEntry.createForStep(
      step,
      AuditEventType.STEP_EXECUTED,
      eventTimestamp,
      metadata,
      processingStartTime,
      processingEndTime
    );
  }

  /**
   * Static creator for APPROVAL_REQUESTED event
   */
  public static createApprovalRequested(
    step: IStep,
    metadata: ManualStepDecisionMetadata,
    eventTimestamp: Date
  ): AuditLogEntry {
    return AuditLogEntry.createForStep(
      step,
      AuditEventType.APPROVAL_REQUESTED,
      eventTimestamp,
      metadata
    );
  }

  /**
   * Static creator for APPROVAL_APPROVED event
   */
  public static createDecisionEntry(
    step: IStep,
    metadata: ManualStepDecisionMetadata,
    eventTimestamp: Date
  ): AuditLogEntry {
    return AuditLogEntry.createForStep(
      step,
      AuditEventType.APPROVAL_APPROVED,
      eventTimestamp,
      metadata
    );
  }

  /**
   * Static creator for STEP_MANUALLY_RETRIED event
   */
  public static createStepManuallyRetried(
    step: IStep,
    metadata: StepCancelledMetadata,
    eventTimestamp: Date
  ): AuditLogEntry {
    return AuditLogEntry.createForStep(
      step,
      AuditEventType.STEP_MANUALLY_RETRIED,
      eventTimestamp,
      metadata
    );
  }

  /**
   * Static creator for STEP_CANCELLED event
   */
  public static createStepCancelled(
    step: IStep,
    metadata: StepCancelledMetadata,
    eventTimestamp: Date
  ): AuditLogEntry {
    return AuditLogEntry.createForStep(
      step,
      AuditEventType.STEP_CANCELLED,
      eventTimestamp,
      metadata
    );
  }

  /**
   * Static creator for STUCK_STEP_RESET event
   */
  public static createStuckStepReset(
    step: IStep,
    metadata: StuckStepResetMetadata
  ): AuditLogEntry {
    return AuditLogEntry.createForStep(
      step,
      AuditEventType.STUCK_STEP_RESET,
      new Date(),
      metadata
    );
  }

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

  private static createForJob(job: Job, eventType: AuditEventType,
    eventTimestamp: Date,
    metadata: AuditLogMetadata
  ): AuditLogEntry {
    return AuditLogEntry.create(job.id, null, eventType, eventTimestamp, metadata, null, null)
  }

  private static createForStep(step: IStep, eventType: AuditEventType,
    eventTimestamp: Date,
    metadata: AuditLogMetadata,
    processingStartTime: Date | null = null,
    processingEndTime: Date | null = null,
  ): AuditLogEntry {
    return AuditLogEntry.create(step.getJobId(), step.getStepId(), eventType, eventTimestamp, metadata, processingStartTime, processingEndTime)
  }

  /**
   * Create a new audit log entry (factory method)
   */
  private static create(
    jobId: string,
    stepId: string | null,
    eventType: AuditEventType,
    eventTimestamp: Date,
    metadata: AuditLogMetadata,
    processingStartTime: Date | null = null,
    processingEndTime: Date | null = null,
  ): AuditLogEntry {
    return new AuditLogEntry(
      null,
      jobId,
      stepId,
      eventType,
      eventTimestamp ?? new Date(),
      processingStartTime ?? null,
      processingEndTime ?? null,
      metadata ?? null,
    );
  }
}
