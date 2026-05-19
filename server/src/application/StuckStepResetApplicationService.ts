import pino from 'pino';
import { createChildLogger } from '../utils/logger.js';
import { RetryConfig, StepStatus } from '../domain/steps/IStep.js';
import { AuditLogEntry } from '../domain/audit/AuditLogEntry.js';
import { UoWFactory } from '../infrastructure/UoW.js';

/**
 * StuckStepResetApplicationService - resets steps stuck in IN_PROGRESS state.
 * Separate service for periodic cleanup of stuck workflow steps.
 */
export class StuckStepResetApplicationService {
  private readonly logger: pino.Logger;

  constructor(
    private readonly uowFactoyr: UoWFactory,
    private readonly timeoutMs: number,
    private readonly retryConfig: RetryConfig,
  ) {
    this.logger = createChildLogger({ service: 'StuckStepResetApplicationService' });
  }

  /**
   * Reset stuck steps that have been in IN_PROGRESS state beyond timeout threshold
   * Steps exceeding max retries are marked as IN_FALLOUT, others are marked for RETRYING
   * @returns Object with counts of reset and fallout steps
   */
  async resetStuckSteps(): Promise<{ reset: number; fallout: number }> {

    try {
      await using context = await this.uowFactoyr.createUoW();
      await context.start();

      // Find stuck steps
      const stuckSteps = await context.getSteps().getStuckInProgressExecutableSteps(this.timeoutMs);

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

      let retryCount = 0;
      let falloutCount = 0;
      const workflowOrchestrator = context.getWorkflowOrchestratorDomainService();
      const steps = workflowOrchestrator.resetStuckSteps(stuckSteps, this.retryConfig)
      steps.forEach((s) => {
        if (s.getStepStatus() == StepStatus.RETRYING) {
          retryCount++;
        } else if (s.getStepStatus() == StepStatus.IN_FALLOUT) {
          falloutCount++;
        }
      })
      await context.save();
      //await context.getSteps().updateAll(stuckSteps);
      await context.commit();


      this.logger.info(
        { reset: retryCount, fallout: falloutCount, total: stuckSteps.length },
        'Completed stuck step reset operation'
      );

      return { reset: retryCount, fallout: falloutCount };
    } catch (error) {
      this.logger.error({ error }, 'Failed to reset stuck steps');
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
