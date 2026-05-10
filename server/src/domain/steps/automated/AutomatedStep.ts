import { IStep, StepExecutionContext, StepResult, StepStatus, StepType } from '../IStep';
import { Transition } from '../../workflows/Transition';

/**
 * Abstract base class for automated steps that execute without user interaction
 * Automated steps directly return actions and a transition result
 */
export abstract class AutomatedStep extends IStep {
  
  public constructor(stepId: string | null, stepType: StepType, jobId: string, stepState: StepStatus) {
    super(stepId, stepType, jobId, stepState)
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
  async execute(context: StepExecutionContext): Promise<StepResult> {
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
      this.moveToFailed();
      // On error, return failure transition with no actions
      console.error(`Automated step execution failed:`, error);
      return {
        actions: [],
        transition: Transition.FAILURE,
      };
    }
  }
}
