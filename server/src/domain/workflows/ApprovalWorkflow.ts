import { Job } from '../entities/Job';
import { Transition } from './Transition';
import { TransitionMap, createTransitionMap } from './TransitionMap';
import { BaseWorkflow } from './BaseWorkflow';
import { StepFactory, LLMGenerateTitleStepDependencies, UpdateDocumentStepDependencies } from '../steps/StepFactory';
import { JobState } from '../job/JobState';
import { IStep, StepStatus, StepType } from '../steps/IStep';

/**
 * ApprovalWorkflow - workflow with approval step
 * Path: PENDING → LLM_PROCESSING → PENDING_APPROVAL → UPDATING_DOCUMENT → COMPLETED
 * Approval can be rejected: PENDING_APPROVAL → REJECTED
 */
export class ApprovalWorkflow extends BaseWorkflow {
    // TODO: Improvement potential IF and only IF we change the
    // transaction management and stard passing a context back and forth in services
  constructor(
    protected readonly llmDeps: LLMGenerateTitleStepDependencies,
    protected readonly updateDeps: UpdateDocumentStepDependencies,
  ) {
    super();
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
    switch (state) {
      case JobState.PENDING:
        return null

      case JobState.LLM_PROCESSING:
        return StepFactory.newLLMGenerateTitleStep(job.id)

      case JobState.PENDING_APPROVAL:
        return StepFactory.newRequireApprovalStep(job.id)

      case JobState.UPDATING_DOCUMENT:
        return StepFactory.newUpdateDocumentStep(job.id)

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
