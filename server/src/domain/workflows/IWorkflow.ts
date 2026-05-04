import { Job } from '../entities/Job';
import { Transition } from './Transition';
import { NextStepResult } from './BaseWorkflow';

/**
 * Workflow interface - defines state machine for job progression
 * Workflows determine the next step based on current job state and transition result
 */
export interface IWorkflow {
  /**
   * Get the next step and state based on current job and transition
   * @param job Current job
   * @param transition The transition result from the previous step (optional for initial step)
   * @returns Next step and state, or null if workflow is complete
   */
  getNextStep(job: Job, transition?: Transition): NextStepResult | null;
}
