import { CompositeStep } from '../../../../src/domain/steps/automated/CompositeStep.js';
import { StepStatus, StepType, RetryConfig } from '../../../../src/domain/steps/IStep.js';

// IStep is abstract; CompositeStep is the simplest concrete subclass that
// doesn't override any of the retry/lifecycle methods defined on IStep, so it
// doubles as a test double for the base class's behavior.
function makeStep(status: StepStatus, retryCount = 0): CompositeStep {
  return new CompositeStep('step-1', StepType.LLM_GENERATE_FIELDS, 'job-1', status, retryCount, []);
}

const retryConfig: RetryConfig = {
  maxRetries: 3,
  retryDelayInMs: 1000,
  retryExponent: 2,
};

describe('IStep retry/lifecycle behavior', () => {
  describe('markExecutionFailed', () => {
    it('increments retry count and moves to RETRYING with a backoff timer when under maxRetries', () => {
      const step = makeStep(StepStatus.IN_PROGRESS, 0);
      const before = Date.now();

      step.markExecutionFailed(retryConfig);

      expect(step.getRetryCount()).toBe(1);
      expect(step.getStepStatus()).toBe(StepStatus.RETRYING);
      const retryAfter = step.getRetryAfter();
      expect(retryAfter).not.toBeNull();
      // delayInMs * retryExponent^retryCount = 1000 * 2^1 = 2000
      expect(retryAfter!.getTime() - before).toBeGreaterThanOrEqual(2000);
    });

    it('moves to IN_FALLOUT once retryCount reaches maxRetries', () => {
      const step = makeStep(StepStatus.IN_PROGRESS, retryConfig.maxRetries - 1);

      step.markExecutionFailed(retryConfig);

      expect(step.getRetryCount()).toBe(retryConfig.maxRetries);
      expect(step.getStepStatus()).toBe(StepStatus.IN_FALLOUT);
      expect(step.getRetryAfter()).toBeNull();
    });
  });

  describe('resetForManualRetry', () => {
    it('resets retry count, clears the retry timer, and moves to WAITING', () => {
      const step = makeStep(StepStatus.IN_FALLOUT, 5);

      step.resetForManualRetry();

      expect(step.getRetryCount()).toBe(0);
      expect(step.getStepStatus()).toBe(StepStatus.WAITING);
      expect(step.getRetryAfter()).toBeNull();
    });
  });

  describe('isEligibleForRetry', () => {
    it.each([StepStatus.RETRYING, StepStatus.IN_FALLOUT])('is true when status is %s', (status) => {
      expect(makeStep(status).isEligibleForRetry()).toBe(true);
    });

    it.each([StepStatus.WAITING, StepStatus.IN_PROGRESS, StepStatus.COMPLETED, StepStatus.FAILED])(
      'is false when status is %s',
      (status) => {
        expect(makeStep(status).isEligibleForRetry()).toBe(false);
      },
    );
  });
});
