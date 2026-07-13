import pino from 'pino';
import { createChildLogger } from '../utils/logger.js';
import { LogArea } from '../utils/LogArea.js';
import { StepStatus } from '../domain/steps/IStep.js';
import { IRetryConfig, IWorkersConfig } from '../config/AppConfig.js';
import { UoWFactory } from '../infrastructure/UoW.js';

/**
 * StuckStepResetApplicationService - resets steps stuck in IN_PROGRESS state.
 * Separate service for periodic cleanup of stuck workflow steps.
 */
export interface StuckStepResetResult {
  reset: number;
  fallout: number;
  items: Array<{ stepId: string; outcome: 'retrying' | 'fallout' }>;
}

export class StuckStepResetApplicationService {
  private readonly logger: pino.Logger;

  constructor(
    private readonly uowFactoyr: UoWFactory,
    private readonly workersConfig: IWorkersConfig,
    private readonly retryConfig: IRetryConfig,
  ) {
    this.logger = createChildLogger(LogArea.WORKER, 'StuckStepResetApplicationService');
  }

  /**
   * Reset stuck steps that have been in IN_PROGRESS state beyond timeout threshold
   * Steps exceeding max retries are marked as IN_FALLOUT, others are marked for RETRYING
   * @returns Object with counts of reset and fallout steps
   */
  async resetStuckSteps(): Promise<StuckStepResetResult> {

    const timeoutMs = this.workersConfig.getStuckStepReset().timeoutMs;
    try {
      await using context = await this.uowFactoyr.createSystemUoW();
      await context.start();

      // Find stuck steps
      const stuckSteps = await context.getSteps().getStuckInProgressExecutableSteps(timeoutMs);

      if (stuckSteps.length === 0) {
        this.logger.debug('No stuck steps found');
        return { reset: 0, fallout: 0, items: [] };
      }

      this.logger.warn(
        {
          count: stuckSteps.length,
          stepIds: stuckSteps.map(s => s.getStepId()),
          timeoutMs,
        },
        'Found stuck steps'
      );

      let retryCount = 0;
      let falloutCount = 0;
      const items: StuckStepResetResult['items'] = [];
      const workflowOrchestrator = context.getWorkflowOrchestratorDomainService();
      const steps = workflowOrchestrator.resetStuckSteps(stuckSteps, this.retryConfig.getRetry())
      steps.forEach((s) => {
        if (s.getStepStatus() == StepStatus.RETRYING) {
          retryCount++;
          items.push({ stepId: s.getStepId(), outcome: 'retrying' });
        } else if (s.getStepStatus() == StepStatus.IN_FALLOUT) {
          falloutCount++;
          items.push({ stepId: s.getStepId(), outcome: 'fallout' });
        }
      })
      await context.save();
      //await context.getSteps().updateAll(stuckSteps);
      await context.commit();


      this.logger.info(
        { reset: retryCount, fallout: falloutCount, total: stuckSteps.length },
        'Completed stuck step reset operation'
      );

      return { reset: retryCount, fallout: falloutCount, items };
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
