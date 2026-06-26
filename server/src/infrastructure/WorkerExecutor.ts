import pino from 'pino';
import { UoWFactory } from './UoW.js';
import { WorkerExecutionItem } from '../domain/workerExecution/WorkerExecutionItem.js';

export interface WorkerRunResult {
  summary?: Record<string, unknown>;
  items?: WorkerExecutionItem[];
}

/**
 * Generic worker executor that handles periodic task execution with adaptive timing.
 *
 * Schedules work using setTimeout (non-blocking) and adjusts the next execution
 * time based on how long the previous execution took, maintaining a consistent
 * execution rhythm. Each run is recorded in worker_executions/worker_execution_items
 * via short-lived system UoWs — the executor only depends on UoWFactory, not on
 * IWorkerExecutionRepository directly.
 */
export class WorkerExecutor {
  private running = false;
  private timeoutHandle: NodeJS.Timeout | null = null;

  constructor(
    private readonly workerType: string,
    private readonly workFn: () => Promise<WorkerRunResult>,
    private readonly intervalMs: number,
    private readonly uowFactory: UoWFactory,
    private readonly logger: pino.Logger,
  ) {}

  /**
   * Start the worker executor. Schedules the first execution immediately.
   */
  start(): void {
    if (this.running) {
      this.logger.warn('WorkerExecutor already running');
      return;
    }

    this.running = true;
    this.logger.info({ intervalMs: this.intervalMs }, 'WorkerExecutor starting');
    this.scheduleNext(0); // Start immediately
  }

  /**
   * Stop the worker executor. Cancels any pending scheduled execution.
   */
  stop(): void {
    if (!this.running) {
      return;
    }

    this.logger.info('WorkerExecutor stopping');
    this.running = false;

    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  /**
   * Check if the executor is currently running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Schedule the next work execution after a specified delay
   */
  private scheduleNext(delayMs: number): void {
    if (!this.running) {
      return;
    }

    this.timeoutHandle = setTimeout(() => {
      this.executeWork();
    }, delayMs);
  }

  /**
   * Record the start of a run in its own short-lived UoW. Returns the execution
   * id, or undefined if recording the start itself failed (in which case the
   * run still proceeds, just untracked).
   */
  private async recordStart(): Promise<string | undefined> {
    try {
      await using uow = await this.uowFactory.createSystemUoW();
      await uow.start();
      const executionId = await uow.getWorkerExecutions().start(this.workerType);
      await uow.commit();
      return executionId;
    } catch (error) {
      this.logger.error({ error }, 'Failed to record worker execution start');
      return undefined;
    }
  }

  /**
   * Record a successful run in its own short-lived UoW.
   */
  private async recordSuccess(executionId: string, result: WorkerRunResult): Promise<void> {
    try {
      await using uow = await this.uowFactory.createSystemUoW();
      await uow.start();
      if (result.items && result.items.length > 0) {
        await uow.getWorkerExecutions().recordItems(executionId, result.items);
      }
      await uow.getWorkerExecutions().complete(executionId, result.summary);
      await uow.commit();
    } catch (error) {
      this.logger.error({ error }, 'Failed to record worker execution success');
    }
  }

  /**
   * Record a failed run in its own short-lived UoW.
   */
  private async recordFailure(executionId: string, errorMessage: string): Promise<void> {
    try {
      await using uow = await this.uowFactory.createSystemUoW();
      await uow.start();
      await uow.getWorkerExecutions().fail(executionId, errorMessage);
      await uow.commit();
    } catch (error) {
      this.logger.error({ error }, 'Failed to record worker execution failure');
    }
  }

  /**
   * Execute the work function, recording the run via short-lived UoWs,
   * and schedule the next execution.
   */
  private async executeWork(): Promise<void> {
    if (!this.running) {
      return;
    }

    const startTime = Date.now();
    const executionId = await this.recordStart();

    try {
      const result = await this.workFn();
      if (executionId) {
        await this.recordSuccess(executionId, result);
      }
    } catch (error) {
      this.logger.error({ error }, 'Error executing work');
      if (executionId) {
        await this.recordFailure(executionId, error instanceof Error ? error.message : String(error));
      }
    }

    // Calculate adjusted delay for next execution
    const executionDuration = Date.now() - startTime;
    const nextDelay = Math.max(0, this.intervalMs - executionDuration);

    if (this.running) {
      this.scheduleNext(nextDelay);
    }
  }
}
