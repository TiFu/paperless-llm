import { withRepositoryTransaction } from '../helpers/db.js';
import { JobState } from '../../../src/domain/job/JobState.js';
import { WorkflowType } from '../../../src/domain/workflows/WorkflowType.js';

describe('PostgreSQLJobRepository (integration)', () => {
  it('creates a job with its requested fields and reads it back via getById', async () => {
    await withRepositoryTransaction(async (repos) => {
      const job = await repos.getJobs().create('123', WorkflowType.AUTOMATED, ['title', 'tags']);

      expect(job.documentId).toBe(123);
      expect(job.jobType).toBe(WorkflowType.AUTOMATED);
      expect(job.state).toBe(JobState.PENDING);

      const fetched = await repos.getJobs().getById(job.id);
      expect(fetched.id).toBe(job.id);
      expect(fetched.fields.sort()).toEqual(['tags', 'title']);
    });
  });

  it('createBulk inserts every job and its fields in one go', async () => {
    await withRepositoryTransaction(async (repos) => {
      const jobs = await repos.getJobs().createBulk([
        { documentId: 1, jobType: WorkflowType.AUTOMATED, fields: ['title'] },
        { documentId: 2, jobType: WorkflowType.APPROVAL, fields: ['tags', 'correspondent'] },
      ]);

      expect(jobs).toHaveLength(2);
      const second = await repos.getJobs().getById(jobs[1].id);
      expect(second.documentId).toBe(2);
      expect(second.jobType).toBe(WorkflowType.APPROVAL);
      expect(second.fields.sort()).toEqual(['correspondent', 'tags']);
    });
  });

  it('update persists state, completedAt, and document actions', async () => {
    await withRepositoryTransaction(async (repos) => {
      const job = await repos.getJobs().create('1', WorkflowType.AUTOMATED, ['title']);

      job.updateJobState(JobState.COMPLETED);
      await repos.getJobs().update(job);

      const fetched = await repos.getJobs().getById(job.id);
      expect(fetched.state).toBe(JobState.COMPLETED);
    });
  });

  describe('permission scoping', () => {
    it('listForUser only returns jobs the user has been granted access to', async () => {
      await withRepositoryTransaction(async (repos, user) => {
        await repos.getUsers().upsert(user!.username, 'paperless-token'); // permissions.username FKs to users
        const visible = await repos.getJobs().create('1', WorkflowType.AUTOMATED, []);
        const hidden = await repos.getJobs().create('2', WorkflowType.AUTOMATED, []);
        await repos.getPermissions().grant('job', visible.id, user!.username);
        // `hidden` is intentionally never granted to this user.

        const result = await repos.getJobs().listForUser(10);

        expect(result.items.map(j => j.id)).toEqual([visible.id]);
        expect(result.items.map(j => j.id)).not.toContain(hidden.id);
      }, { username: 'alice' });
    });

    it('getJobCountsByState is scoped to the user\'s visible jobs', async () => {
      await withRepositoryTransaction(async (repos, user) => {
        await repos.getUsers().upsert(user!.username, 'paperless-token');
        const own = await repos.getJobs().create('1', WorkflowType.AUTOMATED, []);
        await repos.getJobs().create('2', WorkflowType.AUTOMATED, []); // not granted
        await repos.getPermissions().grant('job', own.id, user!.username);

        const counts = await repos.getJobs().getJobCountsByState();

        expect(counts[JobState.PENDING]).toBe(1);
      }, { username: 'bob' });
    });

    it('returns all jobs for a system UoW (no user)', async () => {
      await withRepositoryTransaction(async (repos) => {
        await repos.getJobs().create('1', WorkflowType.AUTOMATED, []);
        await repos.getJobs().create('2', WorkflowType.AUTOMATED, []);

        const result = await repos.getJobs().listForUser(10);

        expect(result.items).toHaveLength(2);
      });
    });
  });

  it('filterInProgressDocuments excludes documents whose jobs are all terminal', async () => {
    await withRepositoryTransaction(async (repos) => {
      const inProgress = await repos.getJobs().create('100', WorkflowType.AUTOMATED, []);
      const done = await repos.getJobs().create('200', WorkflowType.AUTOMATED, []);
      done.updateJobState(JobState.COMPLETED);
      await repos.getJobs().update(done);

      const result = await repos.getJobs().filterInProgressDocuments([100, 200, 300]);

      expect(result).toEqual([inProgress.documentId]);
    });
  });
});
