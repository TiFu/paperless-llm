import { Transition } from './Transition.js';
import { TransitionMap, createTransitionMap } from './TransitionMap.js';
import { BaseWorkflow } from './BaseWorkflow.js';
import { StepFactory } from '../steps/StepFactory.js';
import { JobState } from '../job/JobState.js';
import { IStep } from '../steps/IStep.js';
import { Job } from '../job/Job.js';
import { createChildLogger } from '../../utils/logger.js';
import { LogArea } from '../../utils/LogArea.js';

const logger = createChildLogger(LogArea.WORKFLOW, 'ApprovalWorkflow');

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
        [Transition.FAILURE]: JobState.CLEANUP_AFTER_FAILURE,
      },
      [JobState.LLM_PROCESSING]: {
        [Transition.SUCCESS]: JobState.PENDING_APPROVAL,
        [Transition.FAILURE]: JobState.CLEANUP_AFTER_FAILURE,
      },
      [JobState.PENDING_APPROVAL]: {
        [Transition.SUCCESS]: JobState.UPDATING_DOCUMENT,       // Approval granted
        [Transition.FAILURE]: JobState.CLEANUP_AFTER_REJECTION, // Approval rejected
      },
      [JobState.UPDATING_DOCUMENT]: {
        [Transition.SUCCESS]: JobState.REMOVING_TAGS,
        [Transition.FAILURE]: JobState.CLEANUP_AFTER_FAILURE,
      },
      [JobState.REMOVING_TAGS]: {
        [Transition.SUCCESS]: JobState.COMPLETED,
        [Transition.FAILURE]: JobState.FAILED,
      },
      [JobState.CLEANUP_AFTER_REJECTION]: {
        [Transition.SUCCESS]: JobState.REJECTED,
        [Transition.FAILURE]: JobState.FAILED,
      },
      [JobState.CLEANUP_AFTER_FAILURE]: {
        [Transition.SUCCESS]: JobState.FAILED,
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
      case JobState.CLEANUP_AFTER_REJECTION:
      case JobState.CLEANUP_AFTER_FAILURE:
        return factory.newRemoveTagsStep(job.id)

      case JobState.COMPLETED:
      case JobState.FAILED:
      case JobState.REJECTED:
        // Terminal states - no next step
        return null;

      default:
        logger.warn(`Unknown job state: ${state}`);
        return null;
    }
  }
}
