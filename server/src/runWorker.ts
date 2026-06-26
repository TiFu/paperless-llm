import { AppContext } from './bootstrap.js';
import { WorkerExecutor, WorkerRunResult } from './infrastructure/WorkerExecutor.js';
import { WorkerExecutionItem } from './domain/workerExecution/WorkerExecutionItem.js';

export async function runWorker(ctx: AppContext): Promise<() => Promise<void>> {
  const { config, logger, applicationServiceFactory, uowFactory } = ctx;

  const stepExecutorService = applicationServiceFactory.createStepExecutorApplicationService();
  const stuckStepResetService = applicationServiceFactory.createStuckStepResetApplicationService(
    config.worker.stuckStepTimeoutMs,
    config.worker.maxStepRetries,
  );

  const stepProcessorWorker = new WorkerExecutor(
    'step_processor',
    async (): Promise<WorkerRunResult> => {
      const pending = await stepExecutorService.processPendingSteps(config.worker.batchSize);
      logger.debug({ processed: pending.processed }, 'Processed steps');

      const retried = await stepExecutorService.processRetryQueue(config.worker.batchSize);
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
    config.worker.pollIntervalMs,
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
    config.worker.stuckStepCheckIntervalMs,
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
    config.entitySync.pollIntervalMs,
    uowFactory,
    logger.child({ component: 'EntitySyncWorker' }),
  );

  let documentAutoQueueWorker: WorkerExecutor | null = null;
  if (config.autoQueue.enabled) {
    const autoQueueService = applicationServiceFactory.createDocumentAutoQueueApplicationService(config.autoQueue);

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
      config.autoQueue.pollIntervalMs,
      uowFactory,
      logger.child({ component: 'DocumentAutoQueueWorker' }),
    );
  }

  logger.info(
    {
      workerId: config.worker.instanceId,
      batchSize: config.worker.batchSize,
      pollIntervalMs: config.worker.pollIntervalMs,
    },
    'Starting workflow step processor',
  );
  stepProcessorWorker.start();

  logger.info({ pollIntervalMs: config.entitySync.pollIntervalMs }, 'Starting entity sync worker');
  entitySyncWorker.start();

  logger.info(
    {
      timeoutMs: config.worker.stuckStepTimeoutMs,
      checkIntervalMs: config.worker.stuckStepCheckIntervalMs,
      maxRetries: config.worker.maxStepRetries,
    },
    'Starting stuck step reset checker',
  );
  stuckStepResetWorker.start();

  if (documentAutoQueueWorker) {
    logger.info(
      {
        enabled: config.autoQueue.enabled,
        pollIntervalMs: config.autoQueue.pollIntervalMs,
        workflowType: config.autoQueue.workflowType,
        tag: config.autoQueue.tag,
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
