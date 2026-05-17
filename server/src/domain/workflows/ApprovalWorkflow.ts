import { Transition } from './Transition.js';
import { TransitionMap, createTransitionMap } from './TransitionMap.js';
import { BaseWorkflow } from './BaseWorkflow.js';
import { StepFactory, WorkflowContext } from '../steps/StepFactory.js';
import { JobState } from '../job/JobState.js';
import { IStep } from '../steps/IStep.js';
import { Job } from '../job/Job.js';

/**
 * ApprovalWorkflow - workflow with approval step
 * Path: PENDING → LLM_PROCESSING → PENDING_APPROVAL → UPDATING_DOCUMENT → COMPLETED
 * Approval can be rejected: PENDING_APPROVAL → REJECTED
 */
export class ApprovalWorkflow extends BaseWorkflow {
    // TODO: Improvement potential IF and only IF we change the
    // transaction management and stard passing a context back and forth in services
  constructor(job: Job
  ) {
    super(job);
  }
  
  /**
   * Define approval-enabled workflow transitions
   * Can be overridden by subclasses for custom behavior
   */
  protected defineTransitions(): TransitionMap {
    return createTransitionMap({
      [JobState.PENDING]: {
        [Transition.SUCCESS]: JobState.LLM_PROCESSING,
        [Transition.FAILURE]: JobState.FAILED,
      },
      [JobState.LLM_PROCESSING]: {
        [Transition.SUCCESS]: JobState.PENDING_APPROVAL,
        [Transition.FAILURE]: JobState.FAILED,
      },
      [JobState.PENDING_APPROVAL]: {
        [Transition.SUCCESS]: JobState.UPDATING_DOCUMENT, // Approval granted
        [Transition.FAILURE]: JobState.REJECTED,          // Approval rejected
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
   * Default step mapping for approval workflows
   * Maps states to their corresponding step instances
   * Subclasses can override this for custom step logic
   */
  protected getStepForState(state: JobState, job: Job): IStep | null {
    const factory = new StepFactory();
    switch (state) {
      case JobState.PENDING:
        return null

      case JobState.LLM_PROCESSING:
        return factory.newLLMGenerateFieldsStep(job.id, job.fields)

      case JobState.PENDING_APPROVAL:
        return factory.newRequireApprovalStep(job.id)

      case JobState.UPDATING_DOCUMENT:
        return factory.newUpdateDocumentStep(job.id)

      case JobState.REMOVING_TAGS:
        return factory.newRemoveTagsStep(job.id)

      case JobState.COMPLETED:
      case JobState.FAILED:
      case JobState.REJECTED:
        // Terminal states - no next step
        return null;

      default:
        console.warn(`Unknown job state: ${state}`);
        return null;
    }
  }
}
