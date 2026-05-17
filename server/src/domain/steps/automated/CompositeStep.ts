import { IStep, StepStatus, StepType } from '../IStep.js';

/**
 * Abstract base class for composite steps that spawn multiple child steps
 * Composite steps orchestrate parallel execution but don't execute themselves
 */
export class CompositeStep extends IStep {
  kind = "composite" as const

  public constructor(
    stepId: string, 
    stepType: StepType, 
    jobId: string, 
    stepState: StepStatus, 
    retryCount: number = 0,
    private readonly children: Array<IStep>,
    retryAfter: Date | null = null,
    startedAt: Date | null = null,
    parentStepId: string | null = null,
    configuration: Record<string, any> | null = null
  ) {
    super(stepId, stepType, jobId, stepState, retryCount, retryAfter, startedAt, parentStepId, configuration);
    this.children.forEach(c => c.setParentId(stepId))
  }

  public hasChildren(): boolean {
    return true
  }

  public getChildren(): Array<IStep> {
      return this.children
  }
  /**
   * Composite steps are organizational parents that don't execute themselves
   * @returns true to indicate this is a composite step
   */
  public isCompositeStep(): boolean {
    return true;
  }
}
