import pino from 'pino';
import { TransactionManager } from '../infrastructure/TransactionManager.js';
import { createChildLogger } from '../utils/logger.js';
import { AutomatedStep } from '../domain/steps/automated/AutomatedStep.js';
import { AuditLogApplicationService } from './AuditLogApplicationService.js';

/**
 * StepRetryApplicationService - handles manual retry of steps in fallout or retry state.
 * Allows operators to manually trigger retry for steps that have exceeded automatic retries.
 */
export class StepRetryApplicationService {
  private readonly logger: pino.Logger;

  constructor(
    private readonly txManager: TransactionManager,
    private readonly auditLogService: AuditLogApplicationService
  ) {
    this.logger = createChildLogger({ service: 'StepRetryApplicationService' });
  }

  /**
   * Manually retry a step that is in RETRYING or IN_FALLOUT status
   * Resets the retry counter and moves step back to WAITING
   * @param stepId ID of the step to retry
   * @throws Error if step not found or not eligible for manual retry
   */
  async retryStep(stepId: string): Promise<void> {
    await using context = await this.txManager.createContext();

    try {
      await context.start();
      const repos = context.getRepositoryRegistry();

      // Load step
      const step = await repos.getSteps().getById(stepId);
      if (!step) {
        throw new Error(`Step ${stepId} not found`);
      }

      this.logger.info(
        { stepId, stepType: step.getStepType(), currentStatus: step.getStepStatus() },
        'Processing manual retry request'
      );

      // Verify it's an automated step (user interaction steps can't be retried this way)
      if (!(step instanceof AutomatedStep)) {
        throw new Error(
          `Step ${stepId} (${step.getStepType()}) is not an automated step and cannot be manually retried`
        );
      }

      // Verify step is eligible for manual retry
      if (!step.isEligibleForRetry()) {
        throw new Error(
          `Step ${stepId} is in ${step.getStepStatus()} status and is not eligible for manual retry. ` +
          `Only steps in RETRYING or IN_FALLOUT status can be manually retried.`
        );
      }

      // Reset step using domain logic
      const previousRetryCount = step.getRetryCount();
      step.resetForManualRetry();
      
      // Log manual retry event
      await this.auditLogService.logStepManuallyRetried(
        context,
        step.getJobId(),
        stepId,
        previousRetryCount
      );

      // Persist changes
      await repos.getSteps().update(step);

      await context.commit();

      this.logger.info(
        { stepId, newStatus: step.getStepStatus(), retryCount: step.getRetryCount() },
        'Step successfully reset for manual retry'
      );

    } catch (error) {
      this.logger.error({ error, stepId }, 'Failed to manually retry step');
      await context.rollback();
      throw error;
    }
  }
}
