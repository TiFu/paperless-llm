import { randomUUID } from 'crypto';
import { AuditLogEntry, AuditEventType } from '../domain/audit/AuditLogEntry.js';
import { TransactionContext, TransactionManager } from '../infrastructure/TransactionManager.js';
import { getLogger } from '../utils/logger.js';
import { StepType } from '../domain/steps/IStep.js';
import { DocumentAction } from '../domain/actions/DocumentAction.js';

/**
 * AuditLogApplicationService - centralized service for logging all job and step lifecycle events
 * 
 * This service provides helper methods for each event type and handles:
 * - Creating AuditLogEntry entities with appropriate metadata
 * - Persisting entries via the repository within transactions
 * - Error handling to ensure audit failures don't crash workflows
 */
export class AuditLogApplicationService {
  constructor(
    private readonly txManager: TransactionManager
  ) {}
  
  /**
   * Log JOB_CREATED event
   */
  async logJobCreated(
    context: TransactionContext,
    jobId: string,
    documentId: string,
    jobType: string
  ): Promise<void> {
    try {
      const entry = AuditLogEntry.create(
        randomUUID(),
        jobId,
        AuditEventType.JOB_CREATED,
        {
          stepId: null,
          metadata: {
            documentId,
            jobType,
          },
        }
      );

      const repos = context.getRepositoryRegistry();
      await repos.getAuditLog().create(entry);
    } catch (error) {
      const logger = getLogger();
      logger.error({ error, jobId }, 'Failed to log JOB_CREATED event');
      // Don't throw - audit failures should not crash workflows
    }
  }

  /**
   * Log STEP_CREATED event
   */
  async logStepCreated(
    context: TransactionContext,
    jobId: string,
    stepId: string,
    stepType: StepType
  ): Promise<void> {
    try {
      const entry = AuditLogEntry.create(
        randomUUID(),
        jobId,
        AuditEventType.STEP_CREATED,
        {
          stepId,
          metadata: {
            stepType: stepType.toString(),
          },
        }
      );

      const repos = context.getRepositoryRegistry();
      await repos.getAuditLog().create(entry);
    } catch (error) {
      const logger = getLogger();
      logger.error({ error, jobId, stepId }, 'Failed to log STEP_CREATED event');
    }
  }

  /**
   * Log STEP_COMPLETED event
   */
  async logStepCompleted(
    context: TransactionContext,
    jobId: string,
    stepId: string,
    startTime: Date,
    endTime: Date,
    retryCount: number
  ): Promise<void> {
    try {
      const entry = AuditLogEntry.create(
        randomUUID(),
        jobId,
        AuditEventType.STEP_COMPLETED,
        {
          stepId,
          processingStartTime: startTime,
          processingEndTime: endTime,
          metadata: {
            retryCount,
          },
        }
      );

      const repos = context.getRepositoryRegistry();
      await repos.getAuditLog().create(entry);
    } catch (error) {
      const logger = getLogger();
      logger.error({ error, jobId, stepId }, 'Failed to log STEP_COMPLETED event');
    }
  }

  /**
   * Log STEP_FAILED event
   */
  async logStepFailed(
    context: TransactionContext,
    jobId: string,
    stepId: string,
    startTime: Date,
    endTime: Date,
    retryCount: number,
    errorMessage: string
  ): Promise<void> {
    try {
      const entry = AuditLogEntry.create(
        randomUUID(),
        jobId,
        AuditEventType.STEP_FAILED,
        {
          stepId,
          processingStartTime: startTime,
          processingEndTime: endTime,
          metadata: {
            retryCount,
            errorMessage,
          },
        }
      );

      const repos = context.getRepositoryRegistry();
      await repos.getAuditLog().create(entry);
    } catch (error) {
      const logger = getLogger();
      logger.error({ error, jobId, stepId }, 'Failed to log STEP_FAILED event');
    }
  }

  /**
   * Log STEP_MOVED_TO_RETRYING event
   */
  async logStepMovedToRetrying(
    context: TransactionContext,
    jobId: string,
    stepId: string,
    retryCount: number,
    errorMessage: string,
    nextRetryTime: Date
  ): Promise<void> {
    try {
      const entry = AuditLogEntry.create(
        randomUUID(),
        jobId,
        AuditEventType.STEP_MOVED_TO_RETRYING,
        {
          stepId,
          metadata: {
            retryCount,
            errorMessage,
            nextRetryTime,
          },
        }
      );

      const repos = context.getRepositoryRegistry();
      await repos.getAuditLog().create(entry);
    } catch (error) {
      const logger = getLogger();
      logger.error({ error, jobId, stepId }, 'Failed to log STEP_MOVED_TO_RETRYING event');
    }
  }

