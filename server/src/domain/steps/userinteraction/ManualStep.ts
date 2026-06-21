import { transcode } from "buffer";
import { IStep, StepResult, StepStatus, StepType } from "../IStep.js";
import { Transition } from "../../workflows/Transition.js";

/**
 * Abstract base class for steps that require user interaction
 * These steps coordinate external input and process user decisions
 */
export class ManualStep extends IStep  {
  kind = "manual" as const

  /**
   * Possible transitions for this step based on user input
   * e.g., [SUCCESS (approve), FAILURE (reject)]
   */
  protected readonly possibleDecisions: string[];
  protected readonly decisionToTransitionMap: Record<string, Transition>;

  constructor(
    stepId: string, 
    stepType: StepType, 
    jobId: string, 
    stepState: StepStatus,
    possibleDecisions: string[], 
    decisionToTransitionMap: Record<string, Transition>, 
    retryCount: number = 0,
    retryAfter: Date | null = null
  ) {
    super(stepId, stepType, jobId, stepState, retryCount, retryAfter);
    this.possibleDecisions = possibleDecisions
    this.decisionToTransitionMap = decisionToTransitionMap
    for (const decision of this.possibleDecisions) {
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
  processUserDecision(
    decision: string,
  ): Promise<StepResult> {
      if (this.possibleDecisions.indexOf(decision) == -1) {
        console.log("Invalid decision " + decision + " for ApprovalInteractionStep");
        this.moveToFailed();
        return Promise.resolve({
          success: false,
          actions: [],
          transition: Transition.FAILURE, 
          message: "User decision " + decision + " unknown for " + this
        })
      }

      const transition = this.decisionToTransitionMap[decision]
      switch (transition) {
        case Transition.FAILURE:
          this.moveToFailed();
          break;
        case Transition.SUCCESS:
          this.moveToCompleted();
          break;
      }

      return Promise.resolve({
        actions: [],
        success: true,
        transition: transition,
        message: "User decision " + decision + ", transition " + transition
      })
  }
}

export class ApprovalInteractionStep extends ManualStep {

  constructor(
    stepId: string, 
    jobId: string, 
    stepState: StepStatus, 
    retryCount: number = 0,
    retryAfter: Date | null = null
  ) {
    const possibleDecisions: string[]=  [ "APPROVED", "REJECTED" ]
    const decisionToTransitionMap: Record<string, Transition> = {
      "APPROVED": Transition.SUCCESS,
      "REJECTED": Transition.FAILURE
    }

    super(stepId, StepType.REQUIRE_APPROVAL, jobId, stepState, possibleDecisions, decisionToTransitionMap, retryCount, retryAfter)
  }

}