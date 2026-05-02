import { TransactionManager } from '../infrastructure/TransactionManager';
import { WorkerExecutor } from '../infrastructure/WorkerExecutor';
import { JobService } from './JobService';
import { createChildLogger } from '../utils/logger';
import pino from 'pino';

export class LLMWorkerService {
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
    private readonly jobService: JobService,
  ) {
    this.logger = createChildLogger({ worker: 'LLMWorkerService' });
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
      'LLM Worker starting',
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
    this.logger.info('Stopping LLM Worker...');
    this.executor?.stop();
    this.executor = null;
  }

  private async processBatch(): Promise<void> {
    // Claim a batch of work items
    const workItems = await this.txManager.execute(async (repos) => {
      return repos.getLLMWorkQueue().claimBatch(
        this.batchSize,
        this.workerId,
        this.claimTimeoutMs,
      );
    });

    if (workItems.length === 0) {
      this.logger.debug('No work items to process');
      return;
    }

    this.logger.info({ count: workItems.length }, 'Claimed work items');

    // Process each work item
    for (const workItem of workItems) {
      const itemLogger = this.logger.child({
        correlationId: workItem.id,
        documentId: workItem.documentId,
        jobType: workItem.jobType,
      });

      try {
        itemLogger.info('Processing work item');
        await this.jobService.processJob(workItem);
        itemLogger.info('Work item completed');
      } catch (error) {
        itemLogger.error({ error }, 'Work item failed');
        // Failure handling (marking as failed) is done inside JobService
      }
    }
  }
}
