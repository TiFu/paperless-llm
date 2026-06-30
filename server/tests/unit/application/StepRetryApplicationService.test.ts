import { StepRetryApplicationService } from '../../../src/application/StepRetryApplicationService.js';
import { StepFactory } from '../../../src/domain/steps/StepFactory.js';
import { StepStatus } from '../../../src/domain/steps/IStep.js';
import { ApprovalInteractionStep } from '../../../src/domain/steps/userinteraction/ManualStep.js';
import { createFakeUoW, makeFakeUoWFactory } from '../helpers/fakeUoW.js';

describe('StepRetryApplicationService', () => {
  it('resets an eligible ExecutableStep to WAITING and persists the change', async () => {
    const fakeUoW = createFakeUoW();
    const step = new StepFactory().newUpdateDocumentStep('job-1');
    step.markExecutionFailed({ maxRetries: 3, retryDelayInMs: 1000, retryExponent: 2 }); // -> RETRYING
    fakeUoW.repos.steps.getById.mockResolvedValue(step);
    const service = new StepRetryApplicationService(makeFakeUoWFactory(fakeUoW));

    await service.retryStep('step-1');

    expect(step.getStepStatus()).toBe(StepStatus.WAITING);
    expect(step.getRetryCount()).toBe(0);
    expect(fakeUoW.save).toHaveBeenCalled();
    expect(fakeUoW.commit).toHaveBeenCalled();
  });

  it('throws when the step does not exist', async () => {
    const fakeUoW = createFakeUoW();
    fakeUoW.repos.steps.getById.mockResolvedValue(undefined as never);
    const service = new StepRetryApplicationService(makeFakeUoWFactory(fakeUoW));

    await expect(service.retryStep('missing')).rejects.toThrow(/not found/);
  });

  it('throws when the step is a manual (non-automated) step', async () => {
    const fakeUoW = createFakeUoW();
    const manualStep = new ApprovalInteractionStep('s1', 'job-1', StepStatus.IN_FALLOUT);
    fakeUoW.repos.steps.getById.mockResolvedValue(manualStep);
    const service = new StepRetryApplicationService(makeFakeUoWFactory(fakeUoW));

    await expect(service.retryStep('s1')).rejects.toThrow(/not an automated step/);
  });

  it('throws when the step is not eligible for retry (e.g. still WAITING)', async () => {
    const fakeUoW = createFakeUoW();
    const step = new StepFactory().newUpdateDocumentStep('job-1'); // WAITING by default
    fakeUoW.repos.steps.getById.mockResolvedValue(step);
    const service = new StepRetryApplicationService(makeFakeUoWFactory(fakeUoW));

    await expect(service.retryStep('step-1')).rejects.toThrow(/not eligible for manual retry/);
  });
});
