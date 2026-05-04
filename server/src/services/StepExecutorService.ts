import pino from 'pino';
import { TransactionManager } from '../infrastructure/TransactionManager';
import { IDocumentManagementSystem } from '../domain/document/IDocumentManagementSystem';
import { OllamaService } from './OllamaService';
import { StepFactory } from '../domain/steps/StepFactory';
import { WorkflowFactory } from '../domain/workflows/WorkflowFactory';
import { IStep, StepExecutionContext } from '../domain/steps/IStep';
import { WorkflowActionType } from '../domain/workflows/WorkflowActionType';
import { createChildLogger } from '../utils/logger';

/**
 * StepExecutorService - executes steps and manages workflow progression
 * Core of the async workflow system
 */
export class StepExecutorService {
  private readonly logger: pino.Logger;

  constructor(
    private readonly txManager: TransactionManager,
    private readonly dmsService: IDocumentManagementSystem,
    private readonly ollamaService: OllamaService,
  ) {
    this.logger = createChildLogger({ service: 'StepExecutorService' });
  }

  /**
   * Execute a step by ID
   * Implements idempotency and single-transaction workflow progression
   */
  async executeStep(stepId: string): Promise<void> {
    const stepLogger = this.logger.child({ stepId });
    let step: IStep | null = null;

    try {
      // 1. Load step (outside transaction for read)
      step = await this.txManager.execute(async (repos) => {
        return repos.getSteps().getById(stepId);
      });

      if (!step) {
        throw new Error(`Step not found: ${stepId}`);
      }

      // 2. Check if already completed (idempotency)
      if (step.isCompleted()) {
        stepLogger.info('Step already completed, skipping');
        return;
      }

      if (step.isFailed()) {
        stepLogger.info('Step already failed, skipping');
        return;
      }

      if (step.isInProgress()) {
        stepLogger.warn('Step already in progress, skipping (possible duplicate execution)');
        return;
      }

      // Mark step as in progress
      await this.txManager.execute(async (repos) => {
        await repos.getSteps().markInProgress(step.id);
      });

      stepLogger.info({ type: step.type }, 'Executing step');

      // 3. Execute step (OUTSIDE transaction - external calls)
      // Load job data for context first
      const job = await this.txManager.execute(async (repos) => {
        return repos.getJobs().getById(step.jobId);
      });

      if (!job) {
        throw new Error(`Job not found: ${step.jobId}`);
      }

      // Create step implementation with proper dependencies based on type
      let stepImpl: IStep;
      switch (step.type) {
        case 'LLM_GENERATE_TITLE': {
          const promptsRepo = await this.txManager.execute(async (repos) => {
            return repos.getPrompts();
          });
          stepImpl = StepFactory.createLLMGenerateTitleStep({
            dmsService: this.dmsService,
            ollamaService: this.ollamaService,
            promptsRepo,
          });
          break;
        }

        case 'REQUIRE_APPROVAL':
          stepImpl = StepFactory.createRequireApprovalStep();
          break;

        case 'UPDATE_DOCUMENT':
          stepImpl = StepFactory.createUpdateDocumentStep({
            dmsService: this.dmsService,
          });
          break;

        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      // Create execution context
      const context: StepExecutionContext = {
        jobId: step.jobId,
        stepId: step.id,
        documentId: job.documentId,
        jobType: job.jobType,
        stepPayload: step.payload,
        jobData: job.data,
      };

      const result = await stepImpl.execute(context);

      stepLogger.info({ actionCount: result.actions.length }, 'Step executed successfully');

      // 4. SINGLE DB TRANSACTION: persist actions, update job, create next step
      await this.txManager.execute(async (repos) => {
        // Insert all actions (idempotent via unique constraint)
        // Actions already have jobId and stepId from context
        const persistedActions = await repos.getActionLog().insertActions(result.actions);

        // Mark step as completed
        await repos.getSteps().markCompleted(step.id);

        // Load job (fresh copy for consistency)
        const jobToUpdate = await repos.getJobs().getById(step.jobId);
        if (!jobToUpdate) {
          throw new Error(`Job not found: ${step.jobId}`);
        }

        // Get workflow and handle actions
        const workflow = WorkflowFactory.create(jobToUpdate.jobType);
        workflow.handleActions(jobToUpdate, persistedActions);

        // Decide next step
        const nextStepPayload = workflow.advance(jobToUpdate);

        // Save updated job
        await repos.getJobs().update(jobToUpdate);

        // Create next step if workflow isn't complete
        if (nextStepPayload) {
          const nextStep = await repos.getSteps().create(
            jobToUpdate.id,
            nextStepPayload.type,
            nextStepPayload.payload,
          );

          stepLogger.info(
            { nextStepId: nextStep.id, nextStepType: nextStep.type },
            'Created next step',
          );
        } else {
          stepLogger.info({ jobState: jobToUpdate.state }, 'Workflow complete');
        }
      });

      stepLogger.info('Step execution and workflow progression completed');
    } catch (error) {
      stepLogger.error({ error }, 'Step execution failed');

      // Mark step as failed in DB (only if step was loaded)
      if (step) {
        await this.txManager.execute(async (repos) => {
          await repos.getSteps().markFailed(stepId);

          // Also emit EXECUTION_FAILED action
          await repos.getActionLog().insertActions([
            {
              jobId: step.jobId,
              stepId,
              type: WorkflowActionType.EXECUTION_FAILED,
              payload: {
                error: error instanceof Error ? error.message : String(error),
              },
            },
          ]);
        });
      }

      throw error;
    }
  }

  /**
   * Poll and execute pending steps
   * Called by worker service
   */
  async processPendingSteps(batchSize: number = 10): Promise<number> {
    const steps = await this.txManager.execute(async (repos) => {
      return repos.getSteps().getPending(batchSize);
    });

    this.logger.info({ count: steps.length }, 'Processing pending steps');

    let processed = 0;
    for (const step of steps) {
      try {
        await this.executeStep(step.id);
        processed++;
      } catch (error) {
        this.logger.error(
          { stepId: step.id, error },
          'Failed to process step, will retry later',
        );
        // Continue processing other steps
      }
    }

    return processed;
  }
}
