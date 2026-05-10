import { JobState } from '../job/JobState.js';
import { Transition } from './Transition.js';

/**
 * TransitionMap type - defines state machine transitions
 * Maps from a current state and transition result to the next state
 * 
 * Usage:
 * transitionMap.get(JobState.PENDING)?.get(Transition.SUCCESS) => JobState.LLM_PROCESSING
 */
export type TransitionMap = Map<JobState, Map<Transition, JobState>>;

/**
 * Helper function to create a transition map from a simpler object structure
 * Only non-terminal states need to be defined
 */
export function createTransitionMap(
  transitions: Partial<Record<JobState, Partial<Record<Transition, JobState>>>>,
): TransitionMap {
  const map = new Map<JobState, Map<Transition, JobState>>();
  
  for (const [state, transitionMap] of Object.entries(transitions)) {
    const innerMap = new Map<Transition, JobState>();
    if (transitionMap) {
      for (const [transition, nextState] of Object.entries(transitionMap)) {
        if (nextState) {
          innerMap.set(transition as Transition, nextState as JobState);
        }
      }
    }
    map.set(state as JobState, innerMap);
  }
  
  return map;
}
