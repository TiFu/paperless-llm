import { JobApplicationService } from '../../../src/application/JobApplicationService.js';
import { Job } from '../../../src/domain/job/Job.js';
import { JobState } from '../../../src/domain/job/JobState.js';
import { WorkflowType } from '../../../src/domain/workflows/WorkflowType.js';
import { ApiError } from '../../../src/api/middleware/errorHandler.js';
import { createFakeUoW, makeFakeUoWFactory } from '../helpers/fakeUoW.js';
import { IDocument } from '../../../src/domain/document/IDocument.js';

const user = { username: 'alice' };

function makeJob(id: string, documentId: number, state = JobState.PENDING): Job {
  return new Job(id, documentId, WorkflowType.AUTOMATED, state, [], ['title'], undefined, new Date(), new Date(), null);
}

function makeDocument(id: number): IDocument {
  return { id, content: '', title: `Doc ${id}`, tags: [], correspondent: null, documentType: null, createdDate: null, modifiedDate: null };
}

describe('JobApplicationService', () => {
  describe('getJobStats', () => {
    it('maps raw state counts onto the JobStats shape, defaulting missing states to 0', async () => {
      const fakeUoW = createFakeUoW(user);
      fakeUoW.repos.jobs.getJobCountsByState.mockResolvedValue({
        [JobState.PENDING]: 3,
        [JobState.COMPLETED]: 5,
      });
      const service = new JobApplicationService(makeFakeUoWFactory(fakeUoW));

      const stats = await service.getJobStats(user);

      expect(stats).toEqual({
        pending: 3,
        llmProcessing: 0,
        pendingApproval: 0,
        updatingDocument: 0,
        removingTags: 0,
        completed: 5,
        failed: 0,
        rejected: 0,
      });
      expect(fakeUoW.commit).toHaveBeenCalled();
    });
  });

  describe('createBulk', () => {
    it('starts the workflow for each created job, persists steps, grants permissions, and enriches with documents', async () => {
      const fakeUoW = createFakeUoW(user);
      const job1 = makeJob('job-1', 1);
      const job2 = makeJob('job-2', 2);
      fakeUoW.repos.jobs.createBulk.mockResolvedValue([job1, job2]);
      fakeUoW.repos.dms.getDocumentsByIds.mockResolvedValue([makeDocument(1), makeDocument(2)]);
      const service = new JobApplicationService(makeFakeUoWFactory(fakeUoW));

      const result = await service.createBulk(
        [
          { documentId: 1, jobType: WorkflowType.AUTOMATED, fields: ['title'] },
          { documentId: 2, jobType: WorkflowType.AUTOMATED, fields: ['title'] },
        ],
        user,
      );

      // Both jobs advanced out of PENDING by the (real) workflow orchestrator
      expect(job1.state).toBe(JobState.LLM_PROCESSING);
      expect(job2.state).toBe(JobState.LLM_PROCESSING);
      expect(fakeUoW.repos.steps.create).toHaveBeenCalledTimes(2);
      expect(fakeUoW.repos.permissions.grant).toHaveBeenCalledWith('job', 'job-1', user.username);
      expect(fakeUoW.repos.permissions.grant).toHaveBeenCalledWith('job', 'job-2', user.username);
      expect(fakeUoW.save).toHaveBeenCalled();
      expect(fakeUoW.commit).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].document).toEqual(makeDocument(1));
    });

    it('returns an empty array without touching the UoW when given no jobs', async () => {
      const fakeUoW = createFakeUoW(user);
      const service = new JobApplicationService(makeFakeUoWFactory(fakeUoW));

      const result = await service.createBulk([], user);

      expect(result).toEqual([]);
      expect(fakeUoW.start).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('throws a 403 ApiError when the user lacks permission', async () => {
      const fakeUoW = createFakeUoW(user);
      fakeUoW.repos.permissions.hasPermission.mockResolvedValue(false);
      const service = new JobApplicationService(makeFakeUoWFactory(fakeUoW));

      await expect(service.getById('job-1', user)).rejects.toMatchObject({ status: 403 } as Partial<ApiError>);
    });

    it('returns the job enriched with its document when permitted', async () => {
      const fakeUoW = createFakeUoW(user);
      const job = makeJob('job-1', 1, JobState.COMPLETED);
      fakeUoW.repos.permissions.hasPermission.mockResolvedValue(true);
      fakeUoW.repos.jobs.getById.mockResolvedValue(job);
      fakeUoW.repos.dms.getDocumentsByIds.mockResolvedValue([makeDocument(1)]);
      const service = new JobApplicationService(makeFakeUoWFactory(fakeUoW));

      const result = await service.getById('job-1', user);

      expect(result?.document).toEqual(makeDocument(1));
    });
  });

  describe('list', () => {
    it('passes cursor/state through to the repository and returns the next cursor', async () => {
      const fakeUoW = createFakeUoW(user);
      const job = makeJob('job-1', 1);
      fakeUoW.repos.jobs.listForUser.mockResolvedValue({ items: [job], nextCursor: 'job-1' });
      fakeUoW.repos.dms.getDocumentsByIds.mockResolvedValue([makeDocument(1)]);
      const service = new JobApplicationService(makeFakeUoWFactory(fakeUoW));

      const result = await service.list(10, user, 'cursor-x', JobState.PENDING);

      expect(fakeUoW.repos.jobs.listForUser).toHaveBeenCalledWith(10, 'cursor-x', JobState.PENDING);
      expect(result.nextCursor).toBe('job-1');
      expect(result.items).toHaveLength(1);
    });
  });
});
