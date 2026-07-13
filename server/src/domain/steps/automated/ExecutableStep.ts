import { IStep, RetryConfig, StepExecutionContext, StepResult, StepStatus, StepType } from '../IStep.js';
import { Transition } from '../../workflows/Transition.js';
import { AuditLogEntry } from '../../audit/AuditLogEntry.js';
import { createChildLogger } from '../../../utils/logger.js';
import { LogArea } from '../../../utils/LogArea.js';

const logger = createChildLogger(LogArea.WORKFLOW, 'ExecutableStep');

export interface StepResultWithAuditEntries {
  audit: AuditLogEntry[],
  stepResult: StepResult
}
/**
 * Abstract base class for automated steps that execute without user interaction
 * Automated steps directly return actions and a transition result
 */
export abstract class ExecutableStep extends IStep {
  kind = "executable" as const
  
  public constructor(
    stepId: string, 
    stepType: StepType, 
    jobId: string, 
    stepState: StepStatus, 
    retryCount: number = 0,
    retryAfter: Date | null = null,
    startedAt: Date | null = null,
    parentStepId: string | null = null,
    configuration: Record<string, unknown> | null = null
  ) {
    super(stepId, stepType, jobId, stepState, retryCount, retryAfter, startedAt, parentStepId, configuration)
  }

  /**
   * Execute the step's business logic
   * @param context Execution context with job and step data
   * @returns Document actions, transition result, and optional job data updates
   */
  protected abstract doExecute(
    context: StepExecutionContext,
  ): Promise<StepResult>;

  /**
   * Override this method to indicate if the step requires a prompt for execution
   * @returns true if step needs a prompt, false otherwise
   */
  public needsPrompt(): boolean {
    return false;
  }


  /**
   * Execute the step (implements IStep interface)
   * Wraps doExecute to provide consistent interface
   */
  async execute(context: StepExecutionContext, retryConfig: RetryConfig): Promise<StepResult> {
    // Safety check: prevent execution of steps in RETRYING state
    if (this.getStepStatus() === StepStatus.RETRYING) {
      throw new Error(`Cannot execute step ${this.getStepId()} in RETRYING state. Wait for retry timer.`);
    }
    try {
      this.moveToInProgress();
      const result = await this.doExecute(context);
      if (result.transition == Transition.SUCCESS)  {
        this.moveToCompleted()
      } else {
        this.markExecutionFailed(retryConfig)
      }
      return result
    } catch (error) {
      this.markExecutionFailed(retryConfig)
      // On error, return failure transition with no actions
      logger.error({ error, stepId: this.getStepId() }, 'Automated step execution failed');
      return {
          actions: [],
          success: false,
          transition: Transition.NONE, // No transition out of this step - we either retry or go into fallout
          message: "Step execution failed with error " + error
        }
    }
  }
}
