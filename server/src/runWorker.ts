import { AppContext } from './bootstrap.js';
import { WorkerExecutor, WorkerRunResult } from './infrastructure/WorkerExecutor.js';
import { WorkerExecutionItem } from './domain/workerExecution/WorkerExecutionItem.js';

export async function runWorker(ctx: AppContext): Promise<() => Promise<void>> {
  const { config, logger, applicationServiceFactory, uowFactory } = ctx;

  // Constructed once: each service reads its current settings live (via the
  // narrow I*Config interfaces implemented by config) at the point of use,
  // so no per-cycle reconstruction is needed for these to stay up to date.
  const stepExecutorService = applicationServiceFactory.createStepExecutorApplicationService();
  const stuckStepResetService = applicationServiceFactory.createStuckStepResetApplicationService();
  const autoQueueService = applicationServiceFactory.createDocumentAutoQueueApplicationService();

  const stepProcessorWorker = new WorkerExecutor(
    'step_processor',
    async (): Promise<WorkerRunResult> => {
      if (!config.getStepExecution().enabled) {
        return { summary: { skipped: 'disabled' } };
      }

      const batchSize = config.getStepExecution().batchSize;
      const pending = await stepExecutorService.processPendingSteps(batchSize);
      logger.debug({ processed: pending.processed }, 'Processed steps');

      const retried = await stepExecutorService.processRetryQueue(batchSize);
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
    () => config.getStepExecution().pollIntervalMs,
    uowFactory,
    logger.child({ component: 'StepProcessorWorker' }),
  );

  const stuckStepResetWorker = new WorkerExecutor(
    'stuck_step_reset',
    async (): Promise<WorkerRunResult> => {
      if (!config.getStuckStepReset().enabled) {
        return { summary: { skipped: 'disabled' } };
      }

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
    () => config.getStuckStepReset().checkIntervalMs,
    uowFactory,
    logger.child({ component: 'StuckStepResetWorker' }),
  );

  const entitySyncWorker = new WorkerExecutor(
    'entity_sync',
    async (): Promise<WorkerRunResult> => {
      if (!config.getEntitySync().enabled) {
        return { summary: { skipped: 'disabled' } };
      }

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
    () => config.getEntitySync().pollIntervalMs,
    uowFactory,
    logger.child({ component: 'EntitySyncWorker' }),
  );

  // Always constructed and started, regardless of whether auto-queue is
  // currently enabled — enabled/pollIntervalMs are both read live each cycle
  // below, so toggling the setting takes effect without a restart.
  const documentAutoQueueWorker = new WorkerExecutor(
    'document_auto_queue',
    async (): Promise<WorkerRunResult> => {
      if (!config.getAutoQueue().enabled) {
        return { summary: { skipped: 'disabled' } };
      }

      const result = await autoQueueService.processNewDocuments();
      if (result.created > 0 || result.skipped > 0 || result.joined > 0) {
        logger.info(
          { processed: result.processed, created: result.created, skipped: result.skipped, joined: result.joined },
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
        summary: { processed: result.processed, created: result.created, skipped: result.skipped, joined: result.joined },
        items,
      };
    },
    () => config.getAutoQueue().pollIntervalMs,
    uowFactory,
    logger.child({ component: 'DocumentAutoQueueWorker' }),
  );

  logger.info(
    {
      workerId: config.workers.instanceId,
      enabled: config.getStepExecution().enabled,
      batchSize: config.getStepExecution().batchSize,
      pollIntervalMs: config.getStepExecution().pollIntervalMs,
    },
    'Starting workflow step processor',
  );
  stepProcessorWorker.start();

  logger.info(
    { enabled: config.getEntitySync().enabled, pollIntervalMs: config.getEntitySync().pollIntervalMs },
    'Starting entity sync worker',
  );
  entitySyncWorker.start();

  logger.info(
    {
      enabled: config.getStuckStepReset().enabled,
      timeoutMs: config.getStuckStepReset().timeoutMs,
      checkIntervalMs: config.getStuckStepReset().checkIntervalMs,
    },
    'Starting stuck step reset checker',
  );
  stuckStepResetWorker.start();

  logger.info(
    {
      enabled: config.getAutoQueue().enabled,
      pollIntervalMs: config.getAutoQueue().pollIntervalMs,
      autoProcessTags: config.getAutoProcessTags().map(t => t.tag),
    },
    'Starting document auto-queue worker',
  );
  documentAutoQueueWorker.start();

  return async () => {
    logger.info('Shutting down worker process...');
    stepProcessorWorker.stop();
    stuckStepResetWorker.stop();
    entitySyncWorker.stop();
    documentAutoQueueWorker.stop();
  };
}
