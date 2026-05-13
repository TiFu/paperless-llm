import pino from 'pino';
import { TransactionManager } from '../infrastructure/TransactionManager.js';
import { createChildLogger } from '../utils/logger.js';
import { AutomatedStep } from '../domain/steps/automated/AutomatedStep.js';
import { Transition } from '../domain/workflows/Transition.js';
import { WorkflowOrchestratorService } from './WorkflowOrchestratorService.js';
import { AuditLogApplicationService } from './AuditLogApplicationService.js';

/**
 * StepCancelApplicationService - handles manual cancellation of steps in fallout or retry state.
 * Allows operators to permanently fail steps that cannot be recovered, triggering job failure.
 */
export class StepCancelApplicationService {
  private readonly logger: pino.Logger;

  constructor(
    private readonly txManager: TransactionManager,
    private readonly workflowOrchestrator: WorkflowOrchestratorService,
    private readonly auditLogService: AuditLogApplicationService
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
        'Processing manual cancel request'
      );

      // Verify it's an automated step (user interaction steps can't be cancelled this way)
      if (!(step instanceof AutomatedStep)) {
        throw new Error(
          `Step ${stepId} (${step.getStepType()}) is not an automated step and cannot be manually cancelled`
        );
      }

      // Verify step is eligible for cancellation (same as retry eligibility)
      if (!step.isEligibleForRetry()) {
        throw new Error(
          `Step ${stepId} is in ${step.getStepStatus()} status and is not eligible for cancellation. ` +
          `Only steps in RETRYING or IN_FALLOUT status can be manually cancelled.`
        );
      }

      // Load the job to advance workflow
      const job = await repos.getJobs().getById(step.getJobId());
      if (!job) {
        throw new Error(`Job ${step.getJobId()} not found for step ${stepId}`);
      }

      // Mark step as failed using domain logic
      step.moveToFailed();

      // Persist step changes
      await repos.getSteps().update(step);

      // Advance workflow with FAILURE transition (will move job to FAILED state)
      await this.workflowOrchestrator.advanceToNextStep(
        job, 
        Transition.FAILURE, 
        context,
        stepId
      );

      await context.commit();

      this.logger.info(
        { stepId, jobId: job.id, stepStatus: step.getStepStatus(), jobState: job.state },
        'Step successfully cancelled and job failed'
      );

    } catch (error) {
      this.logger.error({ error, stepId }, 'Failed to cancel step');
      await context.rollback();
      throw error;
    }
  }
}
