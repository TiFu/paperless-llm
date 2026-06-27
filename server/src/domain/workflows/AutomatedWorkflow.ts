import { Transition } from './Transition.js';
import { TransitionMap, createTransitionMap } from './TransitionMap.js';
import { BaseWorkflow } from './BaseWorkflow.js';
import { StepFactory } from '../steps/StepFactory.js';
import { JobState } from '../job/JobState.js';
import { IStep } from '../steps/IStep.js';
import { Job } from '../job/Job.js';
import { createChildLogger } from '../../utils/logger.js';

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
        [Transition.SUCCESS]: JobState.REMOVING_TAGS,
        [Transition.FAILURE]: JobState.FAILED,
      },
      [JobState.REMOVING_TAGS]: {
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
    const factory = new StepFactory();

    switch (state) {
      case JobState.PENDING:
        return null; //this.getInitialStep(job);

      case JobState.LLM_PROCESSING:
        return factory.newLLMGenerateFieldsStep(job.id, job.fields)

      case JobState.UPDATING_DOCUMENT:
        return factory.newUpdateDocumentStep(job.id)

      case JobState.REMOVING_TAGS:
        return factory.newRemoveTagsStep(job.id)

      case JobState.COMPLETED:
      case JobState.FAILED:
        // Terminal states - no next step
        return null;

      default:
        createChildLogger({ name: 'AutomatedWorkflow' }).warn(`Unknown job state: ${state}`);
        return null;
    }
  }
}
