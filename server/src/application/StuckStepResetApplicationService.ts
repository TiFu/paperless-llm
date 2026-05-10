import pino from 'pino';
import { TransactionManager } from '../infrastructure/TransactionManager.js';
import { createChildLogger } from '../utils/logger.js';
import { RetryConfig } from '../domain/steps/IStep.js';

/**
 * StuckStepResetApplicationService - resets steps stuck in IN_PROGRESS state.
 * Separate service for periodic cleanup of stuck workflow steps.
 */
export class StuckStepResetApplicationService {
  private readonly logger: pino.Logger;

  constructor(
    private readonly txManager: TransactionManager,
    private readonly timeoutMs: number,
    private readonly retryConfig: RetryConfig
  ) {
    this.logger = createChildLogger({ service: 'StuckStepResetApplicationService' });
  }

  /**
   * Reset stuck steps that have been in IN_PROGRESS state beyond timeout threshold
   * Steps exceeding max retries are marked as IN_FALLOUT, others are marked for RETRYING
   * @returns Object with counts of reset and fallout steps
   */
  async resetStuckSteps(): Promise<{ reset: number; fallout: number }> {
    await using context = await this.txManager.createContext();

    try {
      await context.start();
      const repos = context.getRepositoryRegistry();

      // Find stuck steps
      const stuckSteps = await repos.getSteps().getStuckInProgressSteps(this.timeoutMs);

      if (stuckSteps.length === 0) {
        this.logger.debug('No stuck steps found');
        return { reset: 0, fallout: 0 };
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
      let falloutCount = 0;

      stuckSteps.forEach(a => a.markExecutionFailed(this.retryConfig))
      await repos.getSteps().updateAll(stuckSteps);
      await context.commit();

      this.logger.info(
        { reset: resetCount, fallout: falloutCount, total: stuckSteps.length },
        'Completed stuck step reset operation'
      );

      return { reset: resetCount, fallout: falloutCount };
    } catch (error) {
      this.logger.error({ error }, 'Failed to reset stuck steps');
      await context.rollback();
      throw error;
    }
  }

  /**
   * Calculate exponential backoff delay for retry
   * Formula: min(2^retryCount * baseDelay, maxDelay)
   * @param retryCount Current retry count
   * @returns Delay in milliseconds
   */
  private calculateRetryDelay(retryCount: number): number {
    const baseDelayMs = 30000; // 30 seconds
    const maxDelayMs = 3600000; // 60 minutes
    const delay = Math.pow(2, retryCount) * baseDelayMs;
    return Math.min(delay, maxDelayMs);
  }
}
