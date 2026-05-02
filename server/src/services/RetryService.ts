import { WorkerConfig } from '../config/AppConfig';

export class RetryService {
  private readonly maxRetries: number;

  constructor(config: WorkerConfig) {
    this.maxRetries = config.maxRetries;
  }

  /**
   * Calculate the next retry time using exponential backoff
   * @param retryCount Current retry count
   * @returns Date for next retry, or null if max retries exceeded
   */
  calculateRetryAfter(retryCount: number): Date | null {
    if (retryCount >= this.maxRetries) {
      return null; // Max retries exceeded, no more retries
    }

    // Exponential backoff: 2^retryCount minutes, max 60 minutes
    const delayMinutes = Math.min(Math.pow(2, retryCount), 60);
    const delayMs = delayMinutes * 60 * 1000;

    return new Date(Date.now() + delayMs);
  }

  /**
   * Check if an item should be retried
   * @param retryCount Current retry count
   * @returns true if retry should be attempted
   */
  shouldRetry(retryCount: number): boolean {
    return retryCount < this.maxRetries;
  }

  /**
   * Get the delay in milliseconds for a given retry count
   * @param retryCount Current retry count
   * @returns Delay in milliseconds
   */
  getDelayMs(retryCount: number): number {
    const delayMinutes = Math.min(Math.pow(2, retryCount), 60);
    return delayMinutes * 60 * 1000;
  }
}
