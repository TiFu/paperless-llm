import { Job } from '../entities/Job';
import { Transition } from './Transition';
import { TransitionMap } from './TransitionMap';
import { IWorkflow } from './IWorkflow';
import { IStep } from '../steps/IStep';
import { JobState } from '../job/JobState';

/**
 * Result of getNextStep including the step instance, next state, and payload
 */
export interface NextStepResult {
  step: IStep;
  nextState: JobState;
}

/**
 * Base workflow class with explicit state machine
 * Subclasses define transitions and step mappings
 */
export abstract class BaseWorkflow implements IWorkflow {
  protected transitionMap: TransitionMap;

  constructor() {
    this.transitionMap = this.defineTransitions();
  }

  /**
   * Define state transition map
   * Maps (currentState, transition) -> nextState
   * @returns TransitionMap defining all valid state transitions
   */
  protected abstract defineTransitions(): TransitionMap;

  /**
   * Get the step instance and payload for a given state
   * @param state The job state
   * @param job The job (for accessing data needed in step creation)
   * @returns Step instance with payload, or null if state has no associated step
   */
  protected abstract getStepForState(
    state: JobState,
    job: Job,
  ): IStep | null;

  /**
   * Get the next step and state based on current job and transition
   * @param job Current job
   * @param transition The transition result from the previous step (optional for initial step)
   * @returns Next step and state, or null if workflow is complete
   */
  public getNextStep(job: Job, transition?: Transition): NextStepResult | null {
    let nextState: JobState;

    if (transition === undefined) {
      // First step - use current job state
      nextState = job.state;
    } else {
      // Look up next state based on current state and transition
      const transitionsForState = this.transitionMap.get(job.state);
      if (!transitionsForState) {
        // No transitions defined for this state - workflow is complete
        return null;
      }

      const nextStateFromMap = transitionsForState.get(transition);
      if (!nextStateFromMap) {
        // No transition defined for this result - workflow is stuck
        throw new Error(
          `No transition defined for state ${job.state} with transition ${transition}`,
        );
      }

      nextState = nextStateFromMap;
    }

    // Check if next state is terminal
    if (this.isTerminalState(nextState)) {
      return null;
    }

    // Get step and payload for next state
    const step = this.getStepForState(nextState, job);
    if (!step) {
      // State has no associated step - workflow is complete
      return null;
    }

    return {
      step: step,
      nextState
    };
  }

  /**
   * Check if a state is terminal (no further steps)
   * @param state Job state to check
   * @returns True if state is terminal
   */
  protected isTerminalState(state: JobState): boolean {
    return (
      state === JobState.COMPLETED ||
      state === JobState.FAILED ||
      state === JobState.REJECTED
    );
  }
}
