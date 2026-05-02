import { TransactionManager } from '../infrastructure/TransactionManager';
import { WorkerExecutor } from '../infrastructure/WorkerExecutor';
import { ActionService } from './ActionService';
import { ActionFactory } from '../domain/actions/ActionFactory';
import { createChildLogger } from '../utils/logger';
import pino from 'pino';

export class DocumentUpdateWorkerService {
  private readonly logger: pino.Logger;
  private executor: WorkerExecutor | null = null;
  private readonly batchSize: number;
  private readonly pollIntervalMs: number;
  private readonly claimTimeoutMs: number;
  private readonly workerId: string;

  constructor(
    batchSize: number,
    pollIntervalMs: number,
    claimTimeoutMs: number,
    workerId: string,
    private readonly txManager: TransactionManager,
    private readonly actionService: ActionService,
  ) {
    this.logger = createChildLogger({ worker: 'DocumentUpdateWorkerService' });
    this.batchSize = batchSize;
    this.pollIntervalMs = pollIntervalMs;
    this.claimTimeoutMs = claimTimeoutMs;
    this.workerId = workerId;
  }

  start(): void {
    this.logger.info(
      {
        batchSize: this.batchSize,
        pollInterval: this.pollIntervalMs,
        workerId: this.workerId,
      },
      'Document Update Worker starting',
    );

    // Register graceful shutdown handlers
    process.on('SIGTERM', () => this.stop());
    process.on('SIGINT', () => this.stop());

    // Create and start executor
    this.executor = new WorkerExecutor(
      () => this.processBatch(),
      this.pollIntervalMs,
      this.logger,
    );
    this.executor.start();
  }

  stop(): void {
    this.logger.info('Stopping Document Update Worker...');
    this.executor?.stop();
    this.executor = null;
  }

  private async processBatch(): Promise<void> {
    // Claim a batch of action items
    const actionItems = await this.txManager.execute(async (repos) => {
      return repos.getDocumentUpdateQueue().claimBatch(
        this.batchSize,
        this.workerId,
        this.claimTimeoutMs,
      );
    });

    if (actionItems.length === 0) {
      this.logger.debug('No action items to process');
      return;
    }

    this.logger.info({ count: actionItems.length }, 'Claimed action items');

    // Process each action item
    for (const row of actionItems) {
      const action = ActionFactory.fromDb(row);
      
      const itemLogger = this.logger.child({
        correlationId: action.id,
        documentId: action.documentId,
        actionType: action.actionType,
      });

      try {
        itemLogger.info('Processing action item');
        await this.actionService.executeAction(action);
        itemLogger.info('Action item completed');
      } catch (error) {
        itemLogger.error({ error }, 'Action item failed');
        await this.actionService.handleFailure(action.id, action.retryCount);
      }
    }
  }
}
