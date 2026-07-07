import { StepExecutorApplicationService } from '../../../src/application/StepExecutorApplicationService.js';
import { StepFactory } from '../../../src/domain/steps/StepFactory.js';
import { StepStatus } from '../../../src/domain/steps/IStep.js';
import { IRetryConfig } from '../../../src/config/AppConfig.js';
import { Job } from '../../../src/domain/job/Job.js';
import { JobState } from '../../../src/domain/job/JobState.js';
import { WorkflowType } from '../../../src/domain/workflows/WorkflowType.js';
import { ILLMService } from '../../../src/domain/llm/ILLMService.js';
import { IDocument } from '../../../src/domain/document/IDocument.js';
import { createFakeUoW, makeFakeUoWFactory } from '../helpers/fakeUoW.js';

const retryConfig: IRetryConfig = { getRetry: () => ({ maxRetries: 3, retryDelayInMs: 1000, retryExponent: 2 }) };

function makeFakeLLM(): jest.Mocked<ILLMService> {
  return { sendChatRequest: jest.fn(), checkHealth: jest.fn() };
}

function makeJob(state: JobState): Job {
  return new Job('job-1', 1, WorkflowType.AUTOMATED, state, [], ['title'], undefined, new Date(), new Date(), null);
}

function makeDocument(): IDocument {
  return { id: 1, content: 'body', title: 'Old title', tags: [], correspondent: null, documentType: null, createdDate: null, modifiedDate: null };
}

describe('StepExecutorApplicationService', () => {
  describe('processPendingSteps', () => {
    it('executes a claimed step for its job owner and advances the job on success', async () => {
      const fakeUoW = createFakeUoW({ username: 'alice' });
      const job = makeJob(JobState.LLM_PROCESSING);
      const step = new StepFactory().newUpdateDocumentStep(job.id);

      fakeUoW.repos.steps.getPendingExecutableSteps.mockResolvedValue([step]);
      fakeUoW.repos.permissions.getOwner.mockResolvedValue('alice');
      fakeUoW.repos.jobs.getById.mockResolvedValue(job);
      fakeUoW.repos.dms.getDocument.mockResolvedValue(makeDocument());

      const service = new StepExecutorApplicationService(makeFakeUoWFactory(fakeUoW), makeFakeLLM(), retryConfig);

      const result = await service.processPendingSteps(10);

      expect(result.processed).toBe(1);
      expect(result.items[0]).toMatchObject({ stepId: step.getStepId(), outcome: 'success' });
      expect(step.getStepStatus()).toBe(StepStatus.COMPLETED);
      expect(job.state).toBe(JobState.UPDATING_DOCUMENT); // advanced past LLM_PROCESSING
      expect(fakeUoW.repos.dms.updateDocument).toHaveBeenCalled();
    });

    it('skips a claimed step when no owner can be resolved for its job', async () => {
      const fakeUoW = createFakeUoW();
      const step = new StepFactory().newUpdateDocumentStep('job-1');
      fakeUoW.repos.steps.getPendingExecutableSteps.mockResolvedValue([step]);
      fakeUoW.repos.permissions.getOwner.mockResolvedValue(null);

      const service = new StepExecutorApplicationService(makeFakeUoWFactory(fakeUoW), makeFakeLLM(), retryConfig);

      const result = await service.processPendingSteps(10);

      expect(result.processed).toBe(0);
      expect(result.items[0].outcome).toBe('skipped');
    });

    it('records outcome "failed" when loading execution context itself throws (infra-level failure)', async () => {
      const fakeUoW = createFakeUoW({ username: 'alice' });
      const step = new StepFactory().newUpdateDocumentStep('job-1');

      fakeUoW.repos.steps.getPendingExecutableSteps.mockResolvedValue([step]);
      fakeUoW.repos.permissions.getOwner.mockResolvedValue('alice');
      fakeUoW.repos.jobs.getById.mockRejectedValue(new Error('DB connection lost'));

      const service = new StepExecutorApplicationService(makeFakeUoWFactory(fakeUoW), makeFakeLLM(), retryConfig);

      const result = await service.processPendingSteps(10);

      expect(result.processed).toBe(0);
      expect(result.items[0]).toMatchObject({ outcome: 'failed', errorMessage: expect.stringContaining('DB connection lost') });
      expect(step.getStepStatus()).toBe(StepStatus.RETRYING);
    });

    it('counts the run as "success" when only the step\'s own business logic fails (ExecutableStep.execute swallows it into a RETRYING result)', async () => {
      const fakeUoW = createFakeUoW({ username: 'alice' });
      const job = makeJob(JobState.LLM_PROCESSING);
      const step = new StepFactory().newUpdateDocumentStep(job.id);

      fakeUoW.repos.steps.getPendingExecutableSteps.mockResolvedValue([step]);
      fakeUoW.repos.permissions.getOwner.mockResolvedValue('alice');
      fakeUoW.repos.jobs.getById.mockResolvedValue(job);
      fakeUoW.repos.dms.getDocument.mockRejectedValue(new Error('Paperless unavailable'));

      const service = new StepExecutorApplicationService(makeFakeUoWFactory(fakeUoW), makeFakeLLM(), retryConfig);

      const result = await service.processPendingSteps(10);

      expect(result.processed).toBe(1);
      expect(result.items[0].outcome).toBe('success');
      expect(step.getStepStatus()).toBe(StepStatus.RETRYING);
      expect(job.state).toBe(JobState.LLM_PROCESSING); // unchanged: Transition.NONE while step retries
    });
  });

  describe('processRetryQueue', () => {
    it('moves due retries back to WAITING', async () => {
      const fakeUoW = createFakeUoW();
      const step = new StepFactory().newUpdateDocumentStep('job-1');
      step.markExecutionFailed(retryConfig.getRetry()); // -> RETRYING
      fakeUoW.repos.steps.getPendingRetries.mockResolvedValue([step]);
      const service = new StepExecutorApplicationService(makeFakeUoWFactory(fakeUoW), makeFakeLLM(), retryConfig);

      const result = await service.processRetryQueue(10);

      expect(result.retried).toBe(1);
      expect(step.getStepStatus()).toBe(StepStatus.WAITING);
      expect(fakeUoW.save).toHaveBeenCalled();
      expect(fakeUoW.commit).toHaveBeenCalled();
    });
  });
});
