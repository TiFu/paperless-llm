import { ManualStepApplicationService } from '../../../src/application/ApprovalApplicationService.js';
import { ApprovalInteractionStep } from '../../../src/domain/steps/userinteraction/ManualStep.js';
import { StepStatus } from '../../../src/domain/steps/IStep.js';
import { Job } from '../../../src/domain/job/Job.js';
import { JobState } from '../../../src/domain/job/JobState.js';
import { WorkflowType } from '../../../src/domain/workflows/WorkflowType.js';
import { createFakeUoW, makeFakeUoWFactory } from '../helpers/fakeUoW.js';
import { IDocument } from '../../../src/domain/document/IDocument.js';

const user = { username: 'alice' };
const paperlessBaseUrl = 'https://paperless.example.com';

function makeJob(state: JobState): Job {
  return new Job('job-1', 1, WorkflowType.APPROVAL, state, [], ['title'], undefined, new Date(), new Date(), null);
}

function makeDocument(): IDocument {
  return { id: 1, content: '', title: 'Doc', tags: [], correspondent: null, documentType: null, createdDate: null, modifiedDate: null };
}

describe('ManualStepApplicationService', () => {
  describe('getApprovalStats', () => {
    it('returns the pending count from the steps repository', async () => {
      const fakeUoW = createFakeUoW(user);
      fakeUoW.repos.steps.countPendingUserInteractionSteps.mockResolvedValue(7);
      const service = new ManualStepApplicationService(makeFakeUoWFactory(fakeUoW), paperlessBaseUrl);

      const stats = await service.getApprovalStats(user);

      expect(stats).toEqual({ pendingCount: 7 });
    });
  });

  describe('listPendingApprovals', () => {
    it('joins pending manual steps with their jobs and enriches with documents', async () => {
      const fakeUoW = createFakeUoW(user);
      const job = makeJob(JobState.PENDING_APPROVAL);
      const step = new ApprovalInteractionStep('step-1', job.id, StepStatus.WAITING);
      fakeUoW.repos.steps.getPendingManualSteps.mockResolvedValue([step]);
      fakeUoW.repos.jobs.getById.mockResolvedValue(job);
      fakeUoW.repos.dms.getDocumentsByIds.mockResolvedValue([makeDocument()]);
      const service = new ManualStepApplicationService(makeFakeUoWFactory(fakeUoW), paperlessBaseUrl);

      const result = await service.listPendingApprovals(user, 50);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        stepId: 'step-1',
        jobId: 'job-1',
        documentId: 1,
        paperlessUrl: `${paperlessBaseUrl}/documents/1`,
        possibleDecisions: ['APPROVED', 'REJECTED'],
      });
      expect(result.items[0].document).toEqual(makeDocument());
      expect(result.nextCursor).not.toBeNull();
    });

    it('skips steps whose job is missing rather than throwing', async () => {
      const fakeUoW = createFakeUoW(user);
      const step = new ApprovalInteractionStep('step-1', 'job-1', StepStatus.WAITING);
      fakeUoW.repos.steps.getPendingManualSteps.mockResolvedValue([step]);
      fakeUoW.repos.jobs.getById.mockResolvedValue(null as never);
      fakeUoW.repos.dms.getDocumentsByIds.mockResolvedValue([]);
      const service = new ManualStepApplicationService(makeFakeUoWFactory(fakeUoW), paperlessBaseUrl);

      const result = await service.listPendingApprovals(user, 50);

      expect(result.items).toEqual([]);
      expect(result.nextCursor).toBeNull();
    });
  });

  describe('processApprovalDecision', () => {
    it('approves the step, advances the job, and persists the new step (if any)', async () => {
      const fakeUoW = createFakeUoW(user);
      const job = makeJob(JobState.PENDING_APPROVAL);
      const step = new ApprovalInteractionStep('step-1', job.id, StepStatus.WAITING);
      fakeUoW.repos.steps.getById.mockResolvedValue(step);
      fakeUoW.repos.jobs.getById.mockResolvedValue(job);
      fakeUoW.repos.permissions.hasPermission.mockResolvedValue(true);
      const service = new ManualStepApplicationService(makeFakeUoWFactory(fakeUoW), paperlessBaseUrl);

      await service.processApprovalDecision('step-1', 'APPROVED', user);

      expect(step.getStepStatus()).toBe(StepStatus.COMPLETED);
      expect(job.state).toBe(JobState.UPDATING_DOCUMENT);
      expect(fakeUoW.repos.steps.create).toHaveBeenCalled(); // next step persisted
      expect(fakeUoW.save).toHaveBeenCalled();
      expect(fakeUoW.commit).toHaveBeenCalled();
    });

    it('throws Forbidden when the user lacks write permission on the job', async () => {
      const fakeUoW = createFakeUoW(user);
      const job = makeJob(JobState.PENDING_APPROVAL);
      const step = new ApprovalInteractionStep('step-1', job.id, StepStatus.WAITING);
      fakeUoW.repos.steps.getById.mockResolvedValue(step);
      fakeUoW.repos.jobs.getById.mockResolvedValue(job);
      fakeUoW.repos.permissions.hasPermission.mockResolvedValue(false);
      const service = new ManualStepApplicationService(makeFakeUoWFactory(fakeUoW), paperlessBaseUrl);

      await expect(service.processApprovalDecision('step-1', 'APPROVED', user)).rejects.toThrow(/Forbidden/);
    });
  });
});
