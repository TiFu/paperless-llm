import { Job } from '../entities/Job';
import { JobState } from '../enums/JobState';
import { Transition } from '../enums/Transition';
import { TransitionMap, createTransitionMap } from '../types/TransitionMap';
import { BaseWorkflow, StepWithPayload } from './BaseWorkflow';
import { IStep } from '../interfaces/IStep';
import { StepFactory, LLMGenerateTitleStepDependencies, UpdateDocumentStepDependencies } from '../steps/StepFactory';

/**
 * AutomatedWorkflow - workflow without approval steps
 * Direct path: PENDING → LLM_PROCESSING → UPDATING_DOCUMENT → COMPLETED
 */
export abstract class AutomatedWorkflow extends BaseWorkflow {
  constructor(
    protected readonly llmDeps: LLMGenerateTitleStepDependencies,
    protected readonly updateDeps: UpdateDocumentStepDependencies,
  ) {
    super();
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
  protected getStepForState(state: JobState, job: Job): StepWithPayload | null {
    switch (state) {
      case JobState.PENDING:
        return this.getInitialStep(job);

      case JobState.LLM_PROCESSING:
        return this.getUpdateDocumentStep(job);

      case JobState.UPDATING_DOCUMENT:
        // Transitioning to COMPLETED - no step needed
        return null;

      case JobState.COMPLETED:
      case JobState.FAILED:
        // Terminal states - no next step
        return null;

      default:
        console.warn(`Unknown job state: ${state}`);
        return null;
    }
  }

  /**
   * Get the initial step for the workflow
   * Default: LLM_GENERATE_TITLE, but subclasses can override
   */
  protected getInitialStep(job: Job): StepWithPayload {
    return {
      step: StepFactory.createLLMGenerateTitleStep(this.llmDeps),
      payload: {},
    };
  }

  /**
   * Get the document update step
   * Subclasses can override for custom logic and payload
   */
  protected getUpdateDocumentStep(job: Job): StepWithPayload {
    return {
      step: StepFactory.createUpdateDocumentStep(this.updateDeps),
      payload: {},
    };
  }
}
