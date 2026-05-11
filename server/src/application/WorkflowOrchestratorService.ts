import { Job } from "../domain/job/Job.js";
import { Transition } from "../domain/workflows/Transition.js";
import { TransactionContext } from "../infrastructure/TransactionManager.js";
import { getLogger } from "../utils/logger.js";

/**
 * WorkflowOrchestratorService - manages workflow progression and state transitions.
 * Application service responsible for advancing jobs through their workflow steps.
 */
export class WorkflowOrchestratorService {
  constructor() {}

  /**
   * Advance a job to the next step based on transition result.
   * @param jobId The job ID to advance
   * @param transition The transition result from the previous step
   */
  async advanceToNextStep(job: Job, transition: Transition, context: TransactionContext): Promise<void> {
    const logger = getLogger();
    const repos = context.getRepositoryRegistry();

      logger.info(
        {
          jobId: job.id,
          currentState: job.state,
          transition,
        },
        'Advancing job to next step',
      );

      // Use domain logic to determine next state and step
      const result = job.advance(transition);
      const { step, nextState, isTerminalState } = result;

      // Persist state changes
      await repos.getJobs().updateState(job);

      // Create the next step if not terminal
      if (!isTerminalState && step) {
        await repos.getSteps().create(step);
      }

      logger.info(
        {
          stepType: step?.getStepType(),
          newState: nextState,
          isTerminal: isTerminalState,
        },
        'Job progressed',
      );
  }

  /**
   * Start a workflow by creating the initial step.
   * @param jobId The job ID to start
   */
  async startWorkflow(job: Job, context: TransactionContext): Promise<void> {
    return await this.advanceToNextStep(job, Transition.SUCCESS, context);
  }
}
