import { AutomatedStep } from './AutomatedStep.js';
import { IStep, StepExecutionContext, StepResult, StepStatus, StepType } from '../IStep.js';
import { Transition } from '../../workflows/Transition.js';

/**
 * Abstract base class for composite steps that spawn multiple child steps
 * Composite steps orchestrate parallel execution but don't execute themselves
 */
export abstract class CompositeStep extends AutomatedStep {
  
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
    super(stepId, stepType, jobId, stepState, retryCount, retryAfter, startedAt, parentStepId, configuration);
  }

  /**
   * Composite steps are organizational parents that don't execute themselves
   * @returns true to indicate this is a composite step
   */
  public isCompositeStep(): boolean {
    return true;
  }

  /**
   * Composite steps don't need prompts (their children do)
   * @returns false
   */
  public needsPrompt(): boolean {
    return false;
  }

  /**
   * Create child steps based on configuration
   * Called by WorkflowOrchestratorService when the composite step is created
   * @returns Array of child steps to execute in parallel
   */
  public abstract createChildSteps(): IStep[];

  /**
   * Composite steps don't execute - they only orchestrate children
   * Returns NONE transition so workflow doesn't advance until children complete
   * @param context Execution context (unused for composite steps)
   * @returns Empty actions and NONE transition
   */
  protected async doExecute(context: StepExecutionContext): Promise<StepResult> {
    return {
      actions: [],
      transition: Transition.NONE,
    };
  }
}
