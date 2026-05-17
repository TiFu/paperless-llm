import pino from 'pino';
import { TransactionManager } from '../infrastructure/TransactionManager.js';
import { DomainServices } from '../domain/services/DomainServices.js';
import { IStep, RetryConfig, StepExecutionContext, StepStatus } from '../domain/steps/IStep.js';
import { WorkflowOrchestratorService } from './WorkflowOrchestratorService.js';
import { IDocumentManagementSystem } from '../domain/document/IDocumentManagementSystem.js';
import { ILLMService } from '../domain/llm/ILLMService.js';
import { createChildLogger } from '../utils/logger.js';
import { ExecutableStep } from '../domain/steps/automated/ExecutableStep.js';
import { AuditLogApplicationService } from './AuditLogApplicationService.js';
import { AuditLogEntry } from '../domain/audit/AuditLogEntry.js';

/**
 * StepExecutorApplicationService - executes steps and manages workflow progression.
 * Core of the async workflow system with transaction management.
 */
export class StepExecutorApplicationService {
  private readonly logger: pino.Logger;

  constructor(
    private readonly txManager: TransactionManager,
    private readonly dmsService: IDocumentManagementSystem,
    private readonly llmService: ILLMService,
    private readonly retryConfig: RetryConfig,
    private readonly auditLogService: AuditLogApplicationService
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

    await using context = await this.txManager.createContext()
    const startTime = new Date();
    let endTime: Date | null = null;
    try {
        await context.start();

        const job = await context.getRepositoryRegistry().getJobs().getById(step.getJobId());
        if (!job) {
          throw new Error("Unknown job for step " +step.getStepId() + " with job id " + step.getJobId())
        }

        const domainServices = new DomainServices(context, this.dmsService, this.llmService)
        const executionService = domainServices.stepExecution

        stepLogger.info({ type: step.getStepType(), id: step.getStepId() }, 'Executing step');
        const {result, auditEntries} = await executionService.executeAndUpdateHierarchy(step, this.retryConfig)

        await this.auditLogService.createAllEntries(auditEntries);
        // Now advance workflow (may create/log next step)
        const workflowOrchestratorService = new WorkflowOrchestratorService(this.auditLogService, context)
        await workflowOrchestratorService.advanceToNextStep(
          job,
          result.transition
        );

        await context.commit();
    } catch (error) {
      endTime = new Date();
      stepLogger.error({ error }, 'Failed to execute step');
      
      // Rollback prior context
      await context.rollback();

      const entry = AuditLogEntry.createStepExecuted(step, {
        message: "Failed to execute step with error message: " + error,
        success: false,
        nextRetryTime: step.getRetryAfter(),
        retryCount: step.getRetryCount()
      }, new Date(), startTime, endTime)
      this.auditLogService.createEntry(entry)
        .catch((err) => { stepLogger.error(err, "Failed to save audit entries")})

      // TODO: improvement -> re-use context!
      const errorContext = await this.txManager.createContext();
      try {
        await errorContext.start();
        step.markExecutionFailed(this.retryConfig)
        errorContext.getRepositoryRegistry().getSteps().update(step);
        await errorContext.commit();
      } catch (error) {
        stepLogger.error({ error }, "Failed to mark step execution as failed!")
      }
      
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

    let pendingSteps: ExecutableStep[];
    // 1) move Automated Steps to in progress
    try {
        await context.start();
        const repos = context.getRepositoryRegistry();
        pendingSteps = await repos.getSteps().getPendingExecutableSteps(batchSize);
        pendingSteps.forEach((s) => s.moveToInProgress());
        await repos.getSteps().updateAll(pendingSteps);
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

    logger.info("Updating step status!")
    // 3) Save updated steps (i.e. with incremented retry count or updated status)
    try {
        await using context = await this.txManager.createContext();
        await context.start();
        const steps = results.map((a) => a[0]);
        const loggableSteps = steps.map((s) => { return { step: s}});
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

  /**
   * Process retry queue - execute steps that are ready for retry
   * Called by worker service alongside processPendingSteps
   * @param batchSize Maximum number of steps to process
   * @returns Number of steps successfully processed
   */
  async processRetryQueue(batchSize: number = 10): Promise<number> {
    const logger = this.logger.child({ name: "StepExecutorApplicationService.processRetryQueue" });

    // Fetch steps ready for retry and mark them as in-progress in a transaction
    await using context = await this.txManager.createContext();

    let retrySteps: ExecutableStep[];
    try {
        await context.start();
        const repos = context.getRepositoryRegistry();
        const now = new Date();
        retrySteps = await repos.getSteps().getPendingRetries(now, batchSize);
        retrySteps.forEach((s) => s.moveToInProgress());
        await repos.getSteps().updateAll(retrySteps);
        await context.commit();
    } catch (error) {
        logger.error({ error }, 'Failed to load retry steps');
        context.rollback();
        return 0;
    }

    if (retrySteps.length === 0) {
        logger.debug('No steps ready for retry');
        return 0;
    }

    logger.info({ steps: retrySteps.map((v) => v.getStepId())}, "Found " + retrySteps.length + " steps ready for retry")
    
    const results: Array<[ExecutableStep, Boolean]> = []
    for (const step of retrySteps) {
        const result = await this.executeStep(step).then(() => { return [step, true] }).catch((error) => {
            logger.error("Failed to process retry step "+ step.getStepId() + ": " + error)
            return [step, false]
        }) as [ExecutableStep, Boolean];
        results.push(result)
    }

    logger.info("Updating retry step status!")
    try {
        await using context = await this.txManager.createContext();
        await context.start();
        const steps = results.map((a) => a[0]);
        const loggableSteps = steps.map((s) => { return {id: s.getStepId(), status: s.getStepStatus()}});
        logger.info({ steps: loggableSteps}, "Updating retry step statuses")
        context.getRepositoryRegistry().getSteps().updateAll(steps)
        context.commit()
    } catch (error) {
        logger.error({error}, "Failed to update retry step status");
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
