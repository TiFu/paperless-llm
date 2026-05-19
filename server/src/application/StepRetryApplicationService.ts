import pino from 'pino';
import { createChildLogger } from '../utils/logger.js';
import { ExecutableStep } from '../domain/steps/automated/ExecutableStep.js';
import { AuditLogEntry } from '../domain/audit/AuditLogEntry.js';
import { UoWFactory } from '../infrastructure/UoW.js';

/**
 * StepRetryApplicationService - handles manual retry of steps in fallout or retry state.
 * Allows operators to manually trigger retry for steps that have exceeded automatic retries.
 */
export class StepRetryApplicationService {
  private readonly logger: pino.Logger;

  constructor(
    private readonly uowFactory: UoWFactory,
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

    try {
      await using context = await this.uowFactory.createUoW();
      await context.start();

      // Load step
      const step = await context.getSteps().getById(stepId);
      if (!step) {
        throw new Error(`Step ${stepId} not found`);
      }

      this.logger.info(
        { stepId, stepType: step.getStepType(), currentStatus: step.getStepStatus() },
        'Processing manual retry request'
      );

      // Verify it's an automated step (user interaction steps can't be retried this way)
      if (!(step instanceof ExecutableStep)) {
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

      const workflowOrchestrator = context.getWorkflowOrchestratorDomainService();
      workflowOrchestrator.manuallyRetry(step);
      // Reset step using domain logic
      const state = step.getStepStatus();
      

      // Persist changes
      await context.save();
      await context.commit();


      this.logger.info(
        { stepId, newStatus: step.getStepStatus(), retryCount: step.getRetryCount() },
        'Step successfully reset for manual retry'
      );

    } catch (error) {
      this.logger.error({ error, stepId }, 'Failed to manually retry step');
      throw error;
    }
  }
}
