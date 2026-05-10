import { Transition } from './Transition';
import { TransitionMap, createTransitionMap } from './TransitionMap';
import { BaseWorkflow } from './BaseWorkflow';
import { StepFactory } from '../steps/StepFactory';
import { JobState } from '../job/JobState';
import { IStep, StepStatus, StepType } from '../steps/IStep';
import { Job } from '../job/Job';

/**
 * AutomatedWorkflow - workflow without approval steps
 * Direct path: PENDING → LLM_PROCESSING → UPDATING_DOCUMENT → COMPLETED
 */
export class AutomatedWorkflow extends BaseWorkflow {
  constructor(job: Job
  ) {
    super(job);
  }
  /**
   * Define standard automated workflow transitions
   * Can be overridden by subclasses for custom behavior
   */
  protected defineTransitions(): TransitionMap {
    return createTransitionMap({
      [JobState.PENDING]: {
        [Transition.SUCCESS]: JobState.LLM_PROCESSING,
        [Transition.FAILURE]: JobState.FAILED,
      },
      [JobState.LLM_PROCESSING]: {
        [Transition.SUCCESS]: JobState.UPDATING_DOCUMENT,
        [Transition.FAILURE]: JobState.FAILED,
      },
      [JobState.UPDATING_DOCUMENT]: {
        [Transition.SUCCESS]: JobState.COMPLETED,
        [Transition.FAILURE]: JobState.FAILED,
      },
    });
  }

  /**
   * Default step mapping for automated workflows
   * Maps states to their corresponding step instances
   * Subclasses can override this for custom step logic
   */
  protected getStepForState(state: JobState, job: Job): IStep | null {
    switch (state) {
      case JobState.PENDING:
        return null; //this.getInitialStep(job);

      case JobState.LLM_PROCESSING:
        return StepFactory.newLLMGenerateTitleStep(job.id)

      case JobState.UPDATING_DOCUMENT:
        return StepFactory.newUpdateDocumentStep(job.id)

      case JobState.COMPLETED:
      case JobState.FAILED:
        // Terminal states - no next step
        return null;

      default:
        console.warn(`Unknown job state: ${state}`);
        return null;
    }
  }
}
