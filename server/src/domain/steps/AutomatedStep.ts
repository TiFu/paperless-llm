import { IStep, StepExecutionContext, AutomatedStepResult } from '../interfaces/IStep';
import { Transition } from '../enums/Transition';

/**
 * Abstract base class for automated steps that execute without user interaction
 * Automated steps directly return actions and a transition result
 */
export abstract class AutomatedStep implements IStep {
  /**
   * Execute the step's business logic
   * @param context Execution context with job and step data
   * @returns Document actions, transition result, and optional job data updates
   */
  protected abstract doExecute(
    context: StepExecutionContext,
  ): Promise<AutomatedStepResult>;

  /**
   * Execute the step (implements IStep interface)
   * Wraps doExecute to provide consistent interface
   */
  async execute(context: StepExecutionContext): Promise<AutomatedStepResult> {
    try {
      const result = await this.doExecute(context);
      return result;
    } catch (error) {
      // On error, return failure transition with no actions
      console.error(`Automated step execution failed:`, error);
      return {
        actions: [],
        transition: Transition.FAILURE,
      };
    }
  }
}
