import { StepCancelApplicationService } from '../../../src/application/StepCancelApplicationService.js';
import { StepFactory } from '../../../src/domain/steps/StepFactory.js';
import { StepStatus } from '../../../src/domain/steps/IStep.js';
import { Job } from '../../../src/domain/job/Job.js';
import { JobState } from '../../../src/domain/job/JobState.js';
import { WorkflowType } from '../../../src/domain/workflows/WorkflowType.js';
import { ApprovalInteractionStep } from '../../../src/domain/steps/userinteraction/ManualStep.js';
import { createFakeUoW, makeFakeUoWFactory } from '../helpers/fakeUoW.js';

function makeJob(state: JobState): Job {
  return new Job('job-1', 1, WorkflowType.AUTOMATED, state, [], ['title'], undefined, new Date(), new Date(), null);
}

describe('StepCancelApplicationService', () => {
  it('moves an eligible step to FAILED and fails its job', async () => {
    const fakeUoW = createFakeUoW();
    const job = makeJob(JobState.LLM_PROCESSING);
    const step = new StepFactory().newUpdateDocumentStep(job.id);
    step.markExecutionFailed({ maxRetries: 3, retryDelayInMs: 1000, retryExponent: 2 }); // -> RETRYING
    fakeUoW.repos.steps.getById.mockResolvedValue(step);
    fakeUoW.repos.jobs.getById.mockResolvedValue(job);
    const service = new StepCancelApplicationService(makeFakeUoWFactory(fakeUoW));

    await service.cancelStep('step-1');

    expect(step.getStepStatus()).toBe(StepStatus.FAILED);
    expect(job.state).toBe(JobState.FAILED);
    expect(fakeUoW.save).toHaveBeenCalled();
    expect(fakeUoW.commit).toHaveBeenCalled();
  });

  it('throws when the step does not exist', async () => {
    const fakeUoW = createFakeUoW();
    fakeUoW.repos.steps.getById.mockResolvedValue(undefined as never);
    const service = new StepCancelApplicationService(makeFakeUoWFactory(fakeUoW));

    await expect(service.cancelStep('missing')).rejects.toThrow(/not found/);
  });

  it('throws when the step is a manual (non-automated) step', async () => {
    const fakeUoW = createFakeUoW();
    const manualStep = new ApprovalInteractionStep('s1', 'job-1', StepStatus.IN_FALLOUT);
    fakeUoW.repos.steps.getById.mockResolvedValue(manualStep);
    const service = new StepCancelApplicationService(makeFakeUoWFactory(fakeUoW));

    await expect(service.cancelStep('s1')).rejects.toThrow(/not an automated step/);
  });

  it('throws when the step is not eligible for cancellation', async () => {
    const fakeUoW = createFakeUoW();
    const step = new StepFactory().newUpdateDocumentStep('job-1'); // WAITING by default
    fakeUoW.repos.steps.getById.mockResolvedValue(step);
    const service = new StepCancelApplicationService(makeFakeUoWFactory(fakeUoW));

    await expect(service.cancelStep('step-1')).rejects.toThrow(/not eligible for cancellation/);
  });
});
