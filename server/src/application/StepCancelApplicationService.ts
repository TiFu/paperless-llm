import pino from 'pino';
import { createChildLogger } from '../utils/logger.js';
import { ExecutableStep } from '../domain/steps/automated/ExecutableStep.js';
import { AuditLogEntry } from '../domain/audit/AuditLogEntry.js';
import { UoWFactory } from '../infrastructure/UoW.js';

/**
 * StepCancelApplicationService - handles manual cancellation of steps in fallout or retry state.
 * Allows operators to permanently fail steps that cannot be recovered, triggering job failure.
 */
export class StepCancelApplicationService {
  private readonly logger: pino.Logger;

  constructor(
    private readonly uowFactory: UoWFactory
  ) {
    this.logger = createChildLogger({ service: 'StepCancelApplicationService' });
  }

  /**
   * Cancel a step that is in RETRYING or IN_FALLOUT status
   * Permanently marks the step as FAILED and advances the job workflow with FAILURE transition
   * @param stepId ID of the step to cancel
   * @throws Error if step not found or not eligible for cancellation
   */
  async cancelStep(stepId: string): Promise<void> {
    let jobId = null;
    try {
      await using context = await this.uowFactory.createSystemUoW();
      await context.start();
      const steps = context.getSteps();
      
      // Load step
      const step = await steps.getById(stepId);
      if (!step) {
        throw new Error(`Step ${stepId} not found`);
      }
      jobId = step.getJobId();
      // Verify it's an automated step (user interaction steps can't be cancelled this way)
      if (!(step instanceof ExecutableStep)) {
        throw new Error(
          `Step ${step.getStepId()} (${step.getStepType()}) is not an automated step and cannot be manually cancelled`
        );
      }

      this.logger.info(
        { stepId, stepType: step.getStepType(), currentStatus: step.getStepStatus() },
        'Processing manual cancel request (here)'
      );

      const workflowOrchestrator = context.getWorkflowOrchestratorDomainService();
      this.logger.info(
        'Entering process step cancellation'
      );
      const nextStepResult = await workflowOrchestrator.processStepCancellation(step);
      if (nextStepResult.step) steps.create(nextStepResult.step);
      this.logger.info(
        'Exited process step cancellation'
      );

      await context.save();
      await context.commit();

      this.logger.info(
        { stepId, jobId: step.getJobId(), stepStatus: step.getStepStatus()},
        'Step successfully cancelled and job failed'
      );

    } catch (error) {
      this.logger.error({ error, stepId }, 'Failed to cancel step');
      if (!jobId)
          throw error;

      try {
        await using uow = await this.uowFactory.createSystemUoW();
        const entry = AuditLogEntry.createError(jobId, stepId, { message: "" + error })
        uow.getAuditCollector().record(entry)
        uow.save();
        uow.commit();
      } catch(err) {
        this.logger.error({err: err}, "Failed to store audit error event")
      }

      throw error;
    }
  }
}