  /**
   * Log STEP_MOVED_TO_FALLOUT event
   */
  async logStepMovedToFallout(
    context: TransactionContext,
    jobId: string,
    stepId: string,
    retryCount: number,
    errorMessage: string
  ): Promise<void> {
    try {
      const entry = AuditLogEntry.create(
        randomUUID(),
        jobId,
        AuditEventType.STEP_MOVED_TO_FALLOUT,
        {
          stepId,
          metadata: {
            retryCount,
            errorMessage,
          },
        }
      );

      const repos = context.getRepositoryRegistry();
      await repos.getAuditLog().create(entry);
    } catch (error) {
      const logger = getLogger();
      logger.error({ error, jobId, stepId }, 'Failed to log STEP_MOVED_TO_FALLOUT event');
    }
  }

  /**
   * Log APPROVAL_APPROVED event
   */
  async logApprovalApproved(
    context: TransactionContext,
    jobId: string,
    stepId: string,
    decision: string,
    proposedActions?: DocumentAction[]
  ): Promise<void> {
    try {
      const entry = AuditLogEntry.create(
        randomUUID(),
        jobId,
        AuditEventType.APPROVAL_APPROVED,
        {
          stepId,
          metadata: {
            decision,
            proposedActions: proposedActions?.map(a => ({
              actionType: a.actionType,
              oldValue: a.oldValue,
              newValue: a.newValue,
            })),
          },
        }
      );

      const repos = context.getRepositoryRegistry();
      await repos.getAuditLog().create(entry);
    } catch (error) {
      const logger = getLogger();
      logger.error({ error, jobId, stepId }, 'Failed to log APPROVAL_APPROVED event');
    }
  }

  /**
   * Log APPROVAL_REJECTED event
   */
  async logApprovalRejected(
    context: TransactionContext,
    jobId: string,
    stepId: string,
    decision: string,
    proposedActions?: DocumentAction[]
  ): Promise<void> {
    try {
      const entry = AuditLogEntry.create(
        randomUUID(),
        jobId,
        AuditEventType.APPROVAL_REJECTED,
        {
          stepId,
          metadata: {
            decision,
            proposedActions: proposedActions?.map(a => ({
              actionType: a.actionType,
              oldValue: a.oldValue,
              newValue: a.newValue,
            })),
          },
        }
      );

      const repos = context.getRepositoryRegistry();
      await repos.getAuditLog().create(entry);
    } catch (error) {
      const logger = getLogger();
      logger.error({ error, jobId, stepId }, 'Failed to log APPROVAL_REJECTED event');
    }
  }

  /**
   * Log STEP_MANUALLY_RETRIED event
   */
  async logStepManuallyRetried(
    context: TransactionContext,
    jobId: string,
    stepId: string,
    previousRetryCount: number
  ): Promise<void> {
    try {
      const entry = AuditLogEntry.create(
        randomUUID(),
        jobId,
        AuditEventType.STEP_MANUALLY_RETRIED,
        {
          stepId,
          metadata: {
            previousRetryCount,
          },
        }
      );

      const repos = context.getRepositoryRegistry();
      await repos.getAuditLog().create(entry);
    } catch (error) {
      const logger = getLogger();
      logger.error({ error, jobId, stepId }, 'Failed to log STEP_MANUALLY_RETRIED event');
    }
  }

  /**
   * Log STEP_CANCELLED event
   */
  async logStepCancelled(
    context: TransactionContext,
    jobId: string,
    stepId: string,
    previousStatus: string
  ): Promise<void> {
    try {
      const entry = AuditLogEntry.create(
        randomUUID(),
        jobId,
        AuditEventType.STEP_CANCELLED,
        {
          stepId,
          metadata: {
            previousStatus,
          },
        }
      );

      const repos = context.getRepositoryRegistry();
      await repos.getAuditLog().create(entry);
    } catch (error) {
      const logger = getLogger();
      logger.error({ error, jobId, stepId }, 'Failed to log STEP_CANCELLED event');
    }
  }

  /**
   * Log STUCK_STEP_RESET event
   */
  async logStuckStepReset(
    context: TransactionContext,
    jobId: string,
    stepId: string,
    stuckDurationMs: number,
    previousStartedAt: Date
  ): Promise<void> {
    try {
      const entry = AuditLogEntry.create(
        randomUUID(),
        jobId,
        AuditEventType.STUCK_STEP_RESET,
        {
          stepId,
          metadata: {
            stuckDurationMs,
            previousStartedAt,
          },
        }
      );

      const repos = context.getRepositoryRegistry();
      await repos.getAuditLog().create(entry);
    } catch (error) {
      const logger = getLogger();
      logger.error({ error, jobId, stepId }, 'Failed to log STUCK_STEP_RESET event');
    }
  }

  /**
   * Get audit log for a specific job (with transaction context)
   */
  async getAuditLogForJob(
    context: TransactionContext,
    jobId: string
  ): Promise<AuditLogEntry[]> {
    const repos = context.getRepositoryRegistry();
    return await repos.getAuditLog().getByJobId(jobId);
  }

  /**
   * Get audit log for a specific job (creates own transaction)
   */
  async getAuditLogForJobById(jobId: string): Promise<AuditLogEntry[]> {
    const context = await this.txManager.createContext();
    try {
      await context.start();
      const result = await this.getAuditLogForJob(context, jobId);
      await context.commit();
      return result;
    } catch (error) {
      await context.rollback();
      throw error;
    }
  }
}
