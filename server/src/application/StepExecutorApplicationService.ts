import pino from 'pino';
import { RetryConfig, StepExecutionContext } from '../domain/steps/IStep.js';
import { ILLMService } from '../domain/llm/ILLMService.js';
import { createChildLogger } from '../utils/logger.js';
import { ExecutableStep } from '../domain/steps/automated/ExecutableStep.js';
import { AuditLogEntry } from '../domain/audit/AuditLogEntry.js';
import { AuditCollector, UoWFactory } from '../infrastructure/UoW.js';
import { StepExecutorDomainService } from '../domain/services/StepExecutorDomainService.js';
import { UserContext } from '../domain/auth/UserContext.js';

export interface StepProcessingItemResult {
  stepId: string;
  outcome: 'success' | 'failed' | 'skipped';
  errorMessage?: string;
  startedAt: Date;
  finishedAt: Date;
}

export interface StepProcessingResult {
  processed: number;
  items: StepProcessingItemResult[];
}

export interface RetryQueueResult {
  retried: number;
  items: Array<{ stepId: string }>;
}

export class StepExecutorApplicationService {
  private readonly logger: pino.Logger;

  constructor(
    private readonly uowFactory: UoWFactory,
    private readonly llmService: ILLMService,
    private readonly retryConfig: RetryConfig,
  ) {
    this.logger = createChildLogger({ service: 'StepExecutorApplicationService' });
  }

  private async executeStep(step: ExecutableStep, user: UserContext): Promise<void> {
    const stepLogger = this.logger.child({ name: 'Step ' + step.getStepId() });

    if (step.isCompleted()) { stepLogger.info('Step already completed, skipping'); return; }
    if (step.isFailed()) { stepLogger.info('Step already failed, skipping'); return; }

    const stepExecutionCollector = new AuditCollector();
    const stepExecutor = new StepExecutorDomainService(stepExecutionCollector);

    try {
      // (1) Load execution context in user UoW
      await using uow = await this.uowFactory.createUoW(user);
      await uow.start();
      const job = await uow.getJobs().getById(step.getJobId());
      const prompt = await uow.getPromptDomainService().loadPrompt(step);
      const dms = await uow.getDMS();
      const stepContext: StepExecutionContext = {
        job,
        prompt,
        services: {
          dms: dms,
          llm: this.llmService,
          promptDomainService: uow.getPromptDomainService(),
        },
      };
      await uow.save();
      await uow.commit();
      await uow.dispose();

      // (2) Execute outside transaction boundary
      const result = await stepExecutor.executeStep(step, stepContext, this.retryConfig);

      // (3) Persist results in user UoW
      await using uow2 = await this.uowFactory.createUoW(user);
      await uow2.start();
      uow2.getAuditCollector().recordAll(stepExecutionCollector.getEvents());
      await uow2.getSteps().update(step);
      const workflowOrchestrator = uow2.getWorkflowOrchestratorDomainService();
      const output = await workflowOrchestrator.processStepExecutionResult(step, result);
      if (output.jobAdvancement.step) await uow2.getSteps().create(output.jobAdvancement.step);
      await uow2.save();
      await uow2.commit();
      await uow2.dispose();

    } catch (error) {
      try {
        await using uow3 = await this.uowFactory.createUoW(user);
        await uow3.start();
        uow3.getAuditCollector().recordAll(stepExecutionCollector.getEvents());
        step.markExecutionFailed(this.retryConfig);
        uow3.getSteps().update(step);
        await uow3.save();
        await uow3.commit();
      } catch (innerError) {
        stepLogger.error({ innerError }, 'Failed to mark step execution as failed!');
      }
      throw error;
    }
  }

  async processPendingSteps(batchSize: number = 10): Promise<StepProcessingResult> {
    const logger = this.logger.child({ name: 'StepExecutorApplicationService.processPendingSteps' });

    // (1) System UoW: fetch and claim pending steps, resolve job owners
    let pendingSteps: ExecutableStep[];
    const ownerMap = new Map<string, string>();
    try {
      await using context = await this.uowFactory.createSystemUoW();
      await context.start();
      pendingSteps = await context.getSteps().getPendingExecutableSteps(batchSize);
      pendingSteps.forEach(s => s.moveToInProgress());

      const jobIds = [...new Set(pendingSteps.map(s => s.getJobId()))];
      await Promise.all(
        jobIds.map(async jobId => {
          const owner = await context.getPermissions().getOwner('job', jobId);
          if (owner) ownerMap.set(jobId, owner);
        }),
      );

      await context.save();
      await context.commit();
    } catch (error) {
      logger.error({ error }, 'Failed to load pending steps');
      return { processed: 0, items: [] };
    }

    logger.info({ steps: pendingSteps.map(v => v.getStepId()) }, `Found ${pendingSteps.length} steps`);

    // (2) Execute each step in its owner's user context
    const items: StepProcessingItemResult[] = [];
    for (const step of pendingSteps) {
      const owner = ownerMap.get(step.getJobId());
      const startedAt = new Date();
      if (!owner) {
        logger.warn({ stepId: step.getStepId(), jobId: step.getJobId() }, 'No owner found for job, skipping step');
        items.push({ stepId: step.getStepId(), outcome: 'skipped', startedAt, finishedAt: new Date() });
        continue;
      }
      const item = await this.executeStep(step, { username: owner })
        .then(() => ({ stepId: step.getStepId(), outcome: 'success' as const, startedAt, finishedAt: new Date() }))
        .catch(error => {
          logger.error({ error }, `Failed to process step ${step.getStepId()}`);
          return {
            stepId: step.getStepId(),
            outcome: 'failed' as const,
            errorMessage: error instanceof Error ? error.message : String(error),
            startedAt,
            finishedAt: new Date(),
          };
        });
      items.push(item);
    }

    return { processed: items.filter(i => i.outcome === 'success').length, items };
  }

  async processRetryQueue(batchSize: number = 10): Promise<RetryQueueResult> {
    const logger = this.logger.child({ name: 'StepExecutorApplicationService.processRetryQueue' });
    try {
      await using context = await this.uowFactory.createSystemUoW();
      await context.start();
      const steps = context.getSteps();
      const retrySteps = await steps.getPendingRetries(new Date(), batchSize);
      retrySteps.forEach(s => s.moveToWaiting());
      await context.save();
      await context.commit();
      return { retried: retrySteps.length, items: retrySteps.map(s => ({ stepId: s.getStepId() })) };
    } catch (error) {
      logger.error({ error }, 'Failed to load retry steps');
      return { retried: 0, items: [] };
    }
  }
}
