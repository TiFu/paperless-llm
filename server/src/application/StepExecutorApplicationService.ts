import pino from 'pino';
import { RetryConfig, StepExecutionContext } from '../domain/steps/IStep.js';
import { WorkflowOrchestratorDomainService } from '../domain/services/WorkflowOrchestratorService.js';
import { IDocumentManagementSystem } from '../domain/document/IDocumentManagementSystem.js';
import { ILLMService } from '../domain/llm/ILLMService.js';
import { createChildLogger } from '../utils/logger.js';
import { ExecutableStep } from '../domain/steps/automated/ExecutableStep.js';
import { AuditLogEntry } from '../domain/audit/AuditLogEntry.js';
import { AuditCollector, UoWFactory } from '../infrastructure/UoW.js';
import { StepExecutorDomainService } from '../domain/services/StepExecutorDomainService.js';

/**
 * StepExecutorApplicationService - executes steps and manages workflow progression.
 * Core of the async workflow system with transaction management.
 */
export class StepExecutorApplicationService {
  private readonly logger: pino.Logger;

  constructor(
    private readonly uowFactory: UoWFactory,
    private readonly dmsService: IDocumentManagementSystem,
    private readonly llmService: ILLMService,
    private readonly retryConfig: RetryConfig,
  ) {
    this.logger = createChildLogger({ service: 'StepExecutorApplicationService' });
  }

  /**
   * Execute a step by ID.
   * Implements idempotency and workflow progression.
   */
  private async executeStep(step: ExecutableStep): Promise<void> {
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
    const stepExecutionCollector = new AuditCollector()
    const stepExecutor = new StepExecutorDomainService(stepExecutionCollector)

    const start = new Date();
    try {
      // (1) Load execution context
      await using uow = await this.uowFactory.createUoW();
      await uow.start();
      const job = await uow.getJobs().getById(step.getJobId())
      const prompt = await uow.getPromptDomainService().loadPrompt(step)
      const stepContext: StepExecutionContext = {
              job: job,
              prompt: prompt,
              services: {
                  dms: this.dmsService,
                  llm: this.llmService,
                  promptDomainService: uow.getPromptDomainService()
              }
          }
      await uow.save();
      await uow.commit();
      await uow.dispose();

      // (2) Execute outside transaction boundary!
      const result = await stepExecutor.executeStep(step, stepContext, this.retryConfig)

      // This all also applies for result failed --> 
      // (3) Execute uow updates
      await using uow2 = await this.uowFactory.createUoW();
      await uow2.start();
      // Store Step Executed Events
      uow2.getAuditCollector().recordAll(stepExecutionCollector.getEvents())
      await uow2.getSteps().update(step) 
      const workflowOrchestrator = uow2.getWorkflowOrchestratorDomainService();
      const output = await workflowOrchestrator.processStepExecutionResult(step, result);
      if (output.jobAdvancement.step)
        await uow2.getSteps().create(output.jobAdvancement.step)
      await uow2.save();
      await uow2.commit();
      await uow2.dispose();

    } catch (error) {
      // Try marking as failed -- if it fails, so be it
      try {
        await using uow3 = await this.uowFactory.createUoW();
        await uow3.start();
        // Store Step Executed Event, - even if the execution failed
        uow3.getAuditCollector().recordAll(stepExecutionCollector.getEvents())
        step.markExecutionFailed(this.retryConfig)
        uow3.getSteps().update(step)
        await uow3.save();
        await uow3.commit();
      } catch (error) {
        stepLogger.error({ error }, "Failed to mark step execution as failed!")
      }

      throw error;
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
    await using context = await this.uowFactory.createUoW();

    let pendingSteps: ExecutableStep[];
    // 1) move Automated Steps to in progress
    try {
        await context.start();
        const stepRepo= context.getSteps();
        pendingSteps = await stepRepo.getPendingExecutableSteps(batchSize);
        pendingSteps.forEach((s) => s.moveToInProgress());
        await context.save()
        await context.commit();
    } catch (error) {
        logger.error({ error }, 'Failed to load pending steps');
        context.rollback();
        return 0;
    }

    // 2) Process steps
    logger.info({ steps: pendingSteps.map((v) => v.getStepId())}, "Found " + pendingSteps.length + " steps")
    const results: Array<[ExecutableStep, Boolean]> = []
    for (const step of pendingSteps) {
        const result = await this.executeStep(step).then(() => { return [step, true] }).catch((error) => {
            logger.error("Failed to process step "+ step.getStepId() + ": " + error)
            return [step, false]
        }) as [ExecutableStep, Boolean];
        results.push(result)
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

  /**
   * Process retry queue - execute steps that are ready for retry
   * Called by worker service alongside processPendingSteps
   * @param batchSize Maximum number of steps to process
   * @returns Number of steps successfully processed
   */
  async processRetryQueue(batchSize: number = 10): Promise<void> {
    const logger = this.logger.child({ name: "StepExecutorApplicationService.processRetryQueue" });

    // Fetch steps ready for retry and mark them as waiting -> picked up again
    let retrySteps: ExecutableStep[];
    try {
        await using context = await this.uowFactory.createUoW();
        await context.start();
        const steps = context.getSteps();
        const now = new Date();
        retrySteps = await steps.getPendingRetries(now, batchSize);
        retrySteps.forEach((s) => s.moveToWaiting());
        await context.save();
        await context.commit();
    } catch (error) {
        logger.error({ error }, 'Failed to load retry steps');
    }
  }
}
