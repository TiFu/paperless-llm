import { RetryService } from '../../src/services/RetryService';
import { WorkerConfig } from '../../src/config/AppConfig';

describe('RetryService Unit Tests', () => {
  let retryService: RetryService;
  const maxRetries = 5;

  beforeEach(() => {
    const mockConfig: WorkerConfig = {
      instanceId: 'test-worker',
      batchSize: 10,
      pollIntervalMs: 5000,
      maxRetries: maxRetries,
      claimTimeoutMs: 300000,
    };

    retryService = new RetryService(mockConfig);
  });

  describe('calculateRetryAfter', () => {
    it('should calculate retry time with exponential backoff', () => {
      const testCases = [
        { retryCount: 0, expectedMinutes: 1 }, // 2^0 = 1
        { retryCount: 1, expectedMinutes: 2 }, // 2^1 = 2
        { retryCount: 2, expectedMinutes: 4 }, // 2^2 = 4
        { retryCount: 3, expectedMinutes: 8 }, // 2^3 = 8
        { retryCount: 4, expectedMinutes: 16 }, // 2^4 = 16
      ];

      testCases.forEach(({ retryCount, expectedMinutes }) => {
        const before = Date.now();
        const retryAfter = retryService.calculateRetryAfter(retryCount);
        const after = Date.now();

        expect(retryAfter).not.toBeNull();
        const delayMs = retryAfter!.getTime() - before;
        const expectedDelayMs = expectedMinutes * 60 * 1000;

        // Allow 100ms tolerance for execution time
        expect(delayMs).toBeGreaterThanOrEqual(expectedDelayMs - 100);
        expect(delayMs).toBeLessThanOrEqual(expectedDelayMs + 100);
      });
    });

    it('should cap delay at 60 minutes', () => {
      const retryCount = 10; // 2^10 = 1024 minutes, should be capped at 60
      const before = Date.now();
      const retryAfter = retryService.calculateRetryAfter(retryCount);
      const after = Date.now();

      expect(retryAfter).not.toBeNull();
      const delayMs = retryAfter!.getTime() - before;
      const maxDelayMs = 60 * 60 * 1000; // 60 minutes

      expect(delayMs).toBeGreaterThanOrEqual(maxDelayMs - 100);
      expect(delayMs).toBeLessThanOrEqual(maxDelayMs + 100);
    });

    it('should return null when max retries exceeded', () => {
      const retryAfter = retryService.calculateRetryAfter(maxRetries);
      expect(retryAfter).toBeNull();
    });

    it('should return null when retry count greater than max retries', () => {
      const retryAfter = retryService.calculateRetryAfter(maxRetries + 1);
      expect(retryAfter).toBeNull();
    });
  });

  describe('shouldRetry', () => {
    it('should return true for retry counts below max', () => {
      expect(retryService.shouldRetry(0)).toBe(true);
      expect(retryService.shouldRetry(1)).toBe(true);
      expect(retryService.shouldRetry(maxRetries - 1)).toBe(true);
    });

    it('should return false for retry count equal to max', () => {
      expect(retryService.shouldRetry(maxRetries)).toBe(false);
    });

    it('should return false for retry count greater than max', () => {
      expect(retryService.shouldRetry(maxRetries + 1)).toBe(false);
    });
  });

  describe('getDelayMs', () => {
    it('should return delay in milliseconds', () => {
      const testCases = [
        { retryCount: 0, expectedMs: 1 * 60 * 1000 }, // 1 minute
        { retryCount: 1, expectedMs: 2 * 60 * 1000 }, // 2 minutes
        { retryCount: 2, expectedMs: 4 * 60 * 1000 }, // 4 minutes
        { retryCount: 5, expectedMs: 32 * 60 * 1000 }, // 32 minutes
      ];

      testCases.forEach(({ retryCount, expectedMs }) => {
        expect(retryService.getDelayMs(retryCount)).toBe(expectedMs);
      });
    });

    it('should cap delay at 60 minutes', () => {
      const maxDelayMs = 60 * 60 * 1000;
      expect(retryService.getDelayMs(10)).toBe(maxDelayMs);
      expect(retryService.getDelayMs(20)).toBe(maxDelayMs);
    });
  });
});
