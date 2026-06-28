import { AppContext } from './bootstrap.js';
import { WorkerExecutor, WorkerRunResult } from './infrastructure/WorkerExecutor.js';
import { WorkerExecutionItem } from './domain/workerExecution/WorkerExecutionItem.js';

export async function runWorker(ctx: AppContext): Promise<() => Promise<void>> {
  const { config, logger, applicationServiceFactory, uowFactory } = ctx;

  const stepExecutorService = applicationServiceFactory.createStepExecutorApplicationService();
  const stuckStepResetService = applicationServiceFactory.createStuckStepResetApplicationService(
    config.workers.stuckStepReset.timeoutMs
  );

  const stepProcessorWorker = new WorkerExecutor(
    'step_processor',
    async (): Promise<WorkerRunResult> => {
      const pending = await stepExecutorService.processPendingSteps(config.workers.stepExecution.batchSize);
      logger.debug({ processed: pending.processed }, 'Processed steps');

      const retried = await stepExecutorService.processRetryQueue(config.workers.stepExecution.batchSize);
      logger.debug({ retried: retried.retried }, 'Processed retry queue');

      const items: WorkerExecutionItem[] = [
        ...pending.items.map(i => ({
          itemType: 'step',
          itemId: i.stepId,
          outcome: i.outcome,
          errorMessage: i.errorMessage,
          startedAt: i.startedAt,
          finishedAt: i.finishedAt,
        })),
        ...retried.items.map(i => ({
          itemType: 'step',
          itemId: i.stepId,
          outcome: 'requeued',
          startedAt: new Date(),
          finishedAt: new Date(),
        })),
      ];

      return { summary: { processed: pending.processed, retried: retried.retried }, items };
    },
    config.workers.stepExecution.pollIntervalMs,
    uowFactory,
    logger.child({ component: 'StepProcessorWorker' }),
  );

  const stuckStepResetWorker = new WorkerExecutor(
    'stuck_step_reset',
    async (): Promise<WorkerRunResult> => {
      const result = await stuckStepResetService.resetStuckSteps();
      if (result.reset > 0 || result.fallout > 0) {
        logger.info({ reset: result.reset, fallout: result.fallout }, 'Reset stuck steps');
      }

      const now = new Date();
      const items: WorkerExecutionItem[] = result.items.map(i => ({
        itemType: 'step',
        itemId: i.stepId,
        outcome: i.outcome,
        startedAt: now,
        finishedAt: now,
      }));

      return { summary: { reset: result.reset, fallout: result.fallout }, items };
    },
    config.workers.stuckStepReset.checkIntervalMs,
    uowFactory,
    logger.child({ component: 'StuckStepResetWorker' }),
  );

  const entitySyncWorker = new WorkerExecutor(
    'entity_sync',
    async (): Promise<WorkerRunResult> => {
      const result = await ctx.entitySyncService.syncAll();
      const items: WorkerExecutionItem[] = result.items.map(i => ({
        itemType: 'entity_sync_user',
        itemId: i.username,
        outcome: i.outcome,
        errorMessage: i.errorMessage,
        startedAt: i.startedAt,
        finishedAt: i.finishedAt,
      }));
      return { summary: { users: result.items.length }, items };
    },
    config.workers.entitySync.pollIntervalMs,
    uowFactory,
    logger.child({ component: 'EntitySyncWorker' }),
  );

  let documentAutoQueueWorker: WorkerExecutor | null = null;
  if (config.workers.autoQueue.enabled) {
    const autoQueueService = applicationServiceFactory.createDocumentAutoQueueApplicationService(config.workers.autoQueue);

    documentAutoQueueWorker = new WorkerExecutor(
      'document_auto_queue',
      async (): Promise<WorkerRunResult> => {
        const result = await autoQueueService.processNewDocuments();
        if (result.created > 0 || result.skipped > 0) {
          logger.info(
            { processed: result.processed, created: result.created, skipped: result.skipped },
            'Auto-queue processed documents',
          );
        }

        const items: WorkerExecutionItem[] = result.items.map(i => ({
          itemType: 'document',
          itemId: String(i.documentId),
          outcome: i.outcome,
          errorMessage: i.errorMessage,
          startedAt: i.startedAt,
          finishedAt: i.finishedAt,
        }));

        return {
          summary: { processed: result.processed, created: result.created, skipped: result.skipped },
          items,
        };
      },
      config.workers.autoQueue.pollIntervalMs,
      uowFactory,
      logger.child({ component: 'DocumentAutoQueueWorker' }),
    );
  }

  logger.info(
    {
      workerId: config.workers.instanceId,
      batchSize: config.workers.stepExecution.batchSize,
      pollIntervalMs: config.workers.stepExecution.pollIntervalMs,
    },
    'Starting workflow step processor',
  );
  stepProcessorWorker.start();

  logger.info({ pollIntervalMs: config.workers.entitySync.pollIntervalMs }, 'Starting entity sync worker');
  entitySyncWorker.start();

  logger.info(
    {
      timeoutMs: config.workers.stuckStepReset.timeoutMs,
      checkIntervalMs: config.workers.stuckStepReset.checkIntervalMs,
    },
    'Starting stuck step reset checker',
  );
  stuckStepResetWorker.start();

  if (documentAutoQueueWorker) {
    logger.info(
      {
        enabled: config.workers.autoQueue.enabled,
        pollIntervalMs: config.workers.autoQueue.pollIntervalMs,
        workflowType: config.workers.autoQueue.workflowType,
        tag: config.workers.autoQueue.tag,
      },
      'Starting document auto-queue worker',
    );
    documentAutoQueueWorker.start();
  } else {
    logger.info('Document auto-queue worker disabled');
  }

  return async () => {
    logger.info('Shutting down worker process...');
    stepProcessorWorker.stop();
    stuckStepResetWorker.stop();
    entitySyncWorker.stop();
    documentAutoQueueWorker?.stop();
  };
}
