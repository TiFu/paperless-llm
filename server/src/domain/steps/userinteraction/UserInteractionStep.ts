import { transcode } from "buffer";
import { IStep, StepResult, StepStatus, StepType } from "../IStep";
import { Transition } from "../../workflows/Transition";

/**
 * Abstract base class for steps that require user interaction
 * These steps coordinate external input and process user decisions
 */
export abstract class UserInteractionStep extends IStep  {
  /**
   * Possible transitions for this step based on user input
   * e.g., [SUCCESS (approve), FAILURE (reject)]
   */
  protected readonly possibleDecisions: string[];
  protected readonly decisionToTransitionMap: Record<string, Transition>;

  constructor(stepId: string | null, stepType: StepType, jobId: string, stepState: StepStatus,
      possibleDecisions: string[], decisionToTransitionMap: Record<string, Transition>) {
    super(stepId, stepType, jobId, stepState);
    this.possibleDecisions = possibleDecisions
    this.decisionToTransitionMap = decisionToTransitionMap
    for (let decision of this.possibleDecisions) {
      if (!(decision in this.decisionToTransitionMap)) {
        throw new Error("Transition for decision " + decision + " is missing in " + this.decisionToTransitionMap)
      }
    }
  }

  /**
   * Get the list of possible decisions for this step
   */
  public getPossibleDecisions(): string[] {
    return this.possibleDecisions;
  }

  /**
   * Process user decision and return resulting actions and transition
   * Called by ApprovalApplicationService when user provides input
   * @param decision User's decision data
   * @returns Document actions and transition based on decision
   */
  abstract processUserDecision(
    decision: string,
  ): Promise<StepResult>;
}

export class ApprovalInteractionStep extends UserInteractionStep {

  constructor(stepId: string | null, jobId: string, stepState: StepStatus) {
    let possibleDecisions: string[]=  [ "APPROVED", "REJECTED" ]
    let decisionToTransitionMap: Record<string, Transition> = {
      "APPROVED": Transition.SUCCESS,
      "REJECTED": Transition.FAILURE
    }

    super(stepId, StepType.REQUIRE_APPROVAL, jobId, stepState, possibleDecisions, decisionToTransitionMap)
  }

  public processUserDecision(decision: string): Promise<StepResult> {
      if (this.possibleDecisions.indexOf(decision) == -1) {
        console.log("Invalid decision " + decision + " for ApprovalInteractionStep");
        return Promise.resolve({
          actions: [],
          transition: Transition.FAILURE
        })
      }

      const transition = this.decisionToTransitionMap[decision]
      return Promise.resolve({
        actions: [],
        transition: transition
      })
  }
}