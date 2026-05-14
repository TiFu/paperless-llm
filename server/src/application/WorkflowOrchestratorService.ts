import { Job } from "../domain/job/Job.js";
import { Transition } from "../domain/workflows/Transition.js";
import { TransactionContext } from "../infrastructure/TransactionManager.js";
import { getLogger } from "../utils/logger.js";
import { AuditLogApplicationService } from "./AuditLogApplicationService.js";
import { CompositeStep } from "../domain/steps/automated/CompositeStep.js";
import { AuditLogEntry } from "../domain/audit/AuditLogEntry.js";

/**
 * WorkflowOrchestratorService - manages workflow progression and state transitions.
 * Application service responsible for advancing jobs through their workflow steps.
 */
export class WorkflowOrchestratorService {
  constructor(private readonly auditLogService: AuditLogApplicationService, private readonly context: TransactionContext) {}

  /**
   * Advance a job to the next step based on transition result.
   * Handles composite steps (spawns children) and parent step completion detection.
   * @param job The job to advance
   * @param transition The transition result from the previous step
   * @param context Transaction context with repository access
   */
  async advanceToNextStep(
    job: Job, 
    transition: Transition
  ): Promise<void> {
    const logger = getLogger();
    const repos = this.context.getRepositoryRegistry();

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
    // TODO: this should just be a generic persist method
    await repos.getJobs().updateState(job);

    // We are terminal or no step returned -> done
    if (isTerminalState || !step) {
      return; 
    }

    // Create steps
    await repos.getSteps().create(step);

    // Log STEP_CREATED event
    await this.auditLogService.createEntry(
      AuditLogEntry.createStepCreated(step, {}, new Date())
    )
  }

  /**
   * Start a workflow by creating the initial step.
   * @param jobId The job ID to start
   */
  async startWorkflow(job: Job): Promise<void> {
    return await this.advanceToNextStep(job, Transition.SUCCESS);
   }

}