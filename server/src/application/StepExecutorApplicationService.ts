import pino from 'pino';
import { TransactionManager } from '../infrastructure/TransactionManager.js';
import { DomainServices } from '../domain/services/DomainServices.js';
import { IStep, StepExecutionContext } from '../domain/steps/IStep.js';
import { WorkflowOrchestratorService } from './WorkflowOrchestratorService.js';
import { IDocumentManagementSystem } from '../domain/document/IDocumentManagementSystem.js';
import { ILLMService } from '../domain/llm/ILLMService.js';
import { createChildLogger } from '../utils/logger.js';
import { AutomatedStep } from '../domain/steps/automated/AutomatedStep.js';

/**
 * StepExecutorApplicationService - executes steps and manages workflow progression.
 * Core of the async workflow system with transaction management.
 */
export class StepExecutorApplicationService {
  private readonly logger: pino.Logger;

  constructor(
    private readonly txManager: TransactionManager,
    private readonly workflowOrchestratorService: WorkflowOrchestratorService,
    private readonly dmsService: IDocumentManagementSystem,
    private readonly llmService: ILLMService,
  ) {
    this.logger = createChildLogger({ service: 'StepExecutorApplicationService' });
  }

  /**
   * Execute a step by ID.
   * Implements idempotency and workflow progression.
   */
  private async executeStep(step: AutomatedStep): Promise<void> {
    const stepLogger = this.logger.child({ name: 'Step ' + step.getStepId() });

    // Check if already completed (idempotency)
    if (step.isCompleted()) {
      stepLogger.info('Step already completed, skipping');
      return;
    }

    if (step.isFailed()) {
      stepLogger.info('Step already failed, skipping');
      return;
    }

    await using context = await this.txManager.createContext()
    try {
        await context.start();
        const repos = context.getRepositoryRegistry();
        const job = await repos.getJobs().getById(step.getJobId());
        if (!job) {
            throw new Error('Unknown job in step execution!');
        }

        let prompt = null;
        if (step.needsPrompt()) {
            prompt = await repos.getPrompts().getByStepType(step.getStepType());
            if (!prompt) {
                throw new Error(`No prompt found for step type: ${step.getStepType()}`);
            }
        }

        const domainServices = new DomainServices(context)

        // Create execution context with domain services
        const executionContext: StepExecutionContext = {
        job: job,
        stepId: step.getStepId() as string,
        prompt: prompt,
        services: {
            dms: this.dmsService,
            llm: this.llmService,
            promptDomainService: domainServices.prompt,
        },
        };
    
        stepLogger.info({ type: step.getStepType(), id: step.getStepId() }, 'Executing step');

            // Execute step (may involve external calls)
        const result = await step.execute(executionContext);
        job.addDocumentActions(result.actions);
        // Advance workflow (separate transaction)
        await this.workflowOrchestratorService.advanceToNextStep(job, result.transition, context);

        await repos.getJobs().update(job);
        await repos.getSteps().update(step);

        await context.commit();
    } catch (error) {
      stepLogger.error({ error }, 'Failed to execute step');
      await context.rollback();
      throw error;
    } finally {
      await context.dispose();
    }

  }

  /**
   * Poll and execute pending steps.
   * Called by worker service.
   * @param batchSize Maximum number of steps to process
   * @returns Number of steps successfully processed
   */
  async processPendingSteps(batchSize: number = 10): Promise<number> {
    const logger = this.logger.child({ name: "StepExecutiorApplicationService.processPendingSteps" });

    // Fetch and mark steps as in-progress in a transaction
    await using context = await this.txManager.createContext();

    let pendingSteps: AutomatedStep[];
    try {
        await context.start();
        const repos = context.getRepositoryRegistry();
        pendingSteps = await repos.getSteps().getPendignAutomatedSteps(batchSize);
        pendingSteps.forEach((s) => s.moveToInProgress());
        await repos.getSteps().updateAll(pendingSteps);
        await context.commit();
    } catch (error) {
        logger.error({ error }, 'Failed to load pending steps');
        context.rollback();
        return 0;
    }

    logger.info({ steps: pendingSteps.map((v) => v.getStepId())}, "Found " + pendingSteps.length + " steps")
    const results: Array<[AutomatedStep, Boolean]> = []
    for (const step of pendingSteps) {
        const result = await this.executeStep(step).then(() => { return [step, true] }).catch((error) => {
            logger.error("Failed to process step "+ step.getStepId() + ": " + error)
            return [step, false]
        }) as [AutomatedStep, Boolean];
        results.push(result)
    }

    logger.info("Updating step status!")
    try {
        await using context = await this.txManager.createContext();
        await context.start();
        const steps = results.map((a) => a[0]);
        const loggableSteps = steps.map((s) => { return {id: s.getStepId(), status: s.getStepStatus()}});
        logger.info({ steps: loggableSteps}, "Updating step statuses")
        context.getRepositoryRegistry().getSteps().updateAll(steps)
        context.commit()
    } catch (error) {
        logger.error({error}, "Failed to update step status");
    }

    const processed = results.reduce((prev, current) => {
        if (current[1]) {
            return prev + 1
        } else {
            return prev;
        }
    }, 0);
    return processed;
  }
}
