import { Job } from '../entities/Job';
import { JobState } from '../enums/JobState';
import { Transition } from '../enums/Transition';
import { TransitionMap, createTransitionMap } from '../types/TransitionMap';
import { BaseWorkflow, StepWithPayload } from './BaseWorkflow';
import { IStep } from '../interfaces/IStep';
import { StepFactory, LLMGenerateTitleStepDependencies, UpdateDocumentStepDependencies } from '../steps/StepFactory';

/**
 * ApprovalWorkflow - workflow with approval step
 * Path: PENDING → LLM_PROCESSING → PENDING_APPROVAL → UPDATING_DOCUMENT → COMPLETED
 * Approval can be rejected: PENDING_APPROVAL → REJECTED
 */
export abstract class ApprovalWorkflow extends BaseWorkflow {
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
  protected getStepForState(state: JobState, job: Job): StepWithPayload | null {
    switch (state) {
      case JobState.PENDING:
        return this.getInitialStep(job);

      case JobState.LLM_PROCESSING:
        return this.getApprovalStep(job);

      case JobState.PENDING_APPROVAL:
        // Waiting for user interaction - no step to execute
        return null;

      case JobState.UPDATING_DOCUMENT:
        return this.getUpdateDocumentStep(job);

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
   * Get the approval step
   * Subclasses can override for custom logic and payload
   */
  protected getApprovalStep(job: Job): StepWithPayload {
    return {
      step: StepFactory.createRequireApprovalStep(),
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
