import { Job } from "../domain/job/Job.js";
import { Transition } from "../domain/workflows/Transition.js";
import { TransactionContext } from "../infrastructure/TransactionManager.js";
import { getLogger } from "../utils/logger.js";
import { AuditLogApplicationService } from "./AuditLogApplicationService.js";
import { CompositeStep } from "../domain/steps/automated/CompositeStep.js";

/**
 * WorkflowOrchestratorService - manages workflow progression and state transitions.
 * Application service responsible for advancing jobs through their workflow steps.
 */
export class WorkflowOrchestratorService {
  constructor(private readonly auditLogService?: AuditLogApplicationService) {}

  /**
   * Advance a job to the next step based on transition result.
   * Handles composite steps (spawns children) and parent step completion detection.
   * @param job The job to advance
   * @param transition The transition result from the previous step
   * @param context Transaction context with repository access
   * @param completedStepId Optional ID of the step that just completed (for parent completion check)
   */
  async advanceToNextStep(
    job: Job, 
    transition: Transition, 
    context: TransactionContext,
    completedStepId?: string
  ): Promise<void> {
    const logger = getLogger();
    const repos = context.getRepositoryRegistry();

    logger.info(
      {
        jobId: job.id,
        currentState: job.state,
        transition,
        completedStepId,
      },
      'Advancing job to next step',
    );

    // Check if we need to handle parent step completion first
    if (completedStepId) {
      const completedStep = await repos.getSteps().getById(completedStepId);
      const parentStepId = completedStep?.getParentStepId();
      if (completedStep && parentStepId) {
        const shouldContinue = await this.checkAndCompleteParentStep(
          parentStepId,
          job,
          context
        );
        
        // If parent is not ready to complete yet, don't advance the workflow
        if (!shouldContinue) {
          logger.info(
            { parentStepId },
            'Parent step not yet complete, waiting for siblings'
          );
          return;
        }
        // If shouldContinue is true, parent was completed and we've already recursively advanced
        // So return here to avoid double advancement
        return;
      }
    }

    // Use domain logic to determine next state and step
    const result = job.advance(transition);
    const { step, nextState, isTerminalState } = result;

    // Persist state changes
    await repos.getJobs().updateState(job);

    // Create the next step if not terminal
    if (!isTerminalState && step) {
      // Check if this is a composite step that spawns children
      if (step.isCompositeStep()) {
        logger.info(
          { stepType: step.getStepType() },
          'Creating composite step with children'
        );
        
        // First create and persist the parent step
        const createdParentStep = await repos.getSteps().create(step) as CompositeStep;
        
        // Log STEP_CREATED event for parent
        if (this.auditLogService) {
          const parentStepId = createdParentStep.getStepId();
          if (parentStepId) {
            await this.auditLogService.logStepCreated(
              context,
              job.id,
              parentStepId,
              createdParentStep.getStepType()
            );
          }
        }
        
        // Create child steps
        const childSteps = createdParentStep.createChildSteps();
        const createdChildSteps = await repos.getSteps().createAll(childSteps);
        
        // Log STEP_CREATED events for all children
        if (this.auditLogService) {
          for (const childStep of createdChildSteps) {
            const childStepId = childStep.getStepId();
            if (childStepId) {
              await this.auditLogService.logStepCreated(
                context,
                job.id,
                childStepId,
                childStep.getStepType()
              );
            }
          }
        }
        
        logger.info(
          { 
            parentStepId: createdParentStep.getStepId(),
            childrenCount: createdChildSteps.length 
          },
          'Composite step and children created'
        );
      } else {
        // Regular step - create single step
        await repos.getSteps().create(step);
        
        // Log STEP_CREATED event
        if (this.auditLogService) {
          const stepId = step.getStepId();
          if (stepId) {
            await this.auditLogService.logStepCreated(
              context,
              job.id,
              stepId,
              step.getStepType()
            );
          }
        }
      }
    }

    logger.info(
      {
        stepType: step?.getStepType(),
        newState: nextState,
        isTerminal: isTerminalState,
      },
      'Job progressed',
    );
  }

  /**
   * Check if all child steps of a parent have completed and advance parent if ready.
   * @param parentStepId The parent step ID
   * @param job The job associated with the parent step
   * @param context Transaction context
   * @returns true if parent was completed and workflow advanced, false if still waiting
   */
  private async checkAndCompleteParentStep(
    parentStepId: string,
    job: Job,
    context: TransactionContext
  ): Promise<boolean> {
    const logger = getLogger();
    const repos = context.getRepositoryRegistry();

    // Check if all children are in final states
    const allChildrenDone = await repos.getSteps().areAllChildStepsInFinalState(parentStepId);
    
    if (!allChildrenDone) {
      // Still waiting for some children to complete
      return false;
    }

    // All children are done - check if any failed
    const hasFailures = await repos.getSteps().hasFailedChildSteps(parentStepId);
    
    const parentStep = await repos.getSteps().getById(parentStepId);
    if (!parentStep) {
      logger.error({ parentStepId }, 'Parent step not found');
      return false;
    }

    if (hasFailures) {
      // At least one child failed - mark parent as IN_FALLOUT
      logger.warn(
        { parentStepId, jobId: job.id },
        'Child steps failed, marking parent as IN_FALLOUT'
      );
      
      parentStep.moveToFailed();
      parentStep.markExecutionFailed({ maxRetries: 0, retryDelayInMs: 0, retryExponent: 1 });
      // This will set the step to IN_FALLOUT since maxRetries = 0
      await repos.getSteps().update(parentStep);
      
      // Do NOT advance workflow - requires manual intervention
      return true; // Return true to prevent double advancement
    }

    // All children succeeded - mark parent as COMPLETED
    logger.info(
      { parentStepId, jobId: job.id },
      'All child steps completed successfully, completing parent and advancing workflow'
    );
    
    parentStep.moveToCompleted();
    await repos.getSteps().update(parentStep);
    
    // Recursively advance the workflow with the parent step's success
    await this.advanceToNextStep(job, Transition.SUCCESS, context, parentStepId);
    
    return true; // Parent was completed and workflow advanced
  }

  /**
   * Start a workflow by creating the initial step.
   * @param jobId The job ID to start
   */
  async startWorkflow(job: Job, context: TransactionContext): Promise<void> {
    return await this.advanceToNextStep(job, Transition.SUCCESS, context);
  }
}
