import { TransactionManager } from '../infrastructure/TransactionManager';
import { StepFactory } from '../domain/steps/StepFactory';
import { UserInteractionStep } from '../domain/steps/UserInteractionStep';
import { WorkflowService } from './WorkflowService';
import { Transition } from '../domain/enums/Transition';
import { getLogger } from '../utils/logger';

const logger = getLogger();

/**
 * StepApprovalService - handles user approval/rejection of interactive steps
 */
export class StepApprovalService {
  constructor(
    private readonly transactionManager: TransactionManager,
    private readonly workflowService: WorkflowService,
  ) {}

  /**
   * Process user approval/rejection for an interactive step
   * @param jobId The job ID
   * @param stepId The step ID awaiting approval
   * @param decision User's decision data (e.g., { approved: true, reason?: string })
   */
  async approve(
    jobId: string,
    stepId: string,
    decision: unknown,
  ): Promise<void> {
    // Process approval in transaction and capture the transition result
    let transitionResult!: Transition;

    await this.transactionManager.execute(async (repos) => {
      // Load step
      const step = await repos.getSteps().getById(stepId);
      if (!step) {
        throw new Error(`Step ${stepId} not found`);
      }

      // Verify step belongs to job
      if (step.jobId !== jobId) {
        throw new Error(`Step ${stepId} does not belong to job ${jobId}`);
      }

      // Load job
      const job = await repos.getJobs().getById(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      logger.info({
        jobId,
        stepId,
        stepType: step.type,
        decision,
      }, 'Processing approval decision');

      // Instantiate step
      // TODO: StepFactory.create now requires dependencies, need to pass them
      // For now, RequireApprovalStep doesn't need dependencies
      const stepInstance = StepFactory.create(step.type, {} as any);

      // Verify it's a user interaction step
      if (!(stepInstance instanceof UserInteractionStep)) {
        throw new Error(
          `Step ${stepId} (${step.type}) is not a user interaction step`,
        );
      }

      // Process user decision
      const result = await stepInstance.processUserDecision(decision);

      // Add actions to job
      job.documentActions.push(...result.actions);

      // Update job with new actions
      await repos.getJobs().update(job);

      // Mark step as completed
      await repos.getSteps().markCompleted(stepId);

      logger.info({
        jobId,
        stepId,
        transition: result.transition,
        actionsCount: result.actions.length,
      }, 'Approval processed');

      // Capture transition for use after transaction
      transitionResult = result.transition;
    });

    // After transaction commits, advance workflow to next step
    // This is done outside transaction to avoid nested transactions
    await this.workflowService.advanceToNextStep(jobId, transitionResult);
  }
}
