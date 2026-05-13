import { IStep, RetryConfig, StepExecutionContext, StepResult, StepStatus, StepType } from '../IStep.js';
import { Transition } from '../../workflows/Transition.js';

/**
 * Abstract base class for automated steps that execute without user interaction
 * Automated steps directly return actions and a transition result
 */
export abstract class AutomatedStep extends IStep {
  
  public constructor(
    stepId: string | null, 
    stepType: StepType, 
    jobId: string, 
    stepState: StepStatus, 
    retryCount: number = 0,
    retryAfter: Date | null = null,
    startedAt: Date | null = null,
    parentStepId: string | null = null,
    configuration: Record<string, any> | null = null
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
        this.moveToFailed()
      }
      return result;
    } catch (error) {
      this.markExecutionFailed(retryConfig)
      // On error, return failure transition with no actions
      console.error(`Automated step execution failed:`, error);
      return {
        actions: [],
        transition: Transition.NONE,
      };
    }
  }
}
