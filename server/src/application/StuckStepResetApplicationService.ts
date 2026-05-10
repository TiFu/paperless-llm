import pino from 'pino';
import { TransactionManager } from '../infrastructure/TransactionManager.js';
import { createChildLogger } from '../utils/logger.js';

/**
 * StuckStepResetApplicationService - resets steps stuck in IN_PROGRESS state.
 * Separate service for periodic cleanup of stuck workflow steps.
 */
export class StuckStepResetApplicationService {
  private readonly logger: pino.Logger;

  constructor(
    private readonly txManager: TransactionManager,
    private readonly timeoutMs: number,
    private readonly maxRetries: number,
  ) {
    this.logger = createChildLogger({ service: 'StuckStepResetApplicationService' });
  }

  /**
   * Reset stuck steps that have been in IN_PROGRESS state beyond timeout threshold
   * Steps exceeding max retries are marked as FAILED instead of being reset
   * @returns Object with counts of reset and failed steps
   */
  async resetStuckSteps(): Promise<{ reset: number; failed: number }> {
    await using context = await this.txManager.createContext();

    try {
      await context.start();
      const repos = context.getRepositoryRegistry();

      // Find stuck steps
      const stuckSteps = await repos.getSteps().getStuckInProgressSteps(this.timeoutMs);

      if (stuckSteps.length === 0) {
        this.logger.debug('No stuck steps found');
        return { reset: 0, failed: 0 };
      }

      this.logger.warn(
        { 
          count: stuckSteps.length, 
          stepIds: stuckSteps.map(s => s.getStepId()),
          timeoutMs: this.timeoutMs
        }, 
        'Found stuck steps'
      );

      let resetCount = 0;
      let failedCount = 0;

      for (const step of stuckSteps) {
        const stepId = step.getStepId() as string;
        const retryCount = step.getRetryCount();

        if (retryCount >= this.maxRetries) {
          // Exceeded retry limit - mark as permanently failed
          await repos.getSteps().markStepAsFailed(
            stepId,
            `Exceeded maximum retry count (${this.maxRetries}) after timing out`
          );
          failedCount++;
          this.logger.warn(
            { stepId, retryCount, maxRetries: this.maxRetries },
            'Step exceeded max retries, marking as FAILED'
          );
        } else {
          // Reset to WAITING for retry
          await repos.getSteps().resetStepToWaiting(stepId);
          resetCount++;
          this.logger.info(
            { stepId, retryCount, attempt: retryCount + 1 },
            'Reset stuck step to WAITING for retry'
          );
        }
      }

      await context.commit();

      this.logger.info(
        { reset: resetCount, failed: failedCount, total: stuckSteps.length },
        'Completed stuck step reset operation'
      );

      return { reset: resetCount, failed: failedCount };
    } catch (error) {
      this.logger.error({ error }, 'Failed to reset stuck steps');
      await context.rollback();
      throw error;
    }
  }
}
