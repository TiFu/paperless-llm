import { TransactionManager } from '../infrastructure/TransactionManager';
import { IDocumentManagementSystem } from '../domain/interfaces/IDocumentManagementSystem';
import { DocumentAction } from '../domain/actions/DocumentAction';
import { DocumentActionFactory } from '../domain/actions/DocumentActionFactory';
import { AuditStatus } from '../domain/entities/AuditEntry';
import { JobStatus } from '../domain/enums/JobStatus';
import { createChildLogger } from '../utils/logger';
import pino from 'pino';

export class ActionService {
  private readonly logger: pino.Logger;

  constructor(
    private readonly txManager: TransactionManager,
    private readonly dmsService: IDocumentManagementSystem,
    private readonly maxRetries: number,
  ) {
    this.logger = createChildLogger({ service: 'ActionService' });
  }

  /**
   * Execute an action item from the document update work queue.
   * External API call (Paperless update) happens OUTSIDE the transaction.
   * DB writes (audit log, mark completed) happen INSIDE the transaction.
   *
   * @param action The action to execute
   */
  async executeAction(action: DocumentAction): Promise<void> {
    const actionLogger = this.logger.child({
      correlationId: action.id,
      documentId: action.documentId,
      actionType: action.actionType,
    });

    actionLogger.info('Executing action');

    let auditStatus: AuditStatus;
    let errorMessage: string | null = null;

    try {
      // Step 1: Apply update to external DMS (OUTSIDE transaction)
      actionLogger.debug('Applying update to DMS');
      await action.execute(this.dmsService);

      auditStatus = AuditStatus.SUCCESS;
      actionLogger.info('Action applied successfully');
    } catch (error) {
      auditStatus = AuditStatus.FAILED;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      actionLogger.error({ error }, 'Action execution failed');
      throw error;
    } finally {
      // Step 2: DB writes happen INSIDE transaction (audit log + mark completed/failed)
      try {
        await this.txManager.execute(async (repos) => {
          // Create audit log entry
          await repos.getAuditLog().insert(
            action.documentId,
            action.documentSystem,
            action.getJobType(),
            action.actionType,
            action.oldValue,
            action.newValue,
            auditStatus,
            errorMessage,
          );

          // Mark action item as completed (even if DMS update failed, we logged it)
          await repos.getDocumentUpdateQueue().markCompleted(action.id);
          
          // Update job status to completed if successful, or failed if not
          if (action.jobId) {
            if (auditStatus === AuditStatus.SUCCESS) {
              await repos.getJobs().updateStatus(action.jobId, JobStatus.COMPLETED);
            } else {
              await repos.getJobs().updateStatus(action.jobId, JobStatus.FAILED, errorMessage);
            }
          }
        });
      } catch (txError) {
        actionLogger.error({ error: txError }, 'Failed to commit audit log');
        // Don't throw here - the original error is more important
      }
    }
  }

  /**
   * Handle action failure and calculate retry
   */
  async handleFailure(actionId: string, currentRetryCount: number): Promise<void> {
    const retryAfter = this.calculateRetryAfter(currentRetryCount);

    if (retryAfter) {
      this.logger.warn(
        {
          actionId,
          retryCount: currentRetryCount + 1,
          retryAfter,
        },
        'Scheduling retry',
      );
    } else {
      this.logger.error(
        {
          actionId,
          retryCount: currentRetryCount + 1,
        },
        'Max retries exceeded',
      );
    }

    await this.txManager.execute(async (repos) => {
      await repos.getDocumentUpdateQueue().markFailed(actionId, retryAfter);
    });
  }

  /**
   * Calculate the next retry time using exponential backoff
   */
  private calculateRetryAfter(retryCount: number): Date | null {
    if (retryCount >= this.maxRetries) {
      return null; // Max retries exceeded, no more retries
    }

    // Exponential backoff: 2^retryCount minutes, max 60 minutes
    const delayMinutes = Math.min(Math.pow(2, retryCount), 60);
    const delayMs = delayMinutes * 60 * 1000;

    return new Date(Date.now() + delayMs);
  }
}
