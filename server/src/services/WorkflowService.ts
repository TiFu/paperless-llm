import { Job } from '../domain/entities/Job';
import { JobState } from '../domain/enums/JobState';
import { Transition } from '../domain/enums/Transition';
import { WorkflowFactory } from '../domain/workflows/WorkflowFactory';
import { TransactionManager } from '../infrastructure/TransactionManager';
import { RepositoryRegistry } from '../infrastructure/RepositoryRegistry';
import { getLogger } from '../utils/logger';

const logger = getLogger();

/**
 * WorkflowService - manages workflow progression and state transitions
 * Responsible for advancing jobs through their workflow steps
 */
export class WorkflowService {
  constructor(
    private readonly transactionManager: TransactionManager,
    private readonly repos: RepositoryRegistry,
    private readonly workflowFactory: WorkflowFactory,
  ) {}

  /**
   * Advance a job to the next step based on transition result
   * @param jobId The job ID to advance
   * @param transition The transition result from the previous step
   */
  async advanceToNextStep(jobId: string, transition: Transition): Promise<void> {
    await this.transactionManager.execute(async (repos) => {
      // Load the job
      const job = await repos.getJobs().getById(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      logger.info('Advancing job to next step', {
        jobId,
        currentState: job.state,
        transition,
      });

      // Get the workflow for this job type
      const workflow = this.workflowFactory.create(job.jobType);

      // Get the next step and state
      const result = workflow.getNextStep(job, transition);

      if (!result) {
        // Workflow is complete - update job to terminal state if not already
        const terminalState = this.getTerminalState(transition);
        if (job.state !== terminalState) {
          await this.updateJobToTerminalState(repos, job, terminalState);
        }
        logger.info('Workflow complete', { jobId, finalState: terminalState });
        return;
      }

      const { step: stepConfig, nextState } = result;

      // Update job state
      job.state = nextState;
      await repos.getJobs().update(job);

      // Create next step
      const step = await repos.getSteps().create(
        jobId,
        stepConfig.type,
        stepConfig.payload,
      );

      logger.info('Created next step', {
        jobId,
        stepId: step.id,
        stepType: step.type,
        newState: nextState,
      });
    });
  }

  /**
   * Start a workflow by creating the initial step
   * @param jobId The job ID to start
   */
  async startWorkflow(jobId: string): Promise<void> {
    await this.transactionManager.execute(async (repos) => {
      // Load the job
      const job = await repos.getJobs().getById(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      if (job.state !== JobState.PENDING) {
        throw new Error(`Job ${jobId} is not in PENDING state, cannot start`);
      }

      logger.info('Starting workflow', { jobId, jobType: job.jobType });

      // Get the workflow for this job type
      const workflow = this.workflowFactory.create(job.jobType);

      // Get the first step (no transition for initial step)
      const result = workflow.getNextStep(job);

      if (!result) {
        throw new Error(`Workflow has no initial step for job ${jobId}`);
      }

      const { step: stepConfig, nextState } = result;

      // Update job state
      job.state = nextState;
      await repos.getJobs().update(job);

      // Create first step
      const step = await repos.getSteps().create(
        jobId,
        stepConfig.type,
        stepConfig.payload,
      );

      logger.info('Created initial step', {
        jobId,
        stepId: step.id,
        stepType: step.type,
        initialState: nextState,
      });
    });
  }

  /**
   * Helper to update job to terminal state with completion timestamp
   */
  private async updateJobToTerminalState(
    repos: RepositoryRegistry,
    job: Job,
    terminalState: JobState,
  ): Promise<void> {
    const completedAt = new Date();
    await repos.getJobs().updateState(job.id, terminalState, undefined, completedAt);
  }

  /**
   * Determine terminal state based on transition
   */
  private getTerminalState(transition: Transition): JobState {
    return transition === Transition.SUCCESS ? JobState.COMPLETED : JobState.FAILED;
  }
}
