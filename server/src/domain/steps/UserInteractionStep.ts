import { IStep, StepExecutionContext, UserInteractionStepResult } from '../interfaces/IStep';
import { Transition } from '../enums/Transition';

/**
 * Abstract base class for steps that require user interaction
 * These steps coordinate external input and process user decisions
 */
export abstract class UserInteractionStep implements IStep {
  /**
   * Possible transitions for this step based on user input
   * e.g., [SUCCESS (approve), FAILURE (reject)]
   */
  abstract readonly possibleTransitions: Transition[];

  /**
   * Execute the step - for user interaction steps, this typically
   * creates a coordination action indicating user input is needed
   */
  abstract execute(
    context: StepExecutionContext,
  ): Promise<UserInteractionStepResult>;

  /**
   * Process user decision and return resulting actions and transition
   * Called by StepApprovalService when user provides input
   * @param decision User's decision data
   * @returns Document actions and transition based on decision
   */
  abstract processUserDecision(
    decision: unknown,
  ): Promise<UserInteractionStepResult>;
}
