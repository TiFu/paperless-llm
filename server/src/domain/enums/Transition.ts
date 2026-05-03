/**
 * Transition enum - represents the result of a step execution
 * Used by workflows to determine the next state based on step outcomes
 */
export enum Transition {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}
