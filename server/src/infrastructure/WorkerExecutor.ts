import pino from 'pino';

/**
 * Generic worker executor that handles periodic task execution with adaptive timing.
 * 
 * Schedules work using setTimeout (non-blocking) and adjusts the next execution
 * time based on how long the previous execution took, maintaining a consistent
 * execution rhythm.
 */
export class WorkerExecutor {
  private running = false;
  private timeoutHandle: NodeJS.Timeout | null = null;

  constructor(
    private readonly workFn: () => Promise<void>,
    private readonly intervalMs: number,
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
   * Execute the work function and schedule the next execution
   */
  private async executeWork(): Promise<void> {
    if (!this.running) {
      return;
    }

    const startTime = Date.now();

    try {
      await this.workFn();
    } catch (error) {
      this.logger.error({ error }, 'Error executing work');
    }

    // Calculate adjusted delay for next execution
    const executionDuration = Date.now() - startTime;
    const nextDelay = Math.max(0, this.intervalMs - executionDuration);

    if (this.running) {
      this.scheduleNext(nextDelay);
    }
  }
}
